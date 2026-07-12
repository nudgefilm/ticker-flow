import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { neutralizeRankLanguage } from "./collect/rank-language";

// 세션 클라이언트(@/lib/supabase/server)와 admin 클라이언트(@/lib/supabase/admin) 모두
// SupabaseClient<Database>로 귀결되므로, 이 파일의 조회 함수들은 양쪽에서 공용으로 쓴다
// (페이지에서는 세션 클라이언트로 캐시만 읽고, collect 계층에서는 admin 클라이언트로 실계산한다).
type Supabase = SupabaseClient<Database>;

// ─── filings.event_type → 사람이 읽는 설명 ───────────────────────────────────
//
// 2026-07-11: 이전에는 top30_daily.reason_tags(TickerFlow 자체 스코어링 결과)를
// 근거로 종목을 선정·서술했다. 자본시장법 유사투자자문업 리스크 점검(세션97)에
// 따라, BRIEF의 "기업동향 TOP N"/"순위 변화"를 가중치 스코어링과 완전히 분리된
// 팩트 카운트(공시·뉴스·내부자 매수 건수) 기반으로 재설계했다 — 아래
// EVENT_TYPE_KR는 filings.event_type(공시에 실제 기록된 분류)만 사람이 읽는
// 문구로 바꿀 뿐, 스코어링 태그(reason_tags)는 더 이상 참조하지 않는다.
const EVENT_TYPE_KR: Record<string, string> = {
  ceo_change:    "CEO 교체 공시",
  cfo_change:    "CFO 교체 공시",
  buyback:       "자사주 매입 공시",
  insider_trade: "내부자 거래 공시",
  ma:            "인수합병 공시",
  guidance:      "가이던스 변경 공시",
  contract:      "대규모 계약 공시",
  dilution:      "증자 공시",
  bond:          "전환사채 공시",
};

type ActivityFacts = { count: number; filings: number; news: number; insiderBuy: number; eventTypes: string[] };

/** 공시+뉴스+내부자매수 건수를 [startIso, endIsoExclusive) 구간에서 티커별로 집계한다. 스코어링 미사용. */
async function fetchActivityCountsAndFacts(
  supabase: Supabase,
  startIso: string,
  endIsoExclusive: string
): Promise<Map<string, ActivityFacts>> {
  const [{ data: filingRows }, { data: newsRows }, { data: insiderRows }] = await Promise.all([
    supabase.from("filings").select("ticker, event_type")
      .gte("filed_at", startIso).lt("filed_at", endIsoExclusive).limit(5000),
    supabase.from("news").select("ticker")
      .gte("published_at", startIso).lt("published_at", endIsoExclusive).not("ticker", "is", null).limit(5000),
    supabase.from("insider_trades").select("ticker")
      .eq("transaction_type", "buy").gte("filed_at", startIso).lt("filed_at", endIsoExclusive).limit(5000),
  ]);

  const map = new Map<string, ActivityFacts>();
  const get = (ticker: string): ActivityFacts => {
    let v = map.get(ticker);
    if (!v) { v = { count: 0, filings: 0, news: 0, insiderBuy: 0, eventTypes: [] }; map.set(ticker, v); }
    return v;
  };

  for (const f of filingRows ?? []) {
    const v = get(f.ticker);
    v.count++; v.filings++;
    if (f.event_type && !v.eventTypes.includes(f.event_type)) v.eventTypes.push(f.event_type);
  }
  for (const n of newsRows ?? []) {
    if (!n.ticker) continue;
    const v = get(n.ticker);
    v.count++; v.news++;
  }
  for (const i of insiderRows ?? []) {
    const v = get(i.ticker);
    v.count++; v.insiderBuy++;
  }
  return map;
}

function factsToDescriptions(v: ActivityFacts, limit: number): string[] {
  const descs: string[] = [];
  for (const et of v.eventTypes) {
    const label = EVENT_TYPE_KR[et];
    if (label && !descs.includes(label)) descs.push(label);
  }
  if (descs.length < limit && v.insiderBuy > 0) descs.push(`내부자 매수 ${v.insiderBuy}건 확인`);
  if (descs.length < limit && v.news > 0) descs.push(`관련 뉴스 ${v.news}건 확인`);
  return descs.length > 0 ? descs.slice(0, limit) : ["최근 활동 확인"];
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
  /** days=1(rolling 24h) 전용 — 있으면 prevStartDateOnly/prevEndDateOnly 대신 이 ISO 경계를 그대로 사용 */
  prevStartIso?: string;
  prevEndIso?: string;
}

