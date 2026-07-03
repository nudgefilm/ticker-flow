import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// 세션 클라이언트(@/lib/supabase/server)와 admin 클라이언트(@/lib/supabase/admin) 모두
// SupabaseClient<Database>로 귀결되므로, 이 파일의 조회 함수들은 양쪽에서 공용으로 쓴다
// (페이지에서는 세션 클라이언트로 캐시만 읽고, collect 계층에서는 admin 클라이언트로 실계산한다).
type Supabase = SupabaseClient<Database>;

// ─── reason_tag → 사람이 읽는 설명 (digest.ts와 동일한 사전, 파일별 중복은 프로젝트 기존 관행) ──

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
  beat_streak_4:     "4분기 연속 예상치 상회",
  guidance_up:       "가이던스 상향 발표",
  guidance_down:     "가이던스 하향 발표",
  price_up_20:       "최근 30일 주가 20% 이상 상승",
  price_up_10:       "최근 30일 주가 10% 이상 상승",
  volume_spike:      "최근 거래량 급증",
  volatility_spike:  "최근 변동성 급증",
  short_decrease:    "공매도 감소 확인",
  target_up:         "목표가 상향 발표",
};

function tagsToDescs(tags: string[] | null, limit: number): string[] {
  if (!tags || tags.length === 0) return [];
  const seen = new Set<string>();
  const descs: string[] = [];
  for (const t of tags) {
    const d = TAG_TO_DESC[t];
    if (d && !seen.has(d)) { seen.add(d); descs.push(d); }
    if (descs.length >= limit) break;
  }
  return descs;
}

// ─── 기간 계산 ────────────────────────────────────────────────────────────────

export interface BriefRange {
  days: number;
  /** date 전용 컬럼(top30_daily.date, earnings.report_date 등) 비교용 YYYY-MM-DD */
  startDateOnly: string;
  /** timestamptz 컬럼(filings.filed_at 등) 비교용 ISO */
  startIso: string;
  /** 직전 동일 길이 구간 (예: 지난주, 지난달) — date 전용 */
  prevStartDateOnly: string;
  prevEndDateOnly: string;
}

export function computeRange(days: number): BriefRange {
  const now = Date.now();
  const dayMs = 86_400_000;
  const startDateOnly = new Date(now - (days - 1) * dayMs).toISOString().slice(0, 10);
  const startIso = new Date(now - (days - 1) * dayMs).toISOString();
  const prevEndDateOnly = new Date(now - days * dayMs).toISOString().slice(0, 10);
  const prevStartDateOnly = new Date(now - (2 * days - 1) * dayMs).toISOString().slice(0, 10);
  return { days, startDateOnly, startIso, prevStartDateOnly, prevEndDateOnly };
}

// ─── 이름 조회 헬퍼 ────────────────────────────────────────────────────────────

async function fetchNameMap(supabase: Supabase, tickers: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (tickers.length === 0) return map;
  const { data } = await supabase.from("tickers").select("ticker, name_kr, name_en").in("ticker", tickers);
  for (const t of data ?? []) map.set(t.ticker, t.name_kr ?? t.name_en ?? t.ticker);
  return map;
}

// ─── ① 기업동향 TOP N (top30_daily 기간 평균 score) ──────────────────────────

export interface BriefCompany {
  ticker: string;
  name: string;
  avgScore: number;
  descriptions: string[];
}

type Top30Row = { ticker: string; rank: number | null; final_score: number | null; reason_tags: string[] | null; date: string };

