import { createAdminClient } from "@/lib/supabase/admin";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type ScoredMetadata = {
  event: number;
  smart: number;
  earnings: number;
  market: number;
  filingCount: number;
  dedupFilingCount: number;
  newsCount: number;
  dedupNewsCount: number;
  decayAvg: number;
  sectorPenalty: boolean;
  insiderAmount: number | null;
  guidanceDirection: string | null;
  shortDecrease: boolean;
  targetUp: boolean;
};

export type ScoredTicker = {
  ticker: string;
  sector: string | null;
  eventScore: number;
  smartScore: number;
  earningsScore: number;
  marketScore: number;
  finalScore: number;
  reasonTags: string[];
  metadata: ScoredMetadata;
};

// ─── 상수 ─────────────────────────────────────────────────────────────────────

export const TAG_LABELS_KR: Record<string, string> = {
  buyback:          "자사주매입",
  ma:               "M&A",
  ceo_change:       "CEO변경",
  cfo_change:       "CFO변경",
  guidance:         "가이던스변경",
  contract:         "대형계약",
  insider_buy:      "내부자취득",
  insider_buy_large:"내부자대규모취득",
  "13f_new":        "기관신규편입",
  "13f_increase":   "기관보유증가",
  eps_beat:         "EPS상회",
  revenue_beat:     "매출상회",
  both_beat:        "실적상회",
  guidance_up:      "가이던스상향",
  price_up_20:      "30일+20%",
  price_up_10:      "30일+10%",
  volume_spike:     "거래량급증",
  volatility_spike: "변동성급증",
  short_decrease:   "공매도감소",
  target_up:        "목표가상향",
};

const ET_WEIGHTS: Record<string, number> = {
  buyback: 9, ma: 9, guidance: 8, ceo_change: 8, cfo_change: 7,
  contract: 6, dividend: 5, earnings: 5, lawsuit: 4, offering: 3, other: 2,
};

const ET_TAGS: ReadonlySet<string> = new Set([
  "buyback", "ma", "guidance", "ceo_change", "cfo_change", "contract",
]);

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function filingWeight(eventType: string | null, formType: string): number {
  if (eventType) return ET_WEIGHTS[eventType] ?? 2;
  if (formType.startsWith("10-K")) return 7;
  if (formType.startsWith("10-Q")) return 5;
  if (formType.startsWith("8-K")) return 6;
  return 2;
}