// 2026-07-11: 자정(UTC) 기준으로 정렬하도록 수정 — 기존에는 "지금 이 순간"에서
// (days-1)일을 빼는 방식이라, days=1(일간 다이제스트에서 신규 사용)일 때
// startIso가 "바로 지금"이 되어 사실상 오늘 데이터를 전부 놓치는 문제가 있었다.
// days=7/30(주간·월간 BRIEF)은 자정 정렬 전후로 결과가 거의 동일해 영향이 없다.
//
// 2026-07-12: days=1 한정으로 다시 rolling(실행 시점 기준 최근 24시간) 방식으로
// 변경 — 자정 정렬 방식은 이메일 다이제스트가 매일 10:00 KST(=01:00 UTC)에
// 발송되는데, UTC 자정 이후 겨우 1시간 지난 시점이라 당일 구간이 시작한 지
// 얼마 안 돼 그날 수집된 filings/news/insider_trades를 거의 반영하지 못하는
// 문제가 있었다. days=7/30(주간·월간 BRIEF)·랜딩 TOP10은 자정 정렬을 그대로
// 유지한다 — 이 함수 호출부 목록: digest.ts(days=1), weekly-brief.ts(days=7),
// monthly-brief.ts(days=30), landing-top10.tsx(days=7).
export function computeRange(days: number): BriefRange {
  const dayMs = 86_400_000;

  if (days === 1) {
    const nowMs = Date.now();
    const startIso = new Date(nowMs - dayMs).toISOString();
    const prevStartIso = new Date(nowMs - 2 * dayMs).toISOString();
    const prevEndIso = startIso;
    return {
      days,
      startDateOnly: startIso.slice(0, 10),
      startIso,
      prevStartDateOnly: prevStartIso.slice(0, 10),
      prevEndDateOnly: prevEndIso.slice(0, 10),
      prevStartIso,
      prevEndIso,
    };
  }

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const startDateOnly = new Date(now.getTime() - (days - 1) * dayMs).toISOString().slice(0, 10);
  const startIso = new Date(now.getTime() - (days - 1) * dayMs).toISOString();
  const prevEndDateOnly = new Date(now.getTime() - days * dayMs).toISOString().slice(0, 10);
  const prevStartDateOnly = new Date(now.getTime() - (2 * days - 1) * dayMs).toISOString().slice(0, 10);
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

// ─── ① 활동이 활발한 기업 TOP N (공시+뉴스+내부자매수 건수 합산, 스코어링 미사용) ──
//
// 2026-07-11: top30_daily.final_score(가중치 스코어링) 기반 정렬 → 기간 내
// 공시+뉴스+내부자매수 "건수" 기반 정렬로 교체. "가장 활동이 많았던 기업"이라는
// 객관적 사실만 반영하고, 어떤 기업이 "성장 유망주인지" 평가하지 않는다.

export interface BriefCompany {
  ticker: string;
  name: string;
  activityCount: number;
  descriptions: string[];
}

// 현재 기간은 자연스러운 상한이 없으므로(미래 데이터가 없어 사실상 "지금까지")
// 내일 00시를 배타적 상한으로 써서 오늘 자정 이후 수집분까지 전부 포함한다.
function unboundedEndIso(): string {
  return new Date(Date.now() + 86_400_000).toISOString();
}

export async function fetchTopCompanies(supabase: Supabase, range: BriefRange, limit: number): Promise<BriefCompany[]> {
  const counts = await fetchActivityCountsAndFacts(supabase, range.startIso, unboundedEndIso());
  const sorted = [...counts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, limit);
  if (sorted.length === 0) return [];

  const nameMap = await fetchNameMap(supabase, sorted.map(([t]) => t));

  return sorted.map(([ticker, v]) => ({
    ticker,
    name: nameMap.get(ticker) ?? ticker,
    activityCount: v.count,
    descriptions: factsToDescriptions(v, 4),
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

// ─── ④ 신규 관측 / ⑤ 지난 기간 대비 변화 (활동 건수 이번 구간 vs 직전 구간) ──
//
// 2026-07-11: top30_daily.rank(가중치 스코어링 순위) 비교 → 활동 건수(공시+뉴스+
// 내부자매수) 비교로 교체. "N위→M위" 같은 순위 변화 표기를 없애고 "N건→M건"
// 실제 건수 변화만 보여준다.

export interface ActivityMoverItem {
  ticker: string;
  name: string;
  prevCount: number;
  currCount: number;
  delta: number;
}

export interface PeriodComparison {
  totalActiveCount: number;
  newEntrants: BriefCompany[];
  dropped: { ticker: string; name: string }[];
  movers: ActivityMoverItem[];
}

export async function fetchPeriodComparison(supabase: Supabase, range: BriefRange): Promise<PeriodComparison> {
  // days=1(rolling) 구간은 range.prevStartIso/prevEndIso에 이미 정확한 ISO 경계가
  // 들어있으므로 그대로 쓴다. days=7/30 등은 date-only 필드로부터 자정 기준
  // 경계를 재구성하는 기존 방식을 그대로 유지한다.
  const prevStartIso = range.prevStartIso ?? `${range.prevStartDateOnly}T00:00:00.000Z`;
  const prevEndExclusiveIso = range.prevEndIso ?? new Date(
    new Date(`${range.prevEndDateOnly}T00:00:00.000Z`).getTime() + 86_400_000
  ).toISOString();

  const [currCounts, prevCounts] = await Promise.all([
    fetchActivityCountsAndFacts(supabase, range.startIso, unboundedEndIso()),
    fetchActivityCountsAndFacts(supabase, prevStartIso, prevEndExclusiveIso),
  ]);

  const currSet = new Set(currCounts.keys());
  const prevSet = new Set(prevCounts.keys());

  const newEntrantTickers = [...currSet].filter((t) => !prevSet.has(t))
    .sort((a, b) => currCounts.get(b)!.count - currCounts.get(a)!.count);
  const droppedTickers = [...prevSet].filter((t) => !currSet.has(t))
    .sort((a, b) => prevCounts.get(b)!.count - prevCounts.get(a)!.count);

  const movers: ActivityMoverItem[] = [...currSet]
    .filter((t) => prevSet.has(t))
    .map((t) => {
      const currCount = currCounts.get(t)!.count;
      const prevCount = prevCounts.get(t)!.count;
      return { ticker: t, name: t, prevCount, currCount, delta: currCount - prevCount };
    })
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  const allNames = [...newEntrantTickers.slice(0, 10), ...droppedTickers.slice(0, 5), ...movers.map((m) => m.ticker)];
  const nameMap = await fetchNameMap(supabase, allNames);

  return {
    totalActiveCount: currSet.size,
    newEntrants: newEntrantTickers.slice(0, 10).map((t) => ({
      ticker: t,
      name: nameMap.get(t) ?? t,
      activityCount: currCounts.get(t)!.count,
      descriptions: factsToDescriptions(currCounts.get(t)!, 2),
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

// 2026-07-11: top30_daily.reason_tags(스코어링 태그) 집계 → filings.event_type
// (공시에 실제 기록된 분류) + 내부자 매수 건수 집계로 교체. 스코어링 미사용.
export async function fetchTagLeaders(supabase: Supabase, range: BriefRange, limit: number): Promise<TagLeader[]> {
  const [{ data: filingRows }, { data: insiderRows }] = await Promise.all([
    supabase.from("filings").select("event_type")
      .gte("filed_at", range.startIso).not("event_type", "is", null).limit(5000),
    supabase.from("insider_trades").select("ticker")
      .eq("transaction_type", "buy").gte("filed_at", range.startIso).limit(5000),
  ]);

  const counts = new Map<string, number>();
  for (const row of filingRows ?? []) {
    const label = EVENT_TYPE_KR[row.event_type as string];
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if ((insiderRows ?? []).length > 0) {
    counts.set("내부자 매수 공시", (insiderRows ?? []).length);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
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

- 가장 활동이 많았던 기업: ${params.top1Name}
- 신규로 활동이 확인된 기업: ${params.newEntrantCount}건
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
- "TOP10", "TOP30", "N위"(순위 표기), 순위, 랭킹, 선정, "~에 진입/편입" 같은
  순위·선정 뉘앙스 표현 금지 — 위 수치는 어디까지나 건수이며, 순위나 선정
  결과가 아니다. 이 목록은 예시일 뿐이니 이와 비슷한 순위·랭킹을 암시하는
  표현은 어떤 형태로든 절대 쓰지 말고, 처음부터 순위 없는 중립 표현으로만
  서술할 것
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
    const raw = json?.content?.[0]?.text?.trim();
    if (!raw) return null;
    // 프롬프트의 "TOP10/TOP30/N위 금지" 지시를 모델이 어길 경우를 대비한 안전장치.
    const text = neutralizeRankLanguage(raw);
    return text.length > 0 ? text : null;
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
  movers: ActivityMoverItem[];
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
