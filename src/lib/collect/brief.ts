/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// CLAUDE.md 6항 금지 표현
const FORBIDDEN_PHRASES = [
  "매수 추천", "매도 추천", "추천 종목", "유망 종목", "투자 기회",
  "강력 추천", "상승 예상", "하락 예상", "주가 전망", "목표주가",
  "적정주가", "강세 예상", "약세 예상", "수익률 보장", "초과 수익",
  "높은 수익 기대", "Strong Buy", "Strong Sell", "적극 매수", "적극 매도",
  "투자 점수", "투자 매력도", "추천 점수", "매수 신호", "호재", "악재",
  "긴급 매수",
];

const EVENT_LABELS: Record<string, string> = {
  ceo_change: "CEO 교체 공시",
  cfo_change: "CFO 교체 공시",
  buyback: "자사주 매입 공시",
  contract: "대규모 계약 공시",
  dividend: "배당 공시",
  guidance: "가이던스 변경 공시",
  ma: "M&A 공시",
  lawsuit: "소송 관련 공시",
  restructuring: "구조조정 공시",
  insider_trade: "내부자 거래 공시",
};

const FORM_LABELS: Record<string, string> = {
  "8-K": "주요 경영 이벤트 공시",
  "10-K": "연간 보고서 제출",
  "10-Q": "분기 보고서 제출",
  "4": "내부자 거래 공시",
  "S-1": "상장 신청서 제출",
  "DEF 14A": "주주총회 위임장 제출",
  "DEF14A": "주주총회 위임장 제출",
};

async function callHaiku(prompt: string, maxTokens = 512): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.content?.[0]?.text as string | undefined) ?? null;
  } catch {
    return null;
  }
}

function filterForbidden(text: string): string {
  let result = text;
  for (const phrase of FORBIDDEN_PHRASES) {
    result = result.replaceAll(phrase, "");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

/**
 * 어떤 Pro 유저의 와치리스트에 해당 ticker가 있으면 true 반환.
 */
export async function isTickerInProWatchlist(ticker: string): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data: proProfiles } = await adminClient
    .from("profiles")
    .select("id")
    .eq("plan", "pro");

  if (!proProfiles?.length) return false;
  const proIds = proProfiles.map((p) => p.id);

  const { count } = await adminClient
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .in("user_id", proIds)
    .eq("ticker", ticker);

  return (count ?? 0) > 0;
}

/**
 * 특정 ticker의 BRIEF를 생성하여 stock_briefs 테이블에 upsert.
 * 대상: Pro 유저 와치리스트 등록 순서 기준 상위 30개 이내 종목만.
 */