export async function fetchTopCompanies(supabase: Supabase, range: BriefRange, limit: number): Promise<BriefCompany[]> {
  const { data } = await supabase
    .from("top30_daily")
    .select("ticker, rank, final_score, reason_tags, date")
    .gte("date", range.startDateOnly)
    .limit(2000);

  const rows = (data ?? []) as unknown as Top30Row[];
  if (rows.length === 0) return [];

  const byTicker = new Map<string, Top30Row[]>();
  for (const r of rows) {
    const arr = byTicker.get(r.ticker) ?? [];
    arr.push(r);
    byTicker.set(r.ticker, arr);
  }

  const scored = [...byTicker.entries()].map(([ticker, group]) => {
    const scores = group.map((g) => g.final_score ?? 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const allTags = group.flatMap((g) => g.reason_tags ?? []);
    return { ticker, avgScore, allTags };
  });

  scored.sort((a, b) => b.avgScore - a.avgScore);
  const top = scored.slice(0, limit);

  const nameMap = await fetchNameMap(supabase, top.map((t) => t.ticker));

  return top.map((t) => ({
    ticker: t.ticker,
    name: nameMap.get(t.ticker) ?? t.ticker,
    avgScore: t.avgScore,
    descriptions: tagsToDescs(t.allTags, 4).slice(0, 4),
  }));
}

// ─── ③ 시장 변화 집계 ─────────────────────────────────────────────────────────

export interface MarketChangeStats {
  filingsCount: number;
  epsBeatCount: number;
  institutionalCount: number;
  insiderBuyCount: number;
  priceTargetUpCount: number;
  volumeSpikeCount: number;
}

export async function fetchMarketChangeStats(supabase: Supabase, range: BriefRange): Promise<MarketChangeStats> {
  const [
    { count: filingsCount },
    { data: earningsRows },
    { count: institutionalCount },
    { count: insiderBuyCount },
    { data: priceTargetRows },
    { data: priceRows },
  ] = await Promise.all([
    supabase.from("filings").select("*", { count: "exact", head: true }).gte("filed_at", range.startIso),
    supabase.from("earnings").select("ticker, actual_eps, eps_estimate, actual_revenue, revenue_estimate")
      .gte("report_date", range.startDateOnly).not("actual_eps", "is", null),
    supabase.from("institutional_holdings").select("*", { count: "exact", head: true }).gte("filed_at", range.startIso),
    supabase.from("insider_trades").select("*", { count: "exact", head: true })
      .eq("transaction_type", "buy").gte("filed_at", range.startIso),
    supabase.from("price_targets").select("ticker, price_target, published_date")
      .gte("published_date", range.startDateOnly).order("published_date", { ascending: false }).limit(3000),
    supabase.from("stock_prices").select("ticker, date, volume")
      .gte("date", range.prevStartDateOnly).order("date", { ascending: true }).limit(20000),
  ]);

  const epsBeatCount = (earningsRows ?? []).filter(
    (e) => e.actual_eps != null && e.eps_estimate != null && e.actual_eps > e.eps_estimate
  ).length;

  // 목표가 상향: 티커별 최근 2건의 price_target을 비교해 상승한 경우만 집계 (scoring.ts와 동일 로직)
  const ptByTicker = new Map<string, { price_target: number | null; published_date: string | null }[]>();
  for (const pt of priceTargetRows ?? []) {
    const arr = ptByTicker.get(pt.ticker) ?? [];
    if (arr.length < 2) { arr.push(pt); ptByTicker.set(pt.ticker, arr); }
  }
  let priceTargetUpCount = 0;
  for (const rows of ptByTicker.values()) {
    if (rows.length >= 2 && rows[0].price_target != null && rows[1].price_target != null && rows[0].price_target > rows[1].price_target) {
      priceTargetUpCount++;
    }
  }

  // 거래량 증가: 최근 5일 평균 거래량이 이전 구간 평균 대비 2배 이상인 종목 수 (scoring.ts와 동일 기준)
  const pricesByTicker = new Map<string, number[]>();
  for (const p of priceRows ?? []) {
    if (p.volume == null || p.volume <= 0) continue;
    const arr = pricesByTicker.get(p.ticker) ?? [];
    arr.push(p.volume);
    pricesByTicker.set(p.ticker, arr);
  }
  let volumeSpikeCount = 0;
  for (const vols of pricesByTicker.values()) {
    if (vols.length < 5) continue;
    const a5 = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const baseWindow = vols.slice(-Math.min(20, vols.length));
    const a20 = baseWindow.reduce((a, b) => a + b, 0) / baseWindow.length;
    if (a20 > 0 && a5 > a20 * 2) volumeSpikeCount++;
  }

  return {
    filingsCount: filingsCount ?? 0,
    epsBeatCount,
    institutionalCount: institutionalCount ?? 0,
    insiderBuyCount: insiderBuyCount ?? 0,
    priceTargetUpCount,
    volumeSpikeCount,
  };
}

// ─── ④ 신규 진입 / ⑤ 지난 기간 대비 변화 (top30_daily 이번 구간 vs 직전 구간) ──

export interface RankMoverItem {
  ticker: string;
  name: string;
  prevRank: number;
  currRank: number;
  delta: number;
}

export interface PeriodComparison {
  newEntrants: BriefCompany[];
  dropped: { ticker: string; name: string }[];
  movers: RankMoverItem[];
}

export async function fetchPeriodComparison(supabase: Supabase, range: BriefRange): Promise<PeriodComparison> {
  const [{ data: currData }, { data: prevData }] = await Promise.all([
    supabase.from("top30_daily").select("ticker, rank, final_score, reason_tags")
      .gte("date", range.startDateOnly).limit(2000),
    supabase.from("top30_daily").select("ticker, rank")
      .gte("date", range.prevStartDateOnly).lte("date", range.prevEndDateOnly).limit(2000),
  ]);

  const curr = (currData ?? []) as unknown as Top30Row[];
  const prev = (prevData ?? []) as unknown as { ticker: string; rank: number | null }[];

  const currBestRank = new Map<string, number>();
  const currTags = new Map<string, string[]>();
  for (const r of curr) {
    if (r.rank != null) {
      const best = currBestRank.get(r.ticker);
      if (best === undefined || r.rank < best) currBestRank.set(r.ticker, r.rank);
    }
    const arr = currTags.get(r.ticker) ?? [];
    currTags.set(r.ticker, [...arr, ...(r.reason_tags ?? [])]);
  }

  const prevBestRank = new Map<string, number>();
  for (const r of prev) {
    if (r.rank == null) continue;
    const best = prevBestRank.get(r.ticker);
    if (best === undefined || r.rank < best) prevBestRank.set(r.ticker, r.rank);
  }

  const currSet = new Set(currBestRank.keys());
  const prevSet = new Set(prevBestRank.keys());

  const newEntrantTickers = [...currSet].filter((t) => !prevSet.has(t));
  const droppedTickers = [...prevSet].filter((t) => !currSet.has(t));
  const movers: RankMoverItem[] = [...currSet]
    .filter((t) => prevSet.has(t))
    .map((t) => {
      const prevRank = prevBestRank.get(t)!;
      const currRank = currBestRank.get(t)!;
      return { ticker: t, name: t, prevRank, currRank, delta: prevRank - currRank };
    })
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  const allNames = [...newEntrantTickers, ...droppedTickers, ...movers.map((m) => m.ticker)];
  const nameMap = await fetchNameMap(supabase, allNames);

  return {
    newEntrants: newEntrantTickers.slice(0, 10).map((t) => ({
      ticker: t,
      name: nameMap.get(t) ?? t,
      avgScore: 0,
      descriptions: tagsToDescs(currTags.get(t) ?? [], 2),
    })),
    dropped: droppedTickers.slice(0, 5).map((t) => ({ ticker: t, name: nameMap.get(t) ?? t })),
    movers: movers.map((m) => ({ ...m, name: nameMap.get(m.ticker) ?? m.ticker })),
  };
}

// ─── ⑥ 섹터 동향 ──────────────────────────────────────────────────────────────

export interface SectorTrend {
  sector: string;
  filingsCount: number;
  insiderCount: number;
  total: number;
}

const SECTOR_KR: Record<string, string> = {
  Technology: "기술", Healthcare: "헬스케어", Financials: "금융", "Financial Services": "금융",
  "Consumer Discretionary": "경기소비재", "Consumer Cyclical": "경기소비재",
  "Consumer Staples": "필수소비재", "Consumer Defensive": "필수소비재",
  Energy: "에너지", Industrials: "산업재", Materials: "소재",
  "Real Estate": "부동산", Utilities: "유틸리티", "Communication Services": "커뮤니케이션",
};

export async function fetchSectorTrends(supabase: Supabase, range: BriefRange, limit: number): Promise<SectorTrend[]> {
  const [{ data: filingRows }, { data: insiderRows }] = await Promise.all([
    supabase.from("filings").select("ticker").gte("filed_at", range.startIso).limit(5000),
    supabase.from("insider_trades").select("ticker").eq("transaction_type", "buy").gte("filed_at", range.startIso).limit(5000),
  ]);

  const tickerCounts = new Map<string, { filings: number; insider: number }>();
  for (const r of filingRows ?? []) {
    const c = tickerCounts.get(r.ticker) ?? { filings: 0, insider: 0 };
    c.filings++;
    tickerCounts.set(r.ticker, c);
  }
  for (const r of insiderRows ?? []) {
    const c = tickerCounts.get(r.ticker) ?? { filings: 0, insider: 0 };
    c.insider++;
    tickerCounts.set(r.ticker, c);
  }

  const allTickers = [...tickerCounts.keys()];
  if (allTickers.length === 0) return [];

  const { data: tickerRows } = await supabase.from("tickers").select("ticker, sector").in("ticker", allTickers);
  const sectorOf = new Map((tickerRows ?? []).map((t) => [t.ticker, t.sector] as const));

  const bySector = new Map<string, { filings: number; insider: number }>();
  for (const [ticker, c] of tickerCounts) {
    const sector = sectorOf.get(ticker);
    if (!sector) continue;
    const acc = bySector.get(sector) ?? { filings: 0, insider: 0 };
    acc.filings += c.filings;
    acc.insider += c.insider;
    bySector.set(sector, acc);
  }

  return [...bySector.entries()]
    .map(([sector, c]) => ({
      sector: SECTOR_KR[sector] ?? sector,
      filingsCount: c.filings,
      insiderCount: c.insider,
      total: c.filings + c.insider,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ─── ⑦ 주요 공시 ──────────────────────────────────────────────────────────────

export interface FilingHighlight {
  ticker: string;
  name: string;
  formType: string;
  eventType: string | null;
  filedAt: string;
  url: string | null;
}

const HIGHLIGHT_FORM_PREFIXES = ["8-K", "4", "SC 13D", "SC 13G", "13F"];

export async function fetchTopFilings(supabase: Supabase, range: BriefRange, limit: number): Promise<FilingHighlight[]> {
  const { data } = await supabase
    .from("filings")
    .select("ticker, form_type, event_type, filed_at, url")
    .gte("filed_at", range.startIso)
    .order("filed_at", { ascending: false })
    .limit(500);

  const rows = data ?? [];
  const filtered = rows.filter((r) => HIGHLIGHT_FORM_PREFIXES.some((p) => r.form_type.toUpperCase().startsWith(p)));
  // event_type이 분류된(주요 이벤트) 공시를 우선 노출
  filtered.sort((a, b) => {
    const aScore = a.event_type ? 1 : 0;
    const bScore = b.event_type ? 1 : 0;
    if (aScore !== bScore) return bScore - aScore;
    return b.filed_at.localeCompare(a.filed_at);
  });

  const top = filtered.slice(0, limit);
  const nameMap = await fetchNameMap(supabase, top.map((t) => t.ticker));

  return top.map((r) => ({
    ticker: r.ticker,
    name: nameMap.get(r.ticker) ?? r.ticker,
    formType: r.form_type,
    eventType: r.event_type,
    filedAt: r.filed_at,
    url: r.url,
  }));
}

// ─── ⑧ 실적 하이라이트 ────────────────────────────────────────────────────────

export interface EarningsHighlight {
  ticker: string;
  name: string;
  epsBeat: boolean;
  revenueBeat: boolean;
  reportDate: string;
}

export async function fetchEarningsHighlights(supabase: Supabase, range: BriefRange, limit: number): Promise<EarningsHighlight[]> {
  const { data } = await supabase
    .from("earnings")
    .select("ticker, actual_eps, eps_estimate, actual_revenue, revenue_estimate, report_date")
    .gte("report_date", range.startDateOnly)
    .not("actual_eps", "is", null)
    .order("report_date", { ascending: false })
    .limit(500);

  const highlights = (data ?? [])
    .map((e) => ({
      ticker: e.ticker,
      epsBeat: e.actual_eps != null && e.eps_estimate != null && e.actual_eps > e.eps_estimate,
      revenueBeat: e.actual_revenue != null && e.revenue_estimate != null && e.actual_revenue > e.revenue_estimate,
      reportDate: e.report_date,
    }))
    .filter((e) => e.epsBeat || e.revenueBeat)
    .slice(0, limit);

  const nameMap = await fetchNameMap(supabase, highlights.map((h) => h.ticker));

  return highlights.map((h) => ({ ...h, name: nameMap.get(h.ticker) ?? h.ticker }));
}

// ─── ⑨ 경제지표 (월간 전용) ───────────────────────────────────────────────────

export interface MacroSnapshot {
  name: string;
  value: number | null;
  previousValue: number | null;
  releasedAt: string;
}

const MACRO_PICKS = ["기준금리", "CPI", "실업률"];

export async function fetchMacroSnapshot(supabase: Supabase): Promise<MacroSnapshot[]> {
  const { data } = await supabase
    .from("macro_indicators")
    .select("indicator_name, value, previous_value, released_at")
    .in("indicator_name", MACRO_PICKS)
    .order("released_at", { ascending: false })
    .limit(50);

  const latest = new Map<string, MacroSnapshot>();
  for (const row of data ?? []) {
    if (!latest.has(row.indicator_name)) {
      latest.set(row.indicator_name, {
        name: row.indicator_name,
        value: row.value,
        previousValue: row.previous_value,
        releasedAt: row.released_at,
      });
    }
  }
  return MACRO_PICKS.filter((k) => latest.has(k)).map((k) => latest.get(k)!);
}

// ─── ⑥(월간) 가장 많이 관측된 변화 ────────────────────────────────────────────

export interface TagLeader {
  label: string;
  count: number;
}

export async function fetchTagLeaders(supabase: Supabase, range: BriefRange, limit: number): Promise<TagLeader[]> {
  const { data } = await supabase
    .from("top30_daily")
    .select("reason_tags")
    .gte("date", range.startDateOnly)
    .limit(2000);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const tag of row.reason_tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([tag]) => TAG_TO_DESC[tag])
    .map(([tag, count]) => ({ label: TAG_TO_DESC[tag], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Haiku 요약 (기존 digest.ts 원칙과 동일한 규칙 적용) ──────────────────────

export async function generateBriefSummary(params: {
  periodLabel: string; // "이번 주" | "이번 달"
  top1Name: string;
  newEntrantCount: number;
  filingsCount: number;
  epsBeatCount: number;
  institutionalCount: number;
  insiderBuyCount: number;
  sentenceCount: string; // "2~3문장" | "3~5문장"
}): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `다음은 ${params.periodLabel} 미국 나스닥 주요 기업 동향 데이터입니다.

- 기업동향 TOP1: ${params.top1Name}
- TOP30 신규 진입: ${params.newEntrantCount}건
- 관련 공시: ${params.filingsCount}건
- 실적 예상치 상회: ${params.epsBeatCount}건
- 기관 관련 공시: ${params.institutionalCount}건
- 내부자 매수: ${params.insiderBuyCount}건

${params.periodLabel} 시장 전반의 동향을 ${params.sentenceCount}으로 사실 기반 서술하라.

규칙
- 사실 기반 서술만 사용할 것 (예: "~가 관측됐습니다", "~가 확인됐습니다", "~건이 집계됐습니다")
- 아래 표현 및 이와 유사한 관심·기대 유도 표현 사용 금지: 주목할 만한, 눈여겨볼, 관심이 집중된, 두드러진 움직임, 이목을 끄는, 눈에 띄는 변화, 활발한 움직임, 강세, 약세, 상승 기대, 하락 우려, 투자 매력, 긍정적 신호, 부정적 신호
- 투자 권유, 매수, 매도, 추천 표현 금지
- 애널리스트 코멘트 형식 배제
- 점수, 가중치, 알고리즘, 스코어링 로직 언급 금지
- 기관명·개인명 비노출
- plain text로만 작성, 마크다운 기호(#, **, - 등) 금지`;

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
    if (!res.ok) return null;
    const json = await res.json() as { content?: { text?: string }[] };
    const text = json?.content?.[0]?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

// ─── 캐시 데이터 형태 (weekly_briefs.data / monthly_briefs.data jsonb) ────────
// 실계산은 src/lib/collect/weekly-brief.ts, monthly-brief.ts에서 수행하고
// 이 형태로 조립해 캐시 테이블에 upsert한다. 페이지는 아래 getLatest* 함수로
// 캐시만 읽는다 (실시간 계산 없음).

export interface WeeklyBriefData {
  topCompanies: BriefCompany[];
  marketStats: MarketChangeStats;
  newEntrants: BriefCompany[];
  dropped: { ticker: string; name: string }[];
  movers: RankMoverItem[];
  sectors: SectorTrend[];
  filings: FilingHighlight[];
  earningsHighlights: EarningsHighlight[];
  summary: string | null;
}

export interface MonthlyBriefData {
  topCompanies: BriefCompany[];
  marketStats: MarketChangeStats;
  newEntrants: BriefCompany[];
  sectors: SectorTrend[];
  tagLeaders: TagLeader[];
  filings: FilingHighlight[];
  earningsHighlights: EarningsHighlight[];
  macro: MacroSnapshot[];
  summary: string | null;
}

export interface WeeklyBriefCache {
  weekStart: string;
  generatedAt: string;
  data: WeeklyBriefData;
}

export interface MonthlyBriefCache {
  monthStart: string;
  generatedAt: string;
  data: MonthlyBriefData;
}

// weekly_briefs / monthly_briefs는 신규 테이블이라 생성된 Supabase 타입에 아직 없음
// (CLAUDE.md 16항) — pnpm gen:types 재생성 전까지 as any 캐스트 사용.

export async function getLatestWeeklyBrief(supabase: Supabase): Promise<WeeklyBriefCache | null> {
  const { data } = await (supabase as any)
    .from("weekly_briefs")
    .select("week_start, data, generated_at")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { weekStart: data.week_start, generatedAt: data.generated_at, data: data.data as WeeklyBriefData };
}

export async function getLatestMonthlyBrief(supabase: Supabase): Promise<MonthlyBriefCache | null> {
  const { data } = await (supabase as any)
    .from("monthly_briefs")
    .select("month_start, data, generated_at")
    .order("month_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { monthStart: data.month_start, generatedAt: data.generated_at, data: data.data as MonthlyBriefData };
}
