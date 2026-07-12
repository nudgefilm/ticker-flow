import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { resend } from "@/lib/email/resend";
import { dailyDigestEmail } from "@/lib/email/templates";
import type {
  DigestData,
  DigestTopItem,
  InsiderBuyItem,
  EarningsBeatItem,
  FeaturedCompany,
  NewEntrantItem,
  DroppedItem,
  ActivityMoverItem,
  MarketChangeCounts,
  MacroItem,
} from "@/lib/email/templates";
import { computeRange, fetchTopCompanies, fetchPeriodComparison } from "@/lib/watchlist-brief";

// 2026-07-11: gatherDigestData()는 이전에는 top30_daily(TickerFlow 자체
// 스코어링 결과)를 근거로 "오늘의 기업동향 TOP10/TOP30 신규진입/순위변화"를
// 구성했다. 자본시장법 유사투자자문업 리스크 점검(세션97)에 따라, 가중치
// 기반 종합 평가·선정 결과를 노출하지 않도록 공시+뉴스+내부자매수 "건수"
// 기반으로 완전히 재설계했다(watchlist-brief.ts의 fetchTopCompanies/
// fetchPeriodComparison 재사용 — 주간/월간 BRIEF와 동일한 팩트 카운트 로직).
// "featured"(오늘의 한 기업)·내부자매수/실적상회 목록은 여전히 사실 집계이며
// 스코어링을 참조하지 않는다.

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

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

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
  return `https://quickchart.io/chart?c=${encoded}&width=1120&height=320&backgroundColor=transparent&version=4`;
}

// ─── Claude Haiku 시장 분위기 + 시장 요약 (1회 호출) ──────────────────────────

