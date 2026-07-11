import { createAdminClient } from "@/lib/supabase/admin";
import { SCREENER_WEIGHTS, type FactorLog } from "@/lib/scoring/weights";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type ScoredMetadata = {
  smart: number;
  earnings: number;
  events: number;
  market: number;
  news: number;
  discoveryBonus: number;
  filingCount: number;
  dedupFilingCount: number;
  newsCount: number;
  dedupNewsCount: number;
  sectorPenalty: boolean;
  insiderAmount: number | null;
  shortDecrease: boolean;
  targetUp: boolean;
  beatStreak4: boolean;
};

export type ScoredTicker = {
  ticker: string;
  sector: string | null;
  smartScore: number;
  earningsScore: number;
  eventsScore: number;
  marketScore: number;
  newsScore: number;
  discoveryBonus: number;
  finalScore: number;
  reasonTags: string[];
  metadata: ScoredMetadata;
  factorLog: FactorLog;
};

// ─── 가중치 ───────────────────────────────────────────────────────────────────
// 가중치 구조(13개 활성 팩터, 합계 96% + 보류 4%)는 src/lib/scoring/weights.ts에서
// 관리한다. 아래 computeFinalScore()는 종목별 동적 정규화 — 그 종목에서 실제로 값이
// 존재하는(non-null) 활성 팩터만 분자·분모에 넣는다.

// factorLog의 활성 팩터 중 값이 있는(non-null) 것만 SCREENER_WEIGHTS로 가중합산한 뒤,
// 그 종목에 참여한 팩터들의 가중치 합으로 나눠 정규화한다(상대 내부 점수 — 팩터 raw가
// 0~10 범위를 넘을 수 있어 결과가 100을 초과할 수 있음. 절대값이 아닌 종목 간 비교용).
// - 기존 8개 신호 팩터는 데이터가 없어도 숫자 0을 넣으므로 항상 분모에 남는다.
// - 신규 재무 4팩터·analyst는 데이터가 없으면 null → 그 종목 한정으로 분자·분모에서
//   제외된다(0점 페널티가 아님). 데이터가 쌓이면 코드 변경 없이 자동 편입된다.
function computeFinalScore(factorLog: FactorLog): number {
  let weightedSum = 0;
  let participatingWeight = 0;
  for (const [factor, config] of Object.entries(SCREENER_WEIGHTS)) {
    if (!config.active) continue;
    const raw = factorLog[factor as keyof FactorLog];
    if (raw == null) continue; // 종목별 동적 정규화: null(데이터 없음) 팩터는 제외
    weightedSum += raw * config.weight;
    participatingWeight += config.weight;
  }
  return participatingWeight > 0 ? (weightedSum / participatingWeight) * 100 : 0;
}

export const TAG_LABELS_KR: Record<string, string> = {
  fda_approval:      "FDA승인",
  contract:          "대형계약",
  buyback:           "자사주매입",
  ma:                "M&A",
  dividend_increase: "배당증가",
  dividend:          "배당공시",
  ceo_change:        "CEO변경",
  cfo_change:        "CFO변경",
  guidance:          "가이던스공시",
  lawsuit:           "소송",
  offering:          "유상증자",
  sec_investigation: "SEC조사",
  bankruptcy:        "파산",
  analyst_bullish:   "애널의견긍정",
  analyst_bearish:   "애널의견부정",
  insider_buy:       "내부자취득",
  insider_buy_large: "내부자대규모취득",
  "13f_new":         "기관신규편입",
  "13f_increase":    "기관보유증가",
  short_decrease:    "공매도감소",
  target_up:         "목표가상향",
  eps_beat:          "EPS상회",
  revenue_beat:      "매출상회",
  both_beat:         "실적상회",
  beat_streak_4:     "4분기연속상회",
  guidance_up:       "가이던스상향",
  guidance_down:     "가이던스하향",
  price_up_20:       "30일+20%",
  price_up_10:       "30일+10%",
  volume_spike:      "거래량급증",
  volatility_spike:  "변동성급증",
};

// 기업이벤트(filing, 12%) 팩터의 event_type별 가중치.
// 2026-07-11: classify-filings가 분류하는 15종 중 그동안 9종만 배점돼 있었다.
// cfo_change/guidance/dividend/lawsuit 4종을 추가 배분한다(CLAUDE.md 2항 핵심
// 예시인 CFO 교체·가이던스 변경 포함). earnings/other 2종은 의도적으로 제외한다:
//   - earnings: 실적 팩터(EPS/매출 Beat·streak·가이던스)와 완전 중복 — 8-K는 래퍼일 뿐
//   - other: 방향성 없는 catch-all — 배점 시 "공시 건수 보상"이 되어 5d724c0에서
//     제거한 volume 보너스가 부활함
const EVENT_WEIGHTS: Record<string, number> = {
  fda_approval:       10,
  contract:            9,
  buyback:             9,
  ma:                  8,
  dividend_increase:   6,
  ceo_change:          5,
  cfo_change:          4,
  guidance:            3,  // 무방향 "가이던스 활동" 신호. 방향성(up/down)은 실적 팩터에서 별도 반영
  dividend:            3,  // 일반 배당 이벤트(인상 아님) — dividend_increase(+6)보다 낮게
  lawsuit:            -4,
  offering:           -5,
  sec_investigation:  -8,
  bankruptcy:         -10,
};