function decay(dateStr: string, todayMs: number): number {
  const daysAgo = Math.floor(
    (todayMs - new Date(dateStr.slice(0, 10) + "T00:00:00Z").getTime()) / 86_400_000
  );
  if (daysAgo <= 0) return 1.0;
  if (daysAgo === 1) return 0.8;
  if (daysAgo === 2) return 0.6;
  if (daysAgo === 3) return 0.4;
  return 0.2;
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

// ─── 스코어링 함수 ────────────────────────────────────────────────────────────

export async function computeScores(): Promise<ScoredTicker[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const todayMs = now.getTime();

  const d14 = new Date(todayMs - 14 * 86_400_000).toISOString();
  const d7  = new Date(todayMs -  7 * 86_400_000).toISOString().slice(0, 10);
  const d3  = new Date(todayMs -  3 * 86_400_000).toISOString().slice(0, 10);
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
    earningsRes, tickersRes, callsRes, shortInterestRes, priceTargetRes,
  ] = await Promise.all([
    admin.from("filings")
      .select("ticker, form_type, event_type, filed_at")
      .gte("filed_at", d14).limit(2000),
    admin.from("news")
      .select("ticker, published_at, headline")
      .gte("published_at", d14).not("ticker", "is", null).limit(3000),
    admin.from("insider_trades")
      .select("ticker, shares, price, transaction_date")
      .eq("transaction_type", "buy").gte("transaction_date", d7).limit(500),
    admin.from("institutional_holdings")
      .select("ticker, institution_name, quarter, shares, value")
      .in("quarter", [currentQ, prevQ]).limit(2000),
    admin.from("earnings")
      .select("ticker, actual_eps, eps_estimate, actual_revenue, revenue_estimate, report_date")
      .not("actual_eps", "is", null)
      .order("report_date", { ascending: false }).limit(1000),
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

  type NewsRow = { ticker: string | null; published_at: string; headline: string };
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
  const earningsByTicker = new Map<string, EarningsRow>();
  for (const e of (earningsRes.data ?? []) as EarningsRow[]) {
    if (!earningsByTicker.has(e.ticker)) earningsByTicker.set(e.ticker, e);
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

  // ── 스코어링 루프 ────────────────────────────────────────────────────────────

  const scored: ScoredTicker[] = [];

  for (const ticker of allCandidates) {
    const filings   = filingsByTicker.get(ticker)     ?? [];
    const newsItems = newsByTicker.get(ticker)         ?? [];
    const insiders  = insiderByTicker.get(ticker)      ?? [];
    const currHold  = holdingsCurr.get(ticker)         ?? new Map<string, InstData>();
    const prevHold  = holdingsPrev.get(ticker)         ?? new Map<string, InstData>();
    const earnData  = earningsByTicker.get(ticker);
    const callData  = earningsCallsByTicker.get(ticker);
    const siRows    = shortInterestByTicker.get(ticker) ?? [];
    const ptRows    = priceTargetsByTicker.get(ticker)  ?? [];
    const prices    = pricesByTicker.get(ticker)        ?? [];
    const sector    = sectorByTicker.get(ticker)        ?? null;
    const tags      = new Set<string>();

    let totalDecaySum = 0;
    let totalDecayN   = 0;

    // ── Event Score ────────────────────────────────────────────────────────────
    const filingGroups = new Map<string, FilingRow[]>();
    for (const f of filings) {
      const key = f.event_type ?? f.form_type.split("/")[0].split(" ")[0];
      const arr = filingGroups.get(key) ?? [];
      arr.push(f);
      filingGroups.set(key, arr);
    }

    let eventRaw = 0;
    for (const [, group] of filingGroups) {
      const factor = dedupFactor(group.length);
      for (const f of group) {
        const w = filingWeight(f.event_type, f.form_type);
        const d = decay(f.filed_at, todayMs);
        eventRaw += w * d * factor;
        totalDecaySum += d; totalDecayN++;
      }
      const et = group[0].event_type;
      if (et && ET_TAGS.has(et)) tags.add(et);
    }

    const seenH = new Set<string>();
    const uniqueNews: NewsRow[] = [];
    for (const n of newsItems) {
      const k = normalizeHeadline(n.headline);
      if (!seenH.has(k)) { seenH.add(k); uniqueNews.push(n); }
    }

    let newsRaw = 0;
    const recentNewsCount = uniqueNews.filter(n => n.published_at.slice(0, 10) >= d7).length;
    const olderNewsCount  = uniqueNews.filter(n => n.published_at.slice(0, 10) <  d7).length;
    for (const n of uniqueNews) {
      const d = decay(n.published_at, todayMs);
      newsRaw += d;
      totalDecaySum += d; totalDecayN++;
    }
    if (olderNewsCount > 0 && recentNewsCount >= olderNewsCount * 2) newsRaw += 4;

    const eventScore      = eventRaw + newsRaw;
    const dedupFilingCount = filingGroups.size;

    // ── Smart Money Score ──────────────────────────────────────────────────────
    let smartRaw     = 0;
    let insiderAmount: number | null = null;

    const recentBuys = insiders.filter(t => t.transaction_date && t.transaction_date >= d3);
    if (recentBuys.length > 0) {
      smartRaw += 6;
      tags.add("insider_buy");
      const totalAmt = recentBuys.reduce((s, t) =>
        t.shares && t.price ? s + t.shares * t.price : s, 0);
      if (totalAmt > 0) insiderAmount = totalAmt;
      if (totalAmt >= 1_000_000) { smartRaw += 3; tags.add("insider_buy_large"); }
    }

    let has13fNew = false;
    for (const instName of currHold.keys()) {
      if (!prevHold.has(instName)) { has13fNew = true; break; }
    }
    if (has13fNew) { smartRaw += 5; tags.add("13f_new"); }

    let has13fInc = false;
    for (const [instName, cData] of currHold) {
      const pData = prevHold.get(instName);
      if (!pData) continue;
      const cVal = cData.shares ?? cData.value;
      const pVal = pData.shares ?? pData.value;
      if (cVal !== null && pVal !== null && cVal > pVal) { has13fInc = true; break; }
    }
    if (has13fInc) { smartRaw += 3; tags.add("13f_increase"); }

    const shortDecrease = siRows.length >= 2 &&
      siRows[0].short_float != null && siRows[1].short_float != null &&
      siRows[0].short_float < siRows[1].short_float;
    if (shortDecrease) { smartRaw += 4; tags.add("short_decrease"); }

    const targetUp = ptRows.length >= 2 &&
      ptRows[0].price_target != null && ptRows[1].price_target != null &&
      ptRows[0].price_target > ptRows[1].price_target;
    if (targetUp) { smartRaw += 5; tags.add("target_up"); }

    const smartScore = smartRaw;

    // ── Earnings Score ─────────────────────────────────────────────────────────
    let earningsRaw = 0;
    if (callData?.guidance_direction === "up") {
      earningsRaw += 10;
      tags.add("guidance_up");
    }
    if (callData?.management_tone === "positive") earningsRaw += 2;
    if (earnData) {
      const epsBeat = earnData.actual_eps     != null && earnData.eps_estimate     != null && earnData.actual_eps     > earnData.eps_estimate;
      const revBeat = earnData.actual_revenue != null && earnData.revenue_estimate != null && earnData.actual_revenue > earnData.revenue_estimate;
      if (epsBeat && revBeat)      { earningsRaw += 8; tags.add("both_beat"); }
      else if (epsBeat)            { earningsRaw += 5; tags.add("eps_beat"); }
      else if (revBeat)            { earningsRaw += 4; tags.add("revenue_beat"); }
    }
    const chgPcts = prices.filter(p => p.change_pct != null).map(p => p.change_pct!);
    if (chgPcts.length >= 5) {
      const a5  = avg(chgPcts.slice(-5));
      const a10 = avg(chgPcts.slice(-Math.min(10, chgPcts.length)));
      if (a5 > a10) earningsRaw += 3;
    }
    const earningsScore = earningsRaw;

    // ── Market Score ───────────────────────────────────────────────────────────
    let marketRaw = 0;
    if (prices.length >= 2) {
      const fc = prices[0].close;
      const lc = prices[prices.length - 1].close;
      const ret = fc > 0 ? ((lc - fc) / fc) * 100 : 0;
      if (ret >= 20)      { marketRaw += 3; tags.add("price_up_20"); }
      else if (ret >= 10) { marketRaw += 2; tags.add("price_up_10"); }
    }
    const vols = prices.map(p => p.volume ?? 0).filter(v => v > 0);
    if (vols.length >= 5) {
      const a5v  = avg(vols.slice(-5));
      const a20v = avg(vols.slice(-Math.min(20, vols.length)));
      if (a20v > 0 && a5v > a20v * 2) { marketRaw += 4; tags.add("volume_spike"); }
    }
    const absPcts = prices.filter(p => p.change_pct != null).map(p => Math.abs(p.change_pct!));
    if (absPcts.length >= 5) {
      const a5p  = avg(absPcts.slice(-5));
      const a20p = avg(absPcts.slice(-Math.min(20, absPcts.length)));
      if (a20p > 0 && a5p > a20p * 1.5) { marketRaw += 2; tags.add("volatility_spike"); }
    }
    const marketScore = marketRaw;

    // ── Final Score ────────────────────────────────────────────────────────────
    const finalScore = eventScore * 0.4 + smartScore * 0.3 + earningsScore * 0.2 + marketScore * 0.1;

    scored.push({
      ticker, sector,
      eventScore, smartScore, earningsScore, marketScore, finalScore,
      reasonTags: Array.from(tags),
      metadata: {
        event: eventScore, smart: smartScore, earnings: earningsScore, market: marketScore,
        filingCount: filings.length, dedupFilingCount,
        newsCount: newsItems.length, dedupNewsCount: uniqueNews.length,
        decayAvg: totalDecayN > 0 ? totalDecaySum / totalDecayN : 0,
        sectorPenalty: false,
        insiderAmount, guidanceDirection: null, shortDecrease, targetUp,
      },
    });
  }

  // Sort
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // ── 섹터 다양성 ──────────────────────────────────────────────────────────────
  const sectorCnt = new Map<string, number>();
  const withDiversity = scored.map(item => {
    const sec = item.sector ?? "__none__";
    const cnt = (sectorCnt.get(sec) ?? 0) + 1;
    sectorCnt.set(sec, cnt);
    if (cnt > 5) {
      return {
        ...item,
        finalScore: item.finalScore * 0.7,
        metadata: { ...item.metadata, sectorPenalty: true },
      };
    }
    return item;
  });
  withDiversity.sort((a, b) => b.finalScore - a.finalScore);

  return withDiversity;
}