async function generateMarketNarrative(params: {
  latestDate: string;
  topCompanyName: string;
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

- 오늘 가장 활동이 많았던 기업: ${params.topCompanyName}
- 오늘 새로 활동이 확인된 기업: ${params.newEntrantCount}건
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
- "TOP10", "TOP30", "N위"(순위 표기), 순위, 랭킹, 선정, "~에 진입/편입" 같은
  순위·선정 뉘앙스 표현 (위 수치는 건수일 뿐 순위·선정 결과가 아니다)

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
// "오늘의 기업동향 + 시장 변화" 데이터를 동일하게 사용해야 하므로, 수신자
// 조회·이메일 발송과 무관한 데이터 수집 로직만 이 함수로 분리했다. 오늘 활동
// 데이터가 전혀 없으면 null을 반환한다.
export async function gatherDigestData(): Promise<DigestData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 2026-07-12: computeRange(1)이 rolling(실행 시점 기준 최근 24시간)으로 바뀌면서
  // 이 함수 전체의 "오늘" 판정을 range.startIso(=now-24h)와 nowIso(=now) 두 경계로
  // 통일한다. 아래 filings/insider_trades/institutional_holdings/earnings 집계도
  // 더 이상 UTC 자정 고정 경계(dayRangeUtc/todayStr)를 쓰지 않는다 — 자정 정렬을
  // 쓰면 매일 10:00 KST(=01:00 UTC) 다이제스트 발송 시점엔 당일 구간이 시작한 지
  // 1시간 뿐이라 그날 수집분을 거의 반영하지 못했다.
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10); // generateMarketNarrative 프롬프트 표시용 라벨(필터링에는 미사용)
  const range = computeRange(1); // "오늘" vs "어제" 1일 구간(활동 건수 비교용, rolling 24h)

  // 1. 활동 건수 기반 상위 기업 + 기간 비교(신규 관측/활동 감소/건수 변화)
  const [topCompanies, comparison] = await Promise.all([
    fetchTopCompanies(admin, range, 10),
    fetchPeriodComparison(admin, range),
  ]);

  if (topCompanies.length === 0) {
    return null;
  }

  const top3Items: DigestTopItem[] = topCompanies.slice(0, 3);
  const top4to10Items: DigestTopItem[] = topCompanies.slice(3, 10);

  const newEntrants: NewEntrantItem[] = comparison.newEntrants.slice(0, 5).map((e) => ({
    ticker:      e.ticker,
    name:        e.name,
    description: e.descriptions[0] ?? "최근 활동 확인",
  }));

  const dropped: DroppedItem[] = comparison.dropped.slice(0, 5);
  const activityMovers: ActivityMoverItem[] = comparison.movers;

  // 2. 티커 이름 + 기업 소개 조회 (오늘 활동 상위 기업 + 신규 관측 기업)
  const allTickers = [...new Set([
    ...topCompanies.map((c) => c.ticker),
    ...comparison.newEntrants.map((c) => c.ticker),
  ])];
  const descMap = new Map<string, string>();

  if (allTickers.length > 0) {
    const { data: tickerRows } = await admin
      .from("tickers")
      .select("ticker, description_kr")
      .in("ticker", allTickers) as { data: { ticker: string; description_kr: string | null }[] | null };
    for (const t of tickerRows ?? []) {
      if (t.description_kr) descMap.set(t.ticker, t.description_kr);
    }
  }

  // 3. 최근 24시간(rolling) 기준 시장 변화 집계 (filings, insider_trades, institutional_holdings, earnings)
  // range.startIso = now-24h, nowIso = now — computeRange(1)이 계산한 것과 동일한 경계.
  // earnings.report_date는 date-only 컬럼이라 시각 경계를 그대로 쓸 수 없어, 24시간 구간이
  // 걸치는 두 날짜(now-24h의 날짜 ~ now의 날짜)를 포함하는 범위로 근사한다.
  const earningsStartDateOnly = range.startIso.slice(0, 10);
  const earningsEndDateOnly = nowIso.slice(0, 10);

  const [
    { count: filingsCount },
    { count: insiderCount },
    { count: institutionalCount },
    { data: earningsRows },
    { data: insiderBuyRows },
  ] = await Promise.all([
    admin.from("filings").select("id", { count: "exact", head: true })
      .gte("filed_at", range.startIso).lt("filed_at", nowIso),
    admin.from("insider_trades").select("id", { count: "exact", head: true })
      .gte("filed_at", range.startIso).lt("filed_at", nowIso),
    admin.from("institutional_holdings").select("id", { count: "exact", head: true })
      .gte("filed_at", range.startIso).lt("filed_at", nowIso),
    admin.from("earnings")
      .select("ticker, eps_estimate, actual_eps, revenue_estimate, actual_revenue")
      .gte("report_date", earningsStartDateOnly).lte("report_date", earningsEndDateOnly),
    admin.from("insider_trades")
      .select("ticker, value")
      .eq("transaction_type", "buy")
      .gte("filed_at", range.startIso).lt("filed_at", nowIso),
  ]) as [
    { count: number | null },
    { count: number | null },
    { count: number | null },
    { data: { ticker: string; eps_estimate: number | null; actual_eps: number | null; revenue_estimate: number | null; actual_revenue: number | null }[] | null },
    { data: { ticker: string; value: number | null }[] | null },
  ];

  const earningsToday = earningsRows ?? [];
  const earningsBeatToday: EarningsBeatItem[] = [];
  for (const e of earningsToday) {
    const epsBeat = e.actual_eps != null && e.eps_estimate != null && e.actual_eps > e.eps_estimate;
    const revenueBeat = e.actual_revenue != null && e.revenue_estimate != null && e.actual_revenue > e.revenue_estimate;
    if (epsBeat || revenueBeat) earningsBeatToday.push({ ticker: e.ticker, name: e.ticker, epsBeat, revenueBeat });
  }

  // 내부자 매수 총액 $1M 이상이면 "대규모"로 분류 — 사실 집계 기준일 뿐, 점수화하지 않는다.
  const insiderValueByTicker = new Map<string, number>();
  for (const r of insiderBuyRows ?? []) {
    if (r.value == null) continue;
    insiderValueByTicker.set(r.ticker, (insiderValueByTicker.get(r.ticker) ?? 0) + r.value);
  }
  const insiderBuyToday: InsiderBuyItem[] = [...insiderValueByTicker.entries()].map(([ticker, value]) => ({
    ticker,
    name: ticker,
    isLarge: value >= 1_000_000,
  }));

  const marketChange: MarketChangeCounts = {
    institutionalCount: institutionalCount ?? 0,
    earningsBeatCount: earningsBeatToday.length,
    insiderCount: insiderCount ?? 0,
    filingsCount: filingsCount ?? 0,
  };

  // 이름 맵 보강 (insiderBuyToday/earningsBeatToday에 필요한 티커까지 포함)
  const nameLookupTickers = [...new Set([
    ...allTickers,
    ...insiderBuyToday.map((i) => i.ticker),
    ...earningsBeatToday.map((e) => e.ticker),
  ])];
  const nameMap = new Map<string, string>();
  if (nameLookupTickers.length > 0) {
    const { data: nameRows } = await admin
      .from("tickers")
      .select("ticker, name_kr, name_en")
      .in("ticker", nameLookupTickers) as { data: { ticker: string; name_kr: string | null; name_en: string | null }[] | null };
    for (const t of nameRows ?? []) nameMap.set(t.ticker, t.name_kr ?? t.name_en ?? t.ticker);
  }
  for (const item of [...top3Items, ...top4to10Items]) item.name = nameMap.get(item.ticker) ?? item.name;
  for (const item of newEntrants) item.name = nameMap.get(item.ticker) ?? item.name;
  for (const item of dropped) item.name = nameMap.get(item.ticker) ?? item.name;
  for (const item of activityMovers) item.name = nameMap.get(item.ticker) ?? item.name;
  for (const item of insiderBuyToday) item.name = nameMap.get(item.ticker) ?? item.name;
  for (const item of earningsBeatToday) item.name = nameMap.get(item.ticker) ?? item.name;

  // 4. 오늘의 한 기업 — 활동 상위 기업 중 description_kr 있는 첫 종목
  const featuredRow = topCompanies.find((c) => descMap.has(c.ticker));
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
      name: nameMap.get(featuredRow.ticker) ?? featuredRow.name,
      descriptionKr: descMap.get(featuredRow.ticker)!,
      sparklineUrl: sparklineUrl(closes),
    };
  }

  // 5. 주요 경제지표 (FEDFUNDS, CPI 최신 1건씩)
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

  // 6. 시장 분위기 판단 (Haiku 실패 시 폴백)
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

  const fallbackSummary = `오늘은 관련 공시 ${marketChange.filingsCount}건, 실적 발표 ${earningsToday.length}건(예상치 상회 ${marketChange.earningsBeatCount}건)이 집계되었습니다. 새로 활동이 확인된 기업은 ${newEntrants.length}건입니다.`;

  const topCompanyName = topCompanies[0]?.name ?? "";
  const { mood: marketMood, summary: marketSummary } = await generateMarketNarrative({
    latestDate: todayStr,
    topCompanyName,
    newEntrantCount: newEntrants.length,
    institutionalCount: marketChange.institutionalCount,
    insiderCount: marketChange.insiderCount,
    earningsCount: earningsToday.length,
    earningsBeatCount: marketChange.earningsBeatCount,
    filingsCount: marketChange.filingsCount,
    fallbackMood,
    fallbackSummary,
  });

  // 7. DigestData 구성
  const kstDate = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year:     "numeric",
    month:    "long",
    day:      "numeric",
  }).format(new Date());

  return {
    kstDate,
    headline: {
      activeCompanyCount: comparison.totalActiveCount,
      newEntrantCount: newEntrants.length,
      institutionalCount: marketChange.institutionalCount,
      earningsBeatCount: marketChange.earningsBeatCount,
    },
    marketMood,
    top3: top3Items,
    top4to10: top4to10Items,
    insiderBuyToday,
    earningsBeatToday,
    marketChange,
    earningsTotal: earningsToday.length,
    featured,
    newEntrants,
    dropped,
    activityMovers,
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
  if (!digestData) return { ok: true, sent: 0, message: "오늘 활동 데이터 없음" };

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
