import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { resend } from "@/lib/email/resend";
import { dailyDigestEmail } from "@/lib/email/templates";
import type {
  DigestData,
  DigestTopItem,
  Top30TagItem,
  FeaturedCompany,
  NewEntrantItem,
  DroppedItem,
  RankMoverItem,
  MarketChangeCounts,
  MacroItem,
} from "@/lib/email/templates";

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

const MACRO_SPEC: Record<string, { label: string; unit: string }> = {
  FEDFUNDS: { label: "연방기금금리 (FEDFUNDS)", unit: "%" },
  CPI:      { label: "소비자물가지수 (CPI)",      unit: "" },
};

// 다이제스트 전용 발신자명 — 다른 이메일(welcome/pro-upgrade/contact 등)의
// 공용 FROM 상수와 무관하게 이 발송 건에만 적용한다.
const DIGEST_FROM = "TickerFlow Team <support@tickerflow.net>";

// 제목용 KST 날짜 — "2026. 07. 03" 형식
function kstSubjectDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}. ${get("month")}. ${get("day")}`;
}

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

// 날짜 문자열(YYYY-MM-DD) 하루치 UTC 타임스탬프 범위 — TIMESTAMPTZ 컬럼 필터링용
function dayRangeUtc(dateStr: string): { gte: string; lt: string } {
  const gte = `${dateStr}T00:00:00.000Z`;
  const next = new Date(`${dateStr}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { gte, lt: next.toISOString() };
}