// News Credibility(5%) 출처 신뢰도 티어
const SOURCE_TIER1 = ["sec", "reuters", "bloomberg"];
const SOURCE_TIER2 = ["wsj", "wall street journal", "cnbc", "ap", "associated press", "financial times"];
const SOURCE_TIER3 = ["yahoo", "marketwatch", "barron"];
const SOURCE_TIER4 = ["motley fool", "investorplace", "seeking alpha", "benzinga", "zacks"];

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function daysSince(dateStr: string, todayMs: number): number {
  return Math.floor(
    (todayMs - new Date(dateStr.slice(0, 10) + "T00:00:00Z").getTime()) / 86_400_000
  );
}

// Smart Money — 내부자 매수 30일 완만 선형 감쇠 (13F는 분기 스냅샷이라 감쇠 없음)
function decaySmart30(daysAgo: number): number {
  if (daysAgo <= 0) return 1;
  if (daysAgo >= 30) return 0;
  return 1 - daysAgo / 30;
}

// Corporate Events — 7일 이내 급감
function decayEvents7(daysAgo: number): number {
  if (daysAgo <= 0) return 1.0;
  if (daysAgo === 1) return 0.5;
  if (daysAgo === 2) return 0.25;
  if (daysAgo <= 4) return 0.1;
  if (daysAgo <= 7) return 0.03;
  return 0;
}

// Market / News Credibility — 3~7일 빠른 감쇠
function decayRapid(daysAgo: number): number {
  if (daysAgo <= 0) return 1.0;
  if (daysAgo <= 2) return 0.6;
  if (daysAgo <= 4) return 0.3;
  if (daysAgo <= 7) return 0.1;
  return 0;
}

// Earnings Quality — 발표일→다음 발표 예정일 선형 감쇠 (없으면 90일)
function decayEarnings(daysSinceReport: number, windowDays: number): number {
  if (daysSinceReport <= 0) return 1;
  if (daysSinceReport >= windowDays) return 0;
  return 1 - daysSinceReport / windowDays;
}

function dedupFactor(n: number): number {
  return n === 1 ? 1.0 : n === 2 ? 0.7 : 0.4;
}

function normalizeHeadline(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9가-힣 ]/g, "").trim().slice(0, 30);
}

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function sourceTierScore(source: string | null): number {
  if (!source) return 0;
  const s = source.toLowerCase();
  if (SOURCE_TIER1.some((k) => s.includes(k))) return 2;
  if (SOURCE_TIER2.some((k) => s.includes(k))) return 1;
  if (SOURCE_TIER3.some((k) => s.includes(k))) return 0;
  if (SOURCE_TIER4.some((k) => s.includes(k))) return -1;
  return 0; // 미분류 출처는 가점 없이 제외
}

function isBeat(row: { actual_eps: number | null; eps_estimate: number | null; actual_revenue: number | null; revenue_estimate: number | null }): boolean {
  const epsBeat = row.actual_eps != null && row.eps_estimate != null && row.actual_eps > row.eps_estimate;
  const revBeat = row.actual_revenue != null && row.revenue_estimate != null && row.actual_revenue > row.revenue_estimate;
  return epsBeat || revBeat;
}

// analyst(8%) — 의견 분포를 평균 등급으로 환산. 최신 1건, 최소 3명 커버리지 요구.
// meanRating ∈ [-2,2] → ×5 로 [-10,10] raw(target=5 등과 같은 스케일대). 미달 시 null(제외).
function analystRawScore(
  row: { strong_buy: number | null; buy: number | null; hold: number | null; sell: number | null; strong_sell: number | null } | undefined
): number | null {
  if (!row) return null;
  const sb = row.strong_buy ?? 0, b = row.buy ?? 0, h = row.hold ?? 0, s = row.sell ?? 0, ss = row.strong_sell ?? 0;
  const total = sb + b + h + s + ss;
  if (total < 3) return null; // 커버리지 부족 → 이 종목 분자·분모에서 제외
  return ((sb * 2 + b * 1 - s * 1 - ss * 2) / total) * 5;
}

// 매출/EPS 성장률(YoY, %) → 티어 점수. financial_metrics에 이미 % 로 계산·저장돼 있음.
// 극단 outlier(EPS성장 수백 %)는 티어 상한(+8)/하한(-3)으로 자연 캡. 데이터 없으면 null.
function growthTier(pct: number | null | undefined): number | null {
  if (pct == null) return null;
  if (pct >= 25) return 8;
  if (pct >= 10) return 5;
  if (pct >= 0) return 2;
  return -3;
}

