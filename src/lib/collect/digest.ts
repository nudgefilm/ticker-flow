import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { resend, FROM } from "@/lib/email/resend";
import { dailyDigestEmail } from "@/lib/email/templates";
import type { DigestData, Top30Item, NewEntrantItem, MarketStats } from "@/lib/email/templates";

// ─── reason_tag → 사람이 읽는 설명 ────────────────────────────────────────────

const TAG_TO_DESC: Record<string, string> = {
  buyback:           "자사주 매입 발표",
  ma:                "M&A 공시 확인",
  ceo_change:        "CEO 변경 공시 확인",
  cfo_change:        "CFO 변경 공시 확인",
  guidance:          "가이던스 변경 공시 확인",
  contract:          "대규모 계약 발표",
  insider_buy:       "내부자 매수 확인",
  insider_buy_large: "내부자 대규모 매수 확인",
  "13f_new":         "기관 신규 편입 확인",
  "13f_increase":    "기관 보유 증가 확인",
  eps_beat:          "EPS 예상치 상회",
  revenue_beat:      "매출 예상치 상회",
  both_beat:         "EPS·매출 예상치 상회",
  guidance_up:       "가이던스 상향 발표",
  price_up_20:       "최근 30일 주가 20% 이상 상승",
  price_up_10:       "최근 30일 주가 10% 이상 상승",
  volume_spike:      "최근 거래량 급증",
  volatility_spike:  "최근 변동성 급증",
  short_decrease:    "공매도 감소 확인",
  target_up:         "목표가 상향 발표",
};

// ─── 내부 타입 ────────────────────────────────────────────────────────────────

type Top30Row = {
  ticker: string;
  rank: number | null;
  reason_tags: string[] | null;
  metadata: { filingCount?: number } | null;
};

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function tagsToDescs(tags: string[] | null, limit: number): string[] {
  if (!tags || tags.length === 0) return ["최근 시장 변화 확인"];
  const descs = tags.slice(0, limit).map((t) => TAG_TO_DESC[t] ?? t).filter(Boolean);
  return descs.length > 0 ? descs : ["최근 시장 변화 확인"];
}

function countTag(tagCounts: Record<string, number>, ...keys: string[]): number {
  return keys.reduce((s, k) => s + (tagCounts[k] ?? 0), 0);
}

// ─── Claude Haiku 시장 요약 생성 ──────────────────────────────────────────────