function sparklineUrl(closes: number[]): string | null {
  if (closes.length < 2) return null;
  const up = closes[closes.length - 1] >= closes[0];
  const config = {
    type: "line",
    data: {
      labels: closes.map((_, i) => i),
      datasets: [{
        data: closes,
        borderColor: up ? "#6ee7b7" : "#f87171",
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
        tension: 0.3,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    },
  };
  const encoded = encodeURIComponent(JSON.stringify(config));
  return `https://quickchart.io/chart?c=${encoded}&width=280&height=96&backgroundColor=transparent&version=4`;
}

// ─── Claude Haiku 시장 분위기 + 시장 요약 (1회 호출) ──────────────────────────

async function generateMarketNarrative(params: {
  latestDate: string;
  top1Name: string;
  newEntrantCount: number;
  institutionalCount: number;
  insiderCount: number;
  earningsCount: number;
  earningsBeatCount: number;
  filingsCount: number;
  fallbackMood: string;
  fallbackSummary: string;
}): Promise<{ mood: string; summary: string }> {
  const fallback = { mood: params.fallbackMood, summary: params.fallbackSummary };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback;

  const prompt = `다음은 ${params.latestDate} 미국 나스닥 주요 기업 동향 데이터입니다.

- 기업동향 TOP1: ${params.top1Name}
- TOP30 신규 진입: ${params.newEntrantCount}건
- 기관 관련 공시: ${params.institutionalCount}건
- 내부자 거래: ${params.insiderCount}건
- 실적 발표: ${params.earningsCount}건 (예상치 상회 ${params.earningsBeatCount}건)
- 관련 공시: ${params.filingsCount}건

아래 두 항목을 정확히 이 형식으로 작성하라.

[MOOD]
(오늘 시장 분위기를 1~2문장으로 사실 기반 서술)

[SUMMARY]
(오늘 시장 전반의 동향을 3~4문장으로 사실 기반 서술)

원칙
- 사실 기반 서술만 사용할 것
- 투자 권유·관심 유도 표현을 배제할 것
- 애널리스트 코멘트 형식을 배제할 것

금지 표현 (아래 표현 및 이와 유사한 관심·기대 유도 표현 사용 금지)
- 주목할 만한, 눈여겨볼, 관심이 집중된
- 두드러진 움직임, 이목을 끄는, 눈에 띄는 변화, 활발한 움직임
- 강세, 약세, 상승 기대, 하락 우려
- 투자 매력, 긍정적 신호, 부정적 신호
- 투자 권유, 매수, 매도, 추천 표현

허용 표현 예시
- ~가 관측됐습니다
- ~가 확인됐습니다
- ~공시가 제출됐습니다
- ~건이 집계됐습니다
- ~변화가 있었습니다

기타 규칙
- 점수, 가중치, 알고리즘, 스코어링 로직 언급 금지
- 기관명·개인명 비노출
- plain text로만 작성, 마크다운 기호(#, **, - 등) 금지
- 반드시 [MOOD]와 [SUMMARY] 두 섹션 헤더를 그대로 포함해 응답할 것`;

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
        max_tokens: 400,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return fallback;
    const json = await res.json() as { content?: { text?: string }[] };
    const text = json?.content?.[0]?.text?.trim() ?? "";

    const moodMatch = text.match(/\[MOOD\]\s*([\s\S]*?)(?=\[SUMMARY\]|$)/);
    const summaryMatch = text.match(/\[SUMMARY\]\s*([\s\S]*)$/);
    const mood = moodMatch?.[1]?.trim();
    const summary = summaryMatch?.[1]?.trim();

    return {
      mood: mood && mood.length > 0 ? mood : fallback.mood,
      summary: summary && summary.length > 0 ? summary : fallback.summary,
    };
  } catch {
    return fallback;
  }
}

// ─── 다이제스트 데이터 수집 (이메일 발송과 무관한 순수 데이터 조회부) ────────────
//
// 이메일 발송(runDigestCollect)과 블로그 초안 생성(blog-draft.ts) 양쪽에서
// "오늘의 기업동향 TOP30 + 시장 변화" 데이터를 동일하게 사용해야 하므로,
// 수신자 조회·이메일 발송과 무관한 데이터 수집 로직만 이 함수로 분리했다.
// TOP30 데이터가 없으면 null을 반환한다.
export async function gatherDigestData(): Promise<DigestData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 1. 최근 2개 수집일(오늘/전일) 조회 — 주말·공휴일 공백 대응을 위해 달력일 차감 대신 실제 존재하는 직전 날짜 사용
  const { data: dateRows } = await admin
    .from("top30_daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(90);

  const distinctDates = [...new Set(((dateRows ?? []) as { date: string }[]).map((r) => r.date))];
  const latestDate = distinctDates[0];
  const prevDate = distinctDates[1] ?? null;

  if (!latestDate) {
    return null;
  }

  // 3. 최신 TOP30 조회
  const { data: todayRows } = await admin
    .from("top30_daily")
    .select("ticker, rank, reason_tags, metadata")
    .eq("date", latestDate)
    .order("rank", { ascending: true })
    .limit(30) as { data: Top30Row[] | null };

  const today30 = todayRows ?? [];
  if (today30.length === 0) {
    return null;
  }

  // 4. 전일 TOP30 조회 (신규진입·이탈·순위변화 계산용)
  const { data: prevRows } = prevDate
    ? await admin
        .from("top30_daily")
        .select("ticker, rank")
        .eq("date", prevDate)
        .order("rank", { ascending: true })
        .limit(30) as { data: { ticker: string; rank: number | null }[] | null }
    : { data: [] as { ticker: string; rank: number | null }[] };

  const prev30 = prevRows ?? [];
  const prevRankMap = new Map<string, number>();
  for (const r of prev30) if (r.rank != null) prevRankMap.set(r.ticker, r.rank);

  // 5. 티커 이름 + 기업 소개 조회
  const allTickers = [...new Set([...today30.map((r) => r.ticker), ...prev30.map((r) => r.ticker)])];
  const nameMap = new Map<string, string>();
  const descMap = new Map<string, string>();

  if (allTickers.length > 0) {
    const { data: tickerRows } = await admin
      .from("tickers")
      .select("ticker, name_kr, name_en, description_kr")
      .in("ticker", allTickers) as {
        data: { ticker: string; name_kr: string | null; name_en: string | null; description_kr: string | null }[] | null;
      };
    for (const t of tickerRows ?? []) {
      nameMap.set(t.ticker, t.name_kr ?? t.name_en ?? t.ticker);
      if (t.description_kr) descMap.set(t.ticker, t.description_kr);
    }
  }

  // 6. 신규 진입 / 이탈 / 순위 변화 계산
  const todaySet = new Set(today30.map((r) => r.ticker));
  const newEntrantRows = today30.filter((r) => !prevRankMap.has(r.ticker));
  const droppedTickers = prev30.filter((r) => !todaySet.has(r.ticker)).map((r) => r.ticker);

  const rankMovers: RankMoverItem[] = today30
    .filter((r) => r.rank != null && prevRankMap.has(r.ticker))
    .map((r) => {
      const prevRank = prevRankMap.get(r.ticker)!;
      const currRank = r.rank!;
      return {
        ticker: r.ticker,
        name: nameMap.get(r.ticker) ?? r.ticker,
        prevRank,
        currRank,
        delta: prevRank - currRank,
      };
    })
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  // 7. 오늘 날짜 기준 시장 변화 집계 (filings, insider_trades, institutional_holdings, earnings)
  const filingsRange = dayRangeUtc(latestDate);
  const insiderRange = dayRangeUtc(latestDate);
  const institutionalRange = dayRangeUtc(latestDate);

  const [{ count: filingsCount }, { count: insiderCount }, { count: institutionalCount }, { data: earningsRows }] = await Promise.all([
    admin.from("filings").select("id", { count: "exact", head: true })
      .gte("filed_at", filingsRange.gte).lt("filed_at", filingsRange.lt),
    admin.from("insider_trades").select("id", { count: "exact", head: true })
      .gte("filed_at", insiderRange.gte).lt("filed_at", insiderRange.lt),
    admin.from("institutional_holdings").select("id", { count: "exact", head: true })
      .gte("filed_at", institutionalRange.gte).lt("filed_at", institutionalRange.lt),
    admin.from("earnings")
      .select("ticker, eps_estimate, actual_eps, revenue_estimate, actual_revenue")
      .eq("report_date", latestDate),
  ]) as [
    { count: number | null },
    { count: number | null },
    { count: number | null },
    { data: { ticker: string; eps_estimate: number | null; actual_eps: number | null; revenue_estimate: number | null; actual_revenue: number | null }[] | null },
  ];

  const earningsToday = earningsRows ?? [];
  const earningsBeatCount = earningsToday.filter((e) =>
    (e.actual_eps != null && e.eps_estimate != null && e.actual_eps > e.eps_estimate) ||
    (e.actual_revenue != null && e.revenue_estimate != null && e.actual_revenue > e.revenue_estimate)
  ).length;

  const marketChange: MarketChangeCounts = {
    institutionalCount: institutionalCount ?? 0,
    earningsBeatCount,
    insiderCount: insiderCount ?? 0,
    filingsCount: filingsCount ?? 0,
  };

  // 8. 오늘의 한 기업 — TOP10 중 description_kr 있는 첫 종목 (TOP1 우선)
  const top10Rows = today30.slice(0, 10);
  const featuredRow = top10Rows.find((r) => descMap.has(r.ticker));
  let featured: FeaturedCompany | null = null;

  if (featuredRow) {
    const { data: priceRows } = await admin
      .from("stock_prices")
      .select("date, close")
      .eq("ticker", featuredRow.ticker)
      .order("date", { ascending: false })
      .limit(30) as { data: { date: string; close: number }[] | null };

    const closes = (priceRows ?? []).slice().reverse().map((r) => r.close);

    featured = {
      ticker: featuredRow.ticker,
      name: nameMap.get(featuredRow.ticker) ?? featuredRow.ticker,
      descriptionKr: descMap.get(featuredRow.ticker)!,
      sparklineUrl: sparklineUrl(closes),
    };
  }

  // 9. 주요 경제지표 (FEDFUNDS, CPI 최신 1건씩)
  const { data: macroRows } = await admin
    .from("macro_indicators")
    .select("indicator_name, value, previous_value, released_at")
    .in("indicator_name", Object.keys(MACRO_SPEC))
    .order("released_at", { ascending: false })
    .limit(20) as { data: { indicator_name: string; value: number | null; previous_value: number | null; released_at: string }[] | null };

  const macroLatest = new Map<string, { value: number | null; previous_value: number | null }>();
  for (const row of macroRows ?? []) {
    if (!macroLatest.has(row.indicator_name)) {
      macroLatest.set(row.indicator_name, { value: row.value, previous_value: row.previous_value });
    }
  }

  const macros: MacroItem[] = Object.keys(MACRO_SPEC)
    .filter((key) => macroLatest.has(key))
    .map((key) => {
      const row = macroLatest.get(key)!;
      const spec = MACRO_SPEC[key];
      return { key, label: spec.label, value: row.value, previousValue: row.previous_value, unit: spec.unit };
    });

  // 10. 시장 분위기 판단 (Haiku 실패 시 폴백)
  const maxSig = Math.max(marketChange.institutionalCount, marketChange.insiderCount, marketChange.earningsBeatCount);
  let fallbackMood: string;
  if (maxSig === 0) {
    fallbackMood = "오늘은 다양한 기업 변화가 고르게 관측됐습니다.";
  } else if (marketChange.institutionalCount === maxSig) {
    fallbackMood = "오늘은 기관 수급 관련 공시가 다수 확인됐습니다.";
  } else if (marketChange.insiderCount === maxSig) {
    fallbackMood = "오늘은 내부자 거래 공시가 다수 확인됐습니다.";
  } else {
    fallbackMood = "오늘은 실적 발표 이후 관련 공시가 다수 확인됐습니다.";
  }

  const fallbackSummary = `오늘은 관련 공시 ${marketChange.filingsCount}건, 실적 발표 ${earningsToday.length}건(예상치 상회 ${marketChange.earningsBeatCount}건)이 집계되었습니다. TOP30 신규 진입은 ${newEntrantRows.length}건입니다.`;

  const top1Name = nameMap.get(today30[0]?.ticker ?? "") ?? today30[0]?.ticker ?? "";
  const { mood: marketMood, summary: marketSummary } = await generateMarketNarrative({
    latestDate,
    top1Name,
    newEntrantCount: newEntrantRows.length,
    institutionalCount: marketChange.institutionalCount,
    insiderCount: marketChange.insiderCount,
    earningsCount: earningsToday.length,
    earningsBeatCount: marketChange.earningsBeatCount,
    filingsCount: marketChange.filingsCount,
    fallbackMood,
    fallbackSummary,
  });

  // 11. DigestData 구성
  const kstDate = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year:     "numeric",
    month:    "long",
    day:      "numeric",
  }).format(new Date());

  const top3Items: DigestTopItem[] = today30.slice(0, 3).map((r) => ({
    ticker:       r.ticker,
    name:         nameMap.get(r.ticker) ?? r.ticker,
    rank:         r.rank ?? 0,
    descriptions: tagsToDescs(r.reason_tags, 3),
  }));

  const top4to10Items: DigestTopItem[] = today30.slice(3, 10).map((r) => ({
    ticker:       r.ticker,
    name:         nameMap.get(r.ticker) ?? r.ticker,
    rank:         r.rank ?? 0,
    descriptions: tagsToDescs(r.reason_tags, 1),
  }));

  const newEntrants: NewEntrantItem[] = newEntrantRows.slice(0, 5).map((r) => ({
    ticker:      r.ticker,
    name:        nameMap.get(r.ticker) ?? r.ticker,
    description: tagsToDescs(r.reason_tags, 1)[0],
  }));

  const dropped: DroppedItem[] = droppedTickers.slice(0, 5).map((t) => ({
    ticker: t,
    name:   nameMap.get(t) ?? t,
  }));

  // 1~30위 전체 + 원본 reason_tags — 블로그 초안 생성에서 타입별(내부자
  // 매수/실적 등)로 종목을 걸러낼 때 사용 (이메일 카드에는 사용하지 않음).
  const top30Full: Top30TagItem[] = today30.map((r) => ({
    ticker: r.ticker,
    name:   nameMap.get(r.ticker) ?? r.ticker,
    rank:   r.rank ?? 0,
    tags:   r.reason_tags ?? [],
  }));

  return {
    kstDate,
    headline: {
      top30Count: today30.length,
      newEntrantCount: newEntrantRows.length,
      institutionalCount: marketChange.institutionalCount,
      earningsBeatCount: marketChange.earningsBeatCount,
    },
    marketMood,
    top3: top3Items,
    top4to10: top4to10Items,
    top30Full,
    marketChange,
    earningsTotal: earningsToday.length,
    featured,
    newEntrants,
    dropped,
    rankMovers,
    marketSummary,
    macros,
  };
}