// FCF — 가능하면 FCF마진(fcf/revenue) 티어, 매출 정보 없으면 부호만. fcf null이면 제외.
function fcfRawScore(fcf: number | null | undefined, revenue: number | null | undefined): number | null {
  if (fcf == null) return null;
  if (revenue != null && revenue > 0) {
    const margin = fcf / revenue;
    if (margin >= 0.15) return 6;
    if (margin >= 0.05) return 4;
    if (margin > 0) return 2;
    return -3;
  }
  return fcf > 0 ? 2 : -3;
}

// ROIC/ROE — FMP key-metrics는 소수(0.15=15%)·분기값(실측: roic p50 0.011, p90 0.047).
// tiny denominator로 생기는 이상치(roic |값|>1, roe |값|>2)는 잡음이라 배제하고 폴백.
// 둘 다 없거나 모두 이상치면 null(제외).
function roicRawScore(roic: number | null | undefined, roe: number | null | undefined): number | null {
  const pick =
    roic != null && Math.abs(roic) <= 1 ? roic :
    roe != null && Math.abs(roe) <= 2 ? roe :
    null;
  if (pick == null) return null;
  if (pick >= 0.04) return 6;
  if (pick >= 0.02) return 4;
  if (pick >= 0.01) return 2;
  if (pick >= 0) return 0;
  return -2;
}

// ─── 스코어링 함수 ────────────────────────────────────────────────────────────