export async function runStockBriefCollect(
  ticker: string,
  triggerReason: "filing" | "news" | "insider" | "earnings" = "filing"
): Promise<CollectResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not set", retryable: false };
  }

  const adminClient = createAdminClient();

  // 1. Pro 와치리스트 포함 여부 확인
  const isEligible = await isTickerInProWatchlist(ticker);
  if (!isEligible) {
    return { ok: true, skipped: 1, generated: 0 };
  }

  // 2. 최근 7일 데이터 수집
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const now = new Date().toISOString();
  const since7dDate = since7d.slice(0, 10);

  const [filingsRes, newsRes, insiderRes, earningsRes, tickerRes] = await Promise.all([
    adminClient
      .from("filings")
      .select("form_type, filed_at, event_type")
      .eq("ticker", ticker)
      .gte("filed_at", since7d)
      .order("filed_at", { ascending: false })
      .limit(5),
    adminClient
      .from("news")
      .select("summary_kr, published_at")
      .eq("ticker", ticker)
      .gte("published_at", since7d)
      .not("summary_kr", "is", null)
      .order("published_at", { ascending: false })
      .limit(5),
    adminClient
      .from("insider_trades")
      .select("transaction_type, value")
      .eq("ticker", ticker)
      .gte("transaction_date", since7dDate)
      .order("transaction_date", { ascending: false })
      .limit(20),
    (adminClient as any)
      .from("earnings_calls")
      .select("fiscal_quarter, fiscal_year, guidance_direction, headline_summary, call_date")
      .eq("ticker", ticker)
      .order("call_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from("tickers")
      .select("name_kr, name_en")
      .eq("ticker", ticker)
      .maybeSingle(),
  ]);

  const filings = filingsRes.data ?? [];
  const newsItems = newsRes.data ?? [];
  const insiderTrades = insiderRes.data ?? [];
  const latestEarnings = earningsRes.data ?? null;
  const companyInfo = tickerRes.data;
  const companyName = companyInfo?.name_kr ?? companyInfo?.name_en ?? ticker;

  const hasData =
    filings.length > 0 ||
    newsItems.length > 0 ||
    insiderTrades.length > 0 ||
    latestEarnings !== null;

  if (!hasData) {
    return { ok: true, skipped: 1, generated: 0 };
  }

  // 3. 프롬프트 입력 구성
  const parts: string[] = [];

  if (filings.length > 0) {
    parts.push("【공시】");
    for (const f of filings) {
      const date = (f.filed_at as string).slice(0, 10);
      const label =
        (f.event_type ? EVENT_LABELS[f.event_type as string] : null) ??
        FORM_LABELS[f.form_type] ??
        f.form_type;
      parts.push(`- ${date}: ${label}`);
    }
  }

  if (newsItems.length > 0) {
    parts.push("【뉴스】");
    for (const n of newsItems) {
      const date = (n.published_at as string).slice(0, 10);
      parts.push(`- ${date}: ${n.summary_kr}`);
    }
  }

  if (insiderTrades.length > 0) {
    const buys = insiderTrades.filter((t) => t.transaction_type === "buy");
    const sells = insiderTrades.filter((t) => t.transaction_type === "sell");
    parts.push("【내부자 거래】");
    if (buys.length > 0) {
      const total = buys.reduce((s, t) => s + ((t.value as number | null) ?? 0), 0);
      const totalM = (total / 1_000_000).toFixed(1);
      parts.push(`- 취득: ${buys.length}건, 총 $${totalM}M`);
    }
    if (sells.length > 0) {
      const total = sells.reduce((s, t) => s + ((t.value as number | null) ?? 0), 0);
      const totalM = (total / 1_000_000).toFixed(1);
      parts.push(`- 처분: ${sells.length}건, 총 $${totalM}M`);
    }
  }

  if (latestEarnings) {
    const le = latestEarnings as any;
    const quarter = `Q${le.fiscal_quarter} FY${le.fiscal_year}`;
    const guidanceLabel =
      le.guidance_direction === "up"
        ? "가이던스 상향"
        : le.guidance_direction === "down"
          ? "가이던스 하향"
          : "가이던스 유지";
    parts.push("【최근 실적】");
    parts.push(`- ${quarter}: ${guidanceLabel}`);
    if (le.headline_summary) {
      parts.push(`- ${String(le.headline_summary).slice(0, 120)}`);
    }
  }

  const inputData = parts.join("\n");

  // 4. Claude Haiku 호출 — 사실 나열형 종합, 투자 표현 배제
  const prompt = `다음은 ${ticker}(${companyName})의 최근 7일간 주요 정보입니다.
이 내용을 200~300자 내외의 한국어 한 문단으로 사실 나열형으로 종합해 주세요.

작성 원칙:
- 공시·뉴스·거래·실적에 명시된 사실만 서술합니다.
- 분석·의견·전망·투자 관련 표현(매수/매도 추천, 상승/하락 예상 등)은 절대 포함하지 않습니다.
- "~했습니다", "~확인되었습니다" 형태의 사실 서술체로만 작성합니다.
- plain text로만 응답합니다. 마크다운 기호(#, **, - 등) 사용 금지.

입력 정보:
${inputData}

한국어 종합:`;

  const raw = await callHaiku(prompt, 512);
  if (!raw) {
    return { ok: false, error: "Haiku API 호출 실패", retryable: true };
  }

  const content = filterForbidden(raw.trim());

  // 5. stock_briefs upsert (ticker UNIQUE — 동일 종목 중복 생성 없음)
  const { error } = await adminClient.from("stock_briefs").upsert(
    {
      ticker,
      content,
      source_period_start: since7d,
      source_period_end: now,
      generated_at: now,
      trigger_reason: triggerReason,
    },
    { onConflict: "ticker" }
  );

  if (error) {
    return { ok: false, error: error.message, retryable: true };
  }

  return { ok: true, skipped: 0, generated: 1 };
}