// ─── 메인 (이메일 발송) ─────────────────────────────────────────────────────────

export async function runDigestCollect(): Promise<CollectResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 1. 발송 대상 조회 — Pro 유저 전원 + 가입 7일(168시간) 이내 Free 유저.
  // created_at 기준 롤링 윈도우이므로 신규 가입일수록 앞으로 남은 발송 횟수가
  // 많다. 이 기능 배포일(2026-07-03) 이전에 가입한 Free 유저는 가입일로부터
  // 계산한 7일 중 이미 지나간 기간만큼 발송 횟수가 줄어드는 것이 정상이다.
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: profiles, error: profileErr } = await admin
    .from("profiles")
    .select("email")
    .or(`plan.eq.pro,and(plan.eq.free,created_at.gte.${sevenDaysAgoIso})`);

  if (profileErr) return { ok: false, error: (profileErr as { message: string }).message };

  const targetEmails = ((profiles ?? []) as { email: string | null }[])
    .map((p) => p.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);

  if (targetEmails.length === 0) return { ok: true, sent: 0, message: "발송 대상 없음" };

  const digestData = await gatherDigestData();
  if (!digestData) return { ok: true, sent: 0, message: "TOP30 데이터 없음" };

  // 2. HTML 생성 및 발송
  // Resend 기본 rate limit(2req/s)을 준수하기 위해 발송 간 550ms 간격을 둔다.
  // 간격 없이 연속 호출하면 수신자가 많을 때 rate_limit_exceeded가 발생해
  // 실제로는 일시적인 현상인데도 발송 실패로 집계되는 문제가 있었다.
  // rate_limit_exceeded는 1회 재시도 후에도 실패한 경우에만 진짜 오류로 센다.
  const html    = dailyDigestEmail(digestData);
  const subject = `TickerFlow Pro 데일리 다이제스트 · ${kstSubjectDate()} KST`;
  let sent   = 0;
  let errors = 0;
  let lastErrorDetail: string | null = null;

  for (let i = 0; i < targetEmails.length; i++) {
    const email = targetEmails[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 550));

    let { error } = await resend.emails.send({ from: DIGEST_FROM, to: email, subject, html });

    if (error?.name === "rate_limit_exceeded") {
      await new Promise((r) => setTimeout(r, 1100));
      ({ error } = await resend.emails.send({ from: DIGEST_FROM, to: email, subject, html }));
    }

    if (error) {
      errors++;
      lastErrorDetail = `${error.name}: ${error.message}`;
    } else {
      sent++;
    }
  }

  return {
    ok: true,
    sent,
    errors,
    total: targetEmails.length,
    ...(errors > 0 && lastErrorDetail ? { firstError: lastErrorDetail } : {}),
  };
}