export async function computeScores(): Promise<ScoredTicker[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const todayMs = now.getTime();
  const todayStr = now.toISOString().slice(0, 10);

  const d14 = new Date(todayMs - 14 * 86_400_000).toISOString();
  const d30 = new Date(todayMs - 30 * 86_400_000).toISOString().slice(0, 10);

  const currentQ = (() => {
    const q = Math.floor(now.getUTCMonth() / 3) + 1;
    return `${now.getUTCFullYear()}Q${q}`;
  })();
  const prevQ = (() => {
    const q = Math.floor(now.getUTCMonth() / 3) + 1;
    if (q === 1) return `${now.getUTCFullYear() - 1}Q4`;
    return `${now.getUTCFullYear()}Q${q - 1}`;
  })();

  // Phase 1 — 병렬 쿼리
  const [
    filingsRes, newsRes, insiderRes, holdingsRes,
    earningsRes, upcomingEarningsRes, tickersRes, callsRes, shortInterestRes, priceTargetRes,
  ] = await Promise.all([
    admin.from("filings")
      .select("ticker, form_type, event_type, filed_at")
      .gte("filed_at", d14).limit(2000),
    admin.from("news")
      .select("ticker, published_at, headline, source")
      .gte("published_at", d14).not("ticker", "is", null).limit(3000),
    admin.from("insider_trades")
      .select("ticker, shares, price, transaction_date")
      .eq("transaction_type", "buy").gte("transaction_date", d30).limit(1500),
    admin.from("institutional_holdings")
      .select("ticker, institution_name, quarter, shares, value")
      .in("quarter", [currentQ, prevQ]).limit(2000),
    admin.from("earnings")
      .select("ticker, actual_eps, eps_estimate, actual_revenue, revenue_estimate, report_date")
      .not("actual_eps", "is", null)
      .order("report_date", { ascending: false }).limit(6000),
    admin.from("earnings")
      .select("ticker, report_date")
      .is("actual_eps", null).gte("report_date", todayStr)
      .order("report_date", { ascending: true }).limit(3000),
    admin.from("tickers")
      .select("ticker, sector").limit(2000),
    admin.from("earnings_calls")
      .select("ticker, guidance_direction, management_tone").limit(1000),
    admin.from("short_interest")
      .select("ticker, short_float, collected_at")
      .order("collected_at", { ascending: false }).limit(2000),
    admin.from("price_targets")
      .select("ticker, price_target, published_date")
      .gte("published_date", d30)
      .order("published_date", { ascending: false }).limit(2000),
  ]);

  // ── 전처리 ──────────────────────────────────────────────────────────────────

  type FilingRow = { ticker: string; form_type: string; event_type: string | null; filed_at: string };
  const filingsByTicker = new Map<string, FilingRow[]>();
  for (const f of (filingsRes.data ?? []) as FilingRow[]) {
    const arr = filingsByTicker.get(f.ticker) ?? [];
    arr.push(f);
    filingsByTicker.set(f.ticker, arr);
  }

  type NewsRow = { ticker: string | null; published_at: string; headline: string; source: string | null };
  const newsByTicker = new Map<string, NewsRow[]>();
  for (const n of (newsRes.data ?? []) as NewsRow[]) {
    if (!n.ticker) continue;
    const arr = newsByTicker.get(n.ticker) ?? [];
    arr.push(n);
    newsByTicker.set(n.ticker, arr);
  }

  type InsiderRow = { ticker: string; shares: number | null; price: number | null; transaction_date: string | null };
  const insiderByTicker = new Map<string, InsiderRow[]>();
  for (const t of (insiderRes.data ?? []) as InsiderRow[]) {
    const arr = insiderByTicker.get(t.ticker) ?? [];
    arr.push(t);
    insiderByTicker.set(t.ticker, arr);
  }

  type InstData = { shares: number | null; value: number | null };
  const holdingsCurr = new Map<string, Map<string, InstData>>();
  const holdingsPrev = new Map<string, Map<string, InstData>>();
  type HoldingRow = {
    ticker: string; institution_name: string | null;
    quarter: string | null; shares: number | null; value: number | null;
  };
  for (const h of (holdingsRes.data ?? []) as HoldingRow[]) {
    if (!h.institution_name) continue;
    const dest = h.quarter === currentQ ? holdingsCurr : h.quarter === prevQ ? holdingsPrev : null;
    if (!dest) continue;
    const m = dest.get(h.ticker) ?? new Map<string, InstData>();
    m.set(h.institution_name, { shares: h.shares, value: h.value });
    dest.set(h.ticker, m);
  }

  type EarningsRow = {
    ticker: string; actual_eps: number | null; eps_estimate: number | null;
    actual_revenue: number | null; revenue_estimate: number | null; report_date: string;
  };
  // 티커당 report_date desc 순서로 여러 분기 보관 (4분기 연속 Beat 판정용)
  const earningsByTicker = new Map<string, EarningsRow[]>();
  for (const e of (earningsRes.data ?? []) as EarningsRow[]) {
    const arr = earningsByTicker.get(e.ticker) ?? [];
    arr.push(e);
    earningsByTicker.set(e.ticker, arr);
  }

  // 티커당 가장 이른 "다음 실적 발표 예정일" (없으면 90일 기준으로 폴백)
  type UpcomingRow = { ticker: string; report_date: string };
  const nextReportByTicker = new Map<string, string>();
  for (const u of (upcomingEarningsRes.data ?? []) as UpcomingRow[]) {
    if (!nextReportByTicker.has(u.ticker)) nextReportByTicker.set(u.ticker, u.report_date);
  }

  const sectorByTicker = new Map<string, string | null>();
  for (const t of (tickersRes.data ?? []) as { ticker: string; sector: string | null }[]) {
    sectorByTicker.set(t.ticker, t.sector ?? null);
  }

  type EarningsCallRow = { ticker: string; guidance_direction: string | null; management_tone: string | null };
  const earningsCallsByTicker = new Map<string, EarningsCallRow>();
  for (const c of (callsRes.data ?? []) as EarningsCallRow[]) {
    if (!earningsCallsByTicker.has(c.ticker)) earningsCallsByTicker.set(c.ticker, c);
  }

  type ShortInterestRow = { ticker: string; short_float: number | null; collected_at: string };
  const shortInterestByTicker = new Map<string, ShortInterestRow[]>();
  for (const s of (shortInterestRes.data ?? []) as ShortInterestRow[]) {
    const arr = shortInterestByTicker.get(s.ticker) ?? [];
    if (arr.length < 2) { arr.push(s); shortInterestByTicker.set(s.ticker, arr); }
  }

  type PriceTargetRow = { ticker: string; price_target: number | null; published_date: string | null };
  const priceTargetsByTicker = new Map<string, PriceTargetRow[]>();
  for (const pt of (priceTargetRes.data ?? []) as PriceTargetRow[]) {
    const arr = priceTargetsByTicker.get(pt.ticker) ?? [];
    if (arr.length < 2) { arr.push(pt); priceTargetsByTicker.set(pt.ticker, arr); }
  }

  const allCandidates = new Set([
    ...filingsByTicker.keys(),
    ...newsByTicker.keys(),
    ...insiderByTicker.keys(),
    ...holdingsCurr.keys(),
    ...earningsByTicker.keys(),
    ...earningsCallsByTicker.keys(),
  ]);

  if (allCandidates.size === 0) return [];

  // Phase 2 — stock_prices (페이지네이션)
  type PriceRow = { ticker: string; date: string; close: number; volume: number | null; change_pct: number | null };
  const pricesByTicker = new Map<string, PriceRow[]>();
  {
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data } = await admin
        .from("stock_prices")
        .select("ticker, date, close, volume, change_pct")
        .in("ticker", Array.from(allCandidates))
        .gte("date", d30)
        .order("ticker", { ascending: true })
        .order("date",   { ascending: true })
        .range(from, from + PAGE - 1);
      if (!data || data.length === 0) break;
      for (const p of data as PriceRow[]) {
        const arr = pricesByTicker.get(p.ticker) ?? [];
        arr.push(p);
        pricesByTicker.set(p.ticker, arr);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  // ── 자격 필터(eligibility filter) ────────────────────────────────────────────
  // 저가·마이크로캡·비메인보드(OTC 등) 종목은 소액 내부자 매수만으로도 Smart
  // Money 점수가 쉽게 올라가 TOP30 스코어링에서 구조적으로 유리해지는 편향이
  // 있다(예: CUEN — 종가 $0.48, 시총 약 $98만이 스마트머니 점수로 TOP30 1위
  // 진입). 4영역(Event/SmartMoney/Earnings/Market) 가중치 로직 자체는 건드리지
  // 않고, 후보 풀 진입 단계에서만 아래 3개 조건을 모두 만족하는 종목만 남긴다.
  // 통과 개수가 30 미만이어도 top30.ts의 slice(0, 30)이 있는 그대로 잘라 쓰므로
  // 억지로 채우지 않는다.
  const ELIGIBILITY_MIN_PRICE = 2;
  const ELIGIBILITY_MIN_MARKET_CAP = 300_000_000;
  const ELIGIBILITY_EXCHANGES = new Set(["nasdaq", "nyse"]);
  // 우선주(-PA/-PB…)·워런트(-WT)·유닛(-U)·권리(-R/-RT) 등 파생·비보통주 심볼 제외.
  // 이들은 공시·뉴스가 모회사 보통주 CIK로 잡혀 후보에 거의 안 들지만, 내부자 신고
  // 등으로 조용히 낄 수 있어 후보 단계에서 명시적으로 배제한다(seed-financials.ts와 동일 규칙).
  const NON_COMMON_STOCK = /-(WT[A-Z]?|U|R|RT|P[A-Z]?)$/;

  const { data: eligMetaRows } = await admin
    .from("tickers")
    .select("ticker, market_cap, exchange")
    .in("ticker", Array.from(allCandidates));

  const marketCapByTicker = new Map<string, number | null>();
  const exchangeByTicker = new Map<string, string | null>();
  for (const t of (eligMetaRows ?? []) as { ticker: string; market_cap: number | null; exchange: string | null }[]) {
    marketCapByTicker.set(t.ticker, t.market_cap);
    exchangeByTicker.set(t.ticker, t.exchange);
  }

  let priceExcluded = 0, capExcluded = 0, exchangeExcluded = 0, nonCommonExcluded = 0;
  const eligibleCandidates = new Set<string>();
  for (const ticker of allCandidates) {
    if (NON_COMMON_STOCK.test(ticker)) { nonCommonExcluded++; continue; }

    const tickerPrices = pricesByTicker.get(ticker) ?? [];
    const latestClose = tickerPrices.length > 0 ? tickerPrices[tickerPrices.length - 1].close : null;
    const marketCap = marketCapByTicker.get(ticker) ?? null;
    const exchange = exchangeByTicker.get(ticker) ?? null;

    const priceOk = latestClose != null && latestClose >= ELIGIBILITY_MIN_PRICE;
    const capOk = marketCap != null && marketCap >= ELIGIBILITY_MIN_MARKET_CAP;
    const exchangeOk = exchange != null && ELIGIBILITY_EXCHANGES.has(exchange.toLowerCase());

    if (!priceOk) priceExcluded++;
    if (!capOk) capExcluded++;
    if (!exchangeOk) exchangeExcluded++;

    if (priceOk && capOk && exchangeOk) eligibleCandidates.add(ticker);
  }

  console.log(
    `[collect/scoring] 자격 필터(가격≥$${ELIGIBILITY_MIN_PRICE}/시총≥$${ELIGIBILITY_MIN_MARKET_CAP.toLocaleString("en-US")}/NASDAQ·NYSE/보통주): ` +
    `${allCandidates.size}개 후보 → ${eligibleCandidates.size}개 통과 ` +
    `(비보통주 제외 ${nonCommonExcluded} / 가격 미달 ${priceExcluded} / 시총 미달 ${capExcluded} / 거래소 제외 ${exchangeExcluded} — 한 종목이 여러 조건에 동시에 걸릴 수 있어 합계가 실제 제외 수보다 클 수 있음)`
  );

  // ── analyst_ratings · financial_metrics 조회 (자격 통과 종목만) ──────────────
  // stock_prices/eligMeta와 동일하게 candidate 목록으로 좁혀 조회한다(전체 4,883
  // 종목·수만 행을 끌어오지 않음). 종목별 최신 1건만 남긴다.
  const eligibleList = Array.from(eligibleCandidates);

  type AnalystRow = { ticker: string; period: string | null; strong_buy: number | null; buy: number | null; hold: number | null; sell: number | null; strong_sell: number | null };
  const analystByTicker = new Map<string, AnalystRow>();
  type FinancialRow = { ticker: string; period_end: string; revenue: number | null; revenue_growth_yoy: number | null; eps_growth_yoy: number | null; fcf: number | null; roic: number | null; roe: number | null };
  const financialByTicker = new Map<string, FinancialRow>();

  if (eligibleList.length > 0) {
    // 종목당 여러 period가 있어 period desc로 받아 첫 등장(=최신)만 보관.
    for (let i = 0; i < eligibleList.length; i += 300) {
      const chunk = eligibleList.slice(i, i + 300);
      const [{ data: aRows }, { data: fRows }] = await Promise.all([
        admin.from("analyst_ratings")
          .select("ticker, period, strong_buy, buy, hold, sell, strong_sell")
          .in("ticker", chunk)
          .order("period", { ascending: false }),
        admin.from("financial_metrics")
          .select("ticker, period_end, revenue, revenue_growth_yoy, eps_growth_yoy, fcf, roic, roe")
          .eq("period_type", "quarter")
          .in("ticker", chunk)
          .order("period_end", { ascending: false }),
      ]);
      for (const r of (aRows ?? []) as AnalystRow[]) {
        if (!analystByTicker.has(r.ticker)) analystByTicker.set(r.ticker, r);
      }
      for (const r of (fRows ?? []) as FinancialRow[]) {
        if (!financialByTicker.has(r.ticker)) financialByTicker.set(r.ticker, r);
      }
    }
  }

  // ── 스코어링 루프 ────────────────────────────────────────────────────────────

  const scored: ScoredTicker[] = [];

  for (const ticker of eligibleCandidates) {
    const filings   = filingsByTicker.get(ticker)     ?? [];
    const newsItems = newsByTicker.get(ticker)         ?? [];
    const insiders  = insiderByTicker.get(ticker)      ?? [];
    const currHold  = holdingsCurr.get(ticker)         ?? new Map<string, InstData>();
    const prevHold  = holdingsPrev.get(ticker)         ?? new Map<string, InstData>();
    const quarters  = earningsByTicker.get(ticker)     ?? [];
    const earnData  = quarters[0];
    const callData  = earningsCallsByTicker.get(ticker);
    const siRows    = shortInterestByTicker.get(ticker) ?? [];
    const ptRows    = priceTargetsByTicker.get(ticker)  ?? [];
    const prices    = pricesByTicker.get(ticker)        ?? [];
    const sector    = sectorByTicker.get(ticker)        ?? null;
    const tags      = new Set<string>();

    // ── Smart Money 계열 — 구 스코어링의 "Smart Money(45%)"를 institution/insider/
    // target/short 4개 팩터로 세분화 (신호 계산 로직·감쇠·태그는 그대로 유지) ────

    // 내부자거래 (10%) — 30일 완만 선형 감쇠
    let insiderRaw = 0;
    let insiderAmount: number | null = null;
    for (const t of insiders) {
      if (!t.transaction_date) continue;
      const dAgo = daysSince(t.transaction_date, todayMs);
      const decayed = decaySmart30(dAgo);
      if (decayed <= 0) continue;
      insiderRaw += 6 * decayed;
      tags.add("insider_buy");
      const amt = t.shares && t.price ? t.shares * t.price : 0;
      if (amt > 0) insiderAmount = (insiderAmount ?? 0) + amt;
      if (amt >= 1_000_000) { insiderRaw += 3 * decayed; tags.add("insider_buy_large"); }
    }

    // 기관수급(13F) (15%) — 분기 스냅샷이라 감쇠 없음
    let institutionRaw = 0;
    let newInstCount = 0;
    for (const instName of currHold.keys()) {
      if (!prevHold.has(instName)) newInstCount++;
    }
    if (newInstCount > 0) {
      institutionRaw += Math.min(newInstCount * 5, 12); // 건당 +5, 기관 수 무관 최대 +12 캡
      tags.add("13f_new");
    }

    let has13fInc = false;
    for (const [instName, cData] of currHold) {
      const pData = prevHold.get(instName);
      if (!pData) continue;
      const cVal = cData.shares ?? cData.value;
      const pVal = pData.shares ?? pData.value;
      if (cVal !== null && pVal !== null && cVal > pVal) { has13fInc = true; break; }
    }
    if (has13fInc) { institutionRaw += 3; tags.add("13f_increase"); }

    // 공매도변화 (5%)
    const shortDecrease = siRows.length >= 2 &&
      siRows[0].short_float != null && siRows[1].short_float != null &&
      siRows[0].short_float < siRows[1].short_float;
    const shortRaw = shortDecrease ? 4 : 0;
    if (shortDecrease) tags.add("short_decrease");

    // 목표주가변화 (9%)
    const targetUp = ptRows.length >= 2 &&
      ptRows[0].price_target != null && ptRows[1].price_target != null &&
      ptRows[0].price_target > ptRows[1].price_target;
    const targetRaw = targetUp ? 5 : 0;
    if (targetUp) tags.add("target_up");

    // smart_score(DB 하위호환 컬럼) = 4개 팩터 합계 — 구 smartRaw와 동일한 값
    const smartScore = insiderRaw + institutionRaw + shortRaw + targetRaw;

    // ── 실적·가이던스 (18%) — 발표일→다음 발표예정일 선형감쇠(없으면 90일) ──
    let earningsRaw = 0;
    if (earnData) {
      const epsBeat = earnData.actual_eps     != null && earnData.eps_estimate     != null && earnData.actual_eps     > earnData.eps_estimate;
      const revBeat = earnData.actual_revenue != null && earnData.revenue_estimate != null && earnData.actual_revenue > earnData.revenue_estimate;
      if (epsBeat && revBeat)      { earningsRaw += 8; tags.add("both_beat"); }
      else if (epsBeat)            { earningsRaw += 5; tags.add("eps_beat"); }
      else if (revBeat)            { earningsRaw += 4; tags.add("revenue_beat"); }
    }
    if (callData?.guidance_direction === "up") {
      earningsRaw += 10;
      tags.add("guidance_up");
    } else if (callData?.guidance_direction === "down") {
      earningsRaw -= 5;
      tags.add("guidance_down");
    }
    if (callData?.management_tone === "positive") earningsRaw += 2;

    const beatStreak4 = quarters.length >= 4 && quarters.slice(0, 4).every(isBeat);
    if (beatStreak4) { earningsRaw += 8; tags.add("beat_streak_4"); }

    let earningsScore = 0;
    if (earnData) {
      const nextReport = nextReportByTicker.get(ticker);
      const windowDays = nextReport
        ? Math.max(1, Math.ceil(
            (new Date(nextReport).getTime() - new Date(earnData.report_date).getTime()) / 86_400_000
          ))
        : 90;
      const daysSinceReport = daysSince(earnData.report_date, todayMs);
      earningsScore = earningsRaw * decayEarnings(daysSinceReport, windowDays);
    }

    // ── 기업이벤트(공시) (12%) — 7일 이내 급감, 뉴스건수/surge 보너스 완전 제거 ─
    const eventFilings = filings.filter((f) => f.event_type != null && EVENT_WEIGHTS[f.event_type] !== undefined);
    const filingGroups = new Map<string, FilingRow[]>();
    for (const f of eventFilings) {
      const key = f.event_type as string;
      const arr = filingGroups.get(key) ?? [];
      arr.push(f);
      filingGroups.set(key, arr);
    }

    let eventsRaw = 0;
    for (const [eventType, group] of filingGroups) {
      const factor = dedupFactor(group.length);
      const w = EVENT_WEIGHTS[eventType];
      for (const f of group) {
        const dAgo = daysSince(f.filed_at, todayMs);
        eventsRaw += w * decayEvents7(dAgo) * factor;
      }
      tags.add(eventType);
    }
    const eventsScore = eventsRaw;
    const dedupFilingCount = filingGroups.size;

    // ── 가격모멘텀 (4%) — 뉴스와 동일(7일) 감쇠, 데이터 신선도 기준 ──────────────
    let marketRaw = 0;
    if (prices.length >= 2) {
      const fc = prices[0].close;
      const lc = prices[prices.length - 1].close;
      const ret = fc > 0 ? ((lc - fc) / fc) * 100 : 0;
      if (ret >= 20)      { marketRaw += 3; tags.add("price_up_20"); }
      else if (ret >= 10) { marketRaw += 2; tags.add("price_up_10"); }
    }
    const vols = prices.map((p) => p.volume ?? 0).filter((v) => v > 0);
    if (vols.length >= 5) {
      const a5v  = avg(vols.slice(-5));
      const a20v = avg(vols.slice(-Math.min(20, vols.length)));
      if (a20v > 0 && a5v > a20v * 2) { marketRaw += 4; tags.add("volume_spike"); }
    }
    const absPcts = prices.filter((p) => p.change_pct != null).map((p) => Math.abs(p.change_pct!));
    if (absPcts.length >= 5) {
      const a5p  = avg(absPcts.slice(-5));
      const a20p = avg(absPcts.slice(-Math.min(20, absPcts.length)));
      if (a20p > 0 && a5p > a20p * 1.5) { marketRaw += 2; tags.add("volatility_spike"); }
    }
    let marketScore = 0;
    if (prices.length > 0) {
      const lastPriceDaysAgo = daysSince(prices[prices.length - 1].date, todayMs);
      marketScore = marketRaw * decayRapid(lastPriceDaysAgo);
    }

    // ── News Credibility (5%) — 뉴스 건수 점수 제거, 출처 신뢰도만, 최대 +5 캡 ──
    const seenH = new Set<string>();
    const uniqueNews: NewsRow[] = [];
    for (const n of newsItems) {
      const k = normalizeHeadline(n.headline);
      if (!seenH.has(k)) { seenH.add(k); uniqueNews.push(n); }
    }

    let newsRaw = 0;
    for (const n of uniqueNews) {
      const dAgo = daysSince(n.published_at, todayMs);
      newsRaw += sourceTierScore(n.source) * decayRapid(dAgo);
    }
    const newsScore = Math.min(newsRaw, 5);

    // ── 애널리스트 의견 (8%) — 최신 1건, 최소 3명 커버리지, 없으면 null(제외) ──
    const analystRaw = analystRawScore(analystByTicker.get(ticker));
    if (analystRaw != null) {
      if (analystRaw >= 5) tags.add("analyst_bullish");        // meanRating ≥ 1.0
      else if (analystRaw <= -2.5) tags.add("analyst_bearish"); // meanRating ≤ -0.5
    }

    // ── 재무 품질 4팩터 — financial_metrics 최신 분기값. 없으면 null(제외) ──────
    const finRow = financialByTicker.get(ticker);
    const revenueGrowthRaw = growthTier(finRow?.revenue_growth_yoy);
    const epsGrowthRaw = growthTier(finRow?.eps_growth_yoy);
    const fcfRaw = fcfRawScore(finRow?.fcf, finRow?.revenue);
    const roicRaw = roicRawScore(finRow?.roic, finRow?.roe);

    // ── Discovery Bonus — 비활성 유지 ───────────────────────────────────────────
    // market_cap 컬럼은 이미 확보돼 자격 필터(위)에서 사용 중이다. 다만 이 보너스는
    // 정규화(computeFinalScore) 바깥에서 더해지는 flat 가산이라, 0~100 정규화·
    // factor_log 기반 모델과 일관되지 않는다. mid-cap 디스커버리 틸트가 필요하면
    // 정규화된 별도 팩터로 설계해야 하며(13→14 팩터 확장 = 별도 승인), 그전까지 0 유지.
    const discoveryBonus = 0;

    // ── 팩터별 기여도 로그 (사용자 비노출, 내부 분석용) ──────────────────────────
    // 재무4·analyst는 데이터 없으면 null — "계산 안 함"(종목별 정규화에서 분자·분모
    // 모두 제외)을 의미하며 0(계산 결과 무영향)과 구분한다.
    const factorLog: FactorLog = {
      earnings: earningsScore,
      institution: institutionRaw,
      insider: insiderRaw,
      target: targetRaw,
      filing: eventsScore,
      news: newsScore,
      short: shortRaw,
      momentum: marketScore,
      analyst: analystRaw,
      revenueGrowth: revenueGrowthRaw,
      epsGrowth: epsGrowthRaw,
      fcf: fcfRaw,
      roic: roicRaw,
    };

    // ── Final Score — 종목별 non-null 활성 팩터만 가중합산·정규화(상대 내부 점수) ──
    const finalScore = computeFinalScore(factorLog) + discoveryBonus;

    scored.push({
      ticker, sector,
      smartScore, earningsScore, eventsScore, marketScore, newsScore, discoveryBonus,
      finalScore,
      reasonTags: Array.from(tags),
      metadata: {
        smart: smartScore, earnings: earningsScore, events: eventsScore,
        market: marketScore, news: newsScore, discoveryBonus,
        filingCount: filings.length, dedupFilingCount,
        newsCount: newsItems.length, dedupNewsCount: uniqueNews.length,
        sectorPenalty: false,
        insiderAmount, shortDecrease, targetUp, beatStreak4,
      },
      factorLog,
    });
  }

  // Sort
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // ── 섹터 다양성 (1~3위 100% / 4위 95% / 5위 90% / 6위 80% / 7위+ 70%) ────────
  const sectorCnt = new Map<string, number>();
  const withDiversity = scored.map((item) => {
    const sec = item.sector ?? "__none__";
    const cnt = (sectorCnt.get(sec) ?? 0) + 1;
    sectorCnt.set(sec, cnt);
    const multiplier =
      cnt <= 3 ? 1.0 :
      cnt === 4 ? 0.95 :
      cnt === 5 ? 0.90 :
      cnt === 6 ? 0.80 :
      0.70;
    if (multiplier < 1.0) {
      return {
        ...item,
        finalScore: item.finalScore * multiplier,
        metadata: { ...item.metadata, sectorPenalty: true },
      };
    }
    return item;
  });
  withDiversity.sort((a, b) => b.finalScore - a.finalScore);

  // finalScore < 0(Offering/SEC Investigation/Bankruptcy 감점 등)인 종목은
  // Top30 선정에서 제외 — 정렬 상태를 유지하므로 상위 슬라이스에 영향 없음
  return withDiversity.filter((item) => item.finalScore >= 0);
}