async function generateMarketSummary(
  top10: Top30Row[],
  nameMap: Map<string, string>,
  stats: MarketStats
): Promise<string> {
  const fallback = stats.interpretation;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;

  const allTags = top10.flatMap((r) => r.reason_tags ?? []);
  const tagCounts: Record<string, number> = {};
  for (const t of allTags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;

  const factParts: string[] = [];
  if (stats.institutionalCount > 0) factParts.push(`기관 신규 편입 ${stats.institutionalCount}건`);
  if (stats.insiderBuyCount > 0) factParts.push(`내부자 매수 ${stats.insiderBuyCount}건`);
  if (stats.epsBeatCount > 0) factParts.push(`EPS 예상치 상회 ${stats.epsBeatCount}건`);
  if (stats.filingCount > 0) factParts.push(`관련 공시 ${stats.filingCount}건`);

  const name1 = nameMap.get(top10[0]?.ticker ?? "") ?? top10[0]?.ticker ?? "";
  const factsStr = factParts.length > 0 ? factParts.join(", ") : "다양한 기업 변화";

  const prompt = `오늘 미국 나스닥 주요 기업 동향 현황: ${factsStr}. TOP10 1위: ${name1}.
이를 바탕으로 오늘 시장의 주요 흐름을 2~3문장으로 요약하라.
규칙:
- 투자 권유, 매수, 매도, 추천 표현 금지
- 사실 기반 서술만 사용 (예: "~가 집중됐습니다", "~가 두드러졌습니다")
- 점수, 가중치, 알고리즘 언급 금지
- 기관명 비노출
- plain text로만, 마크다운 기호 금지
- 한국어로만 작성`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return fallback;
    const json = await res.json() as { content?: { text?: string }[] };
    const text = json?.content?.[0]?.text?.trim();
    return text && text.length > 0 ? text : fallback;
  } catch {
    return fallback;
  }
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export async function runDigestCollect(): Promise<CollectResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 1. Pro 유저 이메일 조회
  const { data: profiles, error: profileErr } = await admin
    .from("profiles")
    .select("email")
    .eq("plan", "pro");

  if (profileErr) return { ok: false, error: (profileErr as { message: string }).message };

  const proEmails = ((profiles ?? []) as { email: string | null }[])
    .map((p) => p.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);

  if (proEmails.length === 0) return { ok: true, sent: 0, message: "Pro 유저 없음" };

  // 2. 가장 최근 top30_daily 날짜 조회
  const { data: latestRow } = await admin
    .from("top30_daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { date: string } | null };

  if (!latestRow?.date) {
    return { ok: true, sent: 0, message: "TOP30 데이터 없음" };
  }

  const latestDate = latestRow.date;
  const prevDateObj = new Date(latestDate + "T00:00:00Z");
  prevDateObj.setDate(prevDateObj.getDate() - 1);
  const prevDate = prevDateObj.toISOString().slice(0, 10);

  // 3. 최신 TOP30 조회
  const { data: todayRows } = await admin
    .from("top30_daily")
    .select("ticker, rank, reason_tags, metadata")
    .eq("date", latestDate)
    .order("rank", { ascending: true })
    .limit(30) as { data: Top30Row[] | null };

  // 4. 전일 TOP30 조회 (비교용)
  const { data: prevRows } = await admin
    .from("top30_daily")
    .select("ticker")
    .eq("date", prevDate)
    .order("rank", { ascending: true })
    .limit(30) as { data: { ticker: string }[] | null };

  const today30 = todayRows ?? [];
  const prev30  = prevRows  ?? [];

  if (today30.length === 0) {
    return { ok: true, sent: 0, message: `TOP30 데이터 없음 (${latestDate})` };
  }

  // 5. 티커 이름 조회
  const allTickers = [...new Set([...today30.map((r) => r.ticker), ...prev30.map((r) => r.ticker)])];
  const nameMap = new Map<string, string>();

  if (allTickers.length > 0) {
    const { data: tickerRows } = await admin
      .from("tickers")
      .select("ticker, name_kr, name_en")
      .in("ticker", allTickers) as {
        data: { ticker: string; name_kr: string | null; name_en: string | null }[] | null;
      };
    for (const t of tickerRows ?? []) {
      nameMap.set(t.ticker, t.name_kr ?? t.name_en ?? t.ticker);
    }
  }

  // 6. 신규 진입 / 빠진 기업 계산
  const todaySet  = new Set(today30.map((r) => r.ticker));
  const prevSet   = new Set(prev30.map((r) => r.ticker));
  const newEntrantRows = today30.filter((r) => !prevSet.has(r.ticker));
  const droppedTickers = prev30.filter((r) => !todaySet.has(r.ticker)).map((r) => r.ticker);

  // 7. 시장 통계 집계 (TOP10 기준)
  const top10 = today30.slice(0, 10);
  const allTags: string[] = top10.flatMap((r) => r.reason_tags ?? []);
  const tagCounts: Record<string, number> = {};
  for (const t of allTags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;

  const filingCount       = top10.reduce((s, r) => s + (r.metadata?.filingCount ?? 0), 0);
  const institutionalCount = countTag(tagCounts, "13f_new", "13f_increase");
  const insiderBuyCount    = countTag(tagCounts, "insider_buy", "insider_buy_large");
  const epsBeatCount       = countTag(tagCounts, "eps_beat", "both_beat", "revenue_beat");

  const maxSig = Math.max(institutionalCount, insiderBuyCount, epsBeatCount);
  let interpretation: string;
  if (maxSig === 0) {
    interpretation = "오늘은 다양한 기업 변화가 고르게 관측되었습니다.";
  } else if (institutionalCount === maxSig) {
    interpretation = "오늘은 기관 수급 변화가 두드러졌습니다.";
  } else if (insiderBuyCount === maxSig) {
    interpretation = "오늘은 내부자 매수가 두드러졌습니다.";
  } else {
    interpretation = "오늘은 실적 발표 이후 변화가 두드러졌습니다.";
  }

  const marketStats: MarketStats = {
    filingCount,
    epsBeatCount,
    institutionalCount,
    insiderBuyCount,
    interpretation,
  };

  // 8. Haiku 시장 요약
  const marketSummary = await generateMarketSummary(top10, nameMap, marketStats);

  // 9. DigestData 구성
  const kstDate = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year:     "numeric",
    month:    "long",
    day:      "numeric",
  }).format(new Date());

  const top10Items: Top30Item[] = top10.map((r) => ({
    ticker:       r.ticker,
    name:         nameMap.get(r.ticker) ?? r.ticker,
    descriptions: tagsToDescs(r.reason_tags, 2),
  }));

  const top3Items: Top30Item[] = today30.slice(0, 3).map((r) => ({
    ticker:       r.ticker,
    name:         nameMap.get(r.ticker) ?? r.ticker,
    descriptions: tagsToDescs(r.reason_tags, 3),
  }));

  const newEntrants: NewEntrantItem[] = newEntrantRows.slice(0, 5).map((r) => ({
    ticker:      r.ticker,
    name:        nameMap.get(r.ticker) ?? r.ticker,
    description: tagsToDescs(r.reason_tags, 1)[0],
  }));

  const dropped = droppedTickers.slice(0, 5).map((t) => ({
    ticker: t,
    name:   nameMap.get(t) ?? t,
  }));

  const digestData: DigestData = {
    kstDate,
    top10:         top10Items,
    top3:          top3Items,
    marketStats,
    marketSummary,
    newEntrants,
    dropped,
  };

  // 10. HTML 생성 및 발송
  const html    = dailyDigestEmail(digestData);
  const subject = "오늘의 기업동향 TOP10 | TickerFlow";
  let sent   = 0;
  let errors = 0;

  for (const email of proEmails) {
    const { error } = await resend.emails.send({ from: FROM, to: email, subject, html });
    if (error) errors++;
    else sent++;
  }

  return { ok: true, sent, errors, total: proEmails.length };
}
