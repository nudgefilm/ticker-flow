import Link from "next/link";
import { Suspense } from "react";
import {
  IconUsers,
  IconCurrencyDollar,
  IconEye,
  IconTrendingUp,
  IconCircleCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import AdminTriggerButtons from "./trigger-buttons";

export const dynamic = "force-dynamic";

// ─── 스코어링 엔진 ─────────────────────────────────────────────────────────────

type ReasonTag =
  | "buyback" | "ma" | "guidance" | "ceo_change" | "cfo_change" | "contract"
  | "insider_buy" | "insider_buy_large" | "13f_new" | "13f_increase"
  | "eps_beat" | "revenue_beat" | "both_beat" | "guidance_up"
  | "price_up_20" | "price_up_10" | "volume_spike" | "volatility_spike"
  | "short_decrease" | "target_up";

type Metadata = {
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

const TAG_LABELS: Record<ReasonTag, string> = {
  buyback: "자사주매입", ma: "M&A", guidance: "가이던스",
  ceo_change: "CEO교체", cfo_change: "CFO교체", contract: "대형계약",
  insider_buy: "내부자취득", insider_buy_large: "대규모취득",
  "13f_new": "13F신규", "13f_increase": "13F증가",
  eps_beat: "EPS상회", revenue_beat: "매출상회", both_beat: "실적상회",
  guidance_up: "가이던스Up", price_up_20: "30일+20%", price_up_10: "30일+10%",
  volume_spike: "거래량급증", volatility_spike: "변동성급증",
  short_decrease: "공매도↓",
  target_up: "목표가↑",
};

const ET_WEIGHTS: Record<string, number> = {
  buyback: 9, ma: 9, guidance: 8, ceo_change: 8, cfo_change: 7,
  contract: 6, dividend: 5, earnings: 5, lawsuit: 4, offering: 3, other: 2,
};

const ET_TAGS: ReadonlySet<string> = new Set([
  "buyback", "ma", "guidance", "ceo_change", "cfo_change", "contract",
]);

function tagStyle(tag: ReasonTag): string {
  switch (tag) {
    case "ceo_change": case "cfo_change":
    case "eps_beat": case "revenue_beat": case "both_beat":
      return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    case "buyback": case "ma": case "contract":
    case "13f_new": case "13f_increase":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "insider_buy": case "insider_buy_large":
      return "bg-green-500/10 text-green-400 border border-green-500/20";
    case "guidance": case "guidance_up":
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "volume_spike": case "volatility_spike": case "short_decrease":
      return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
    case "target_up":
      return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
    default:
      return "bg-white/[0.06] text-[#a6a6a6] border border-white/[0.08]";
  }
}

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

// ─── 섹션 ──────────────────────────────────────────────────────────────────────

async function AdminWatchSection() {
  const admin = createAdminClient();

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const todayMs = now.getTime();

  const d14 = new Date(todayMs - 14 * 86_400_000).toISOString();
  const d7  = new Date(todayMs -  7 * 86_400_000).toISOString().slice(0, 10);
  const d7Ms = todayMs - 7 * 86_400_000;
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
  const [filingsRes, newsRes, insiderRes, holdingsRes, earningsRes, tickersRes, callsRes, shortInterestRes, priceTargetRes] =
    await Promise.all([
      admin.from("filings")
        .select("ticker, form_type, event_type, filed_at")
        .gte("filed_at", d14)
        .limit(2000),
      admin.from("news")
        .select("ticker, published_at, headline")
        .gte("published_at", d14)
        .not("ticker", "is", null)
        .limit(3000),
      admin.from("insider_trades")
        .select("ticker, transaction_type, shares, price, transaction_date")
        .eq("transaction_type", "buy")
        .gte("transaction_date", d7)
        .limit(500),
      admin.from("institutional_holdings")
        .select("ticker, institution_name, quarter, shares, value")
        .in("quarter", [currentQ, prevQ])
        .limit(2000),
      admin.from("earnings")
        .select("ticker, actual_eps, eps_estimate, actual_revenue, revenue_estimate, report_date")
        .not("actual_eps", "is", null)
        .order("report_date", { ascending: false })
        .limit(1000),
      admin.from("tickers")
        .select("ticker, sector, industry")
        .limit(2000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("earnings_calls")
        .select("ticker, guidance_direction, management_tone")
        .limit(1000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("short_interest")
        .select("ticker, short_float, collected_at")
        .order("collected_at", { ascending: false })
        .limit(2000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from("price_targets")
        .select("ticker, price_target, published_date")
        .gte("published_date", d30)
        .order("published_date", { ascending: false })
        .limit(2000),
    ]);

  // ── 전처리 ────────────────────────────────────────────────────────────────

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
  type HoldingRow = { ticker: string; institution_name: string | null; quarter: string | null; shares: number | null; value: number | null };
  for (const h of (holdingsRes.data ?? []) as HoldingRow[]) {
    if (!h.institution_name) continue;
    const dest = h.quarter === currentQ ? holdingsCurr : h.quarter === prevQ ? holdingsPrev : null;
    if (!dest) continue;
    const m = dest.get(h.ticker) ?? new Map<string, InstData>();
    m.set(h.institution_name, { shares: h.shares, value: h.value });
    dest.set(h.ticker, m);
  }

  type EarningsRow = { ticker: string; actual_eps: number | null; eps_estimate: number | null; actual_revenue: number | null; revenue_estimate: number | null; report_date: string };
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

  // short_interest: ticker별 최신 2개 (collected_at DESC 정렬 결과)
  type ShortInterestRow = { ticker: string; short_float: number | null; collected_at: string };
  const shortInterestByTicker = new Map<string, ShortInterestRow[]>();
  for (const s of (shortInterestRes.data ?? []) as ShortInterestRow[]) {
    const arr = shortInterestByTicker.get(s.ticker) ?? [];
    if (arr.length < 2) {
      arr.push(s);
      shortInterestByTicker.set(s.ticker, arr);
    }
  }

  // price_targets: ticker별 최신 2개 (published_date DESC 정렬 결과)
  type PriceTargetRow = { ticker: string; price_target: number | null; published_date: string | null };
  const priceTargetsByTicker = new Map<string, PriceTargetRow[]>();
  for (const pt of (priceTargetRes.data ?? []) as PriceTargetRow[]) {
    const arr = priceTargetsByTicker.get(pt.ticker) ?? [];
    if (arr.length < 2) {
      arr.push(pt);
      priceTargetsByTicker.set(pt.ticker, arr);
    }
  }

  // 후보 풀
  const allCandidates = new Set([
    ...filingsByTicker.keys(),
    ...newsByTicker.keys(),
    ...insiderByTicker.keys(),
    ...holdingsCurr.keys(),
    ...earningsByTicker.keys(),
    ...earningsCallsByTicker.keys(),
  ]);

  if (allCandidates.size === 0) {
    return <p className="text-sm text-[#a6a6a6]">최근 14일 내 해당 조건의 종목이 없습니다.</p>;
  }

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

  // ── 스코어링 루프 ──────────────────────────────────────────────────────────

  type CandidateItem = {
    ticker: string; sector: string | null; finalScore: number;
    tags: ReasonTag[]; meta: Metadata; filings: number; news: number;
  };

  const scored: CandidateItem[] = [];

  for (const ticker of allCandidates) {
    const filings   = filingsByTicker.get(ticker)      ?? [];
    const newsItems = newsByTicker.get(ticker)         ?? [];
    const insiders  = insiderByTicker.get(ticker)      ?? [];
    const currHold  = holdingsCurr.get(ticker)         ?? new Map<string, InstData>();
    const prevHold  = holdingsPrev.get(ticker)         ?? new Map<string, InstData>();
    const earnData  = earningsByTicker.get(ticker);
    const callData  = earningsCallsByTicker.get(ticker);
    const siRows    = shortInterestByTicker.get(ticker)  ?? [];
    const ptRows    = priceTargetsByTicker.get(ticker)  ?? [];
    const prices    = pricesByTicker.get(ticker)        ?? [];
    const sector    = sectorByTicker.get(ticker)       ?? null;
    const tags      = new Set<ReasonTag>();

    let totalDecaySum = 0;
    let totalDecayN   = 0;

    // ── Event Score ──────────────────────────────────────────────────────────
    // Group filings by event_type OR form_type prefix
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
      if (et && ET_TAGS.has(et)) tags.add(et as ReasonTag);
    }

    // News dedup + decay sum + surge
    const seenH = new Set<string>();
    const uniqueNews: NewsRow[] = [];
    for (const n of newsItems) {
      const k = normalizeHeadline(n.headline);
      if (!seenH.has(k)) { seenH.add(k); uniqueNews.push(n); }
    }

    let newsRaw = 0;
    const d7Str = new Date(d7Ms).toISOString().slice(0, 10);
    const recentNewsCount = uniqueNews.filter(n => n.published_at.slice(0, 10) >= d7Str).length;
    const olderNewsCount  = uniqueNews.filter(n => n.published_at.slice(0, 10) <  d7Str).length;
    for (const n of uniqueNews) {
      const d = decay(n.published_at, todayMs);
      newsRaw += d;
      totalDecaySum += d; totalDecayN++;
    }
    if (olderNewsCount > 0 && recentNewsCount >= olderNewsCount * 2) newsRaw += 4;

    const eventScore      = eventRaw + newsRaw;
    const dedupFilingCount = filingGroups.size;

    // ── Smart Money Score ────────────────────────────────────────────────────
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

    // 13F 신규
    let has13fNew = false;
    for (const instName of currHold.keys()) {
      if (!prevHold.has(instName)) { has13fNew = true; break; }
    }
    if (has13fNew) { smartRaw += 5; tags.add("13f_new"); }

    // 13F 기존 증가
    let has13fInc = false;
    for (const [instName, cData] of currHold) {
      const pData = prevHold.get(instName);
      if (!pData) continue;
      const cVal = cData.shares ?? cData.value;
      const pVal = pData.shares ?? pData.value;
      if (cVal !== null && pVal !== null && cVal > pVal) { has13fInc = true; break; }
    }
    if (has13fInc) { smartRaw += 3; tags.add("13f_increase"); }

    // Short Interest 감소: 직전 대비 short_float 감소 시 공매도 포지션 축소
    const shortDecrease = siRows.length >= 2 &&
      siRows[0].short_float != null && siRows[1].short_float != null &&
      siRows[0].short_float < siRows[1].short_float;
    if (shortDecrease) { smartRaw += 4; tags.add("short_decrease"); }

    // 목표주가 상향: 최신 > 직전 (최근 30일 내 데이터)
    const targetUp = ptRows.length >= 2 &&
      ptRows[0].price_target != null && ptRows[1].price_target != null &&
      ptRows[0].price_target > ptRows[1].price_target;
    if (targetUp) { smartRaw += 5; tags.add("target_up"); }

    const smartScore = smartRaw;

    // ── Earnings Score ───────────────────────────────────────────────────────
    let earningsRaw = 0;
    // earnings_calls: guidance_direction / management_tone
    if (callData?.guidance_direction === "up") {
      earningsRaw += 10;
      tags.add("guidance_up");
    }
    if (callData?.management_tone === "positive") earningsRaw += 2;
    // EPS / Revenue beat (earnings 테이블)
    if (earnData) {
      const epsBeat  = earnData.actual_eps     != null && earnData.eps_estimate     != null && earnData.actual_eps     > earnData.eps_estimate;
      const revBeat  = earnData.actual_revenue != null && earnData.revenue_estimate != null && earnData.actual_revenue > earnData.revenue_estimate;
      if (epsBeat && revBeat)      { earningsRaw += 8; tags.add("both_beat"); }
      else if (epsBeat)            { earningsRaw += 5; tags.add("eps_beat"); }
      else if (revBeat)            { earningsRaw += 4; tags.add("revenue_beat"); }
    }
    // 주가 모멘텀: 5일 평균 change_pct > 10일 평균
    const chgPcts = prices.filter(p => p.change_pct != null).map(p => p.change_pct!);
    if (chgPcts.length >= 5) {
      const a5  = avg(chgPcts.slice(-5));
      const a10 = avg(chgPcts.slice(-Math.min(10, chgPcts.length)));
      if (a5 > a10) earningsRaw += 3;
    }
    const earningsScore = earningsRaw;

    // ── Market Score ─────────────────────────────────────────────────────────
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

    // ── Final Score ──────────────────────────────────────────────────────────
    const finalScore = eventScore * 0.4 + smartScore * 0.3 + earningsScore * 0.2 + marketScore * 0.1;

    scored.push({
      ticker, sector, finalScore,
      tags: Array.from(tags),
      meta: {
        event: eventScore, smart: smartScore, earnings: earningsScore, market: marketScore,
        filingCount: filings.length, dedupFilingCount,
        newsCount: newsItems.length, dedupNewsCount: uniqueNews.length,
        decayAvg: totalDecayN > 0 ? totalDecaySum / totalDecayN : 0,
        sectorPenalty: false,
        insiderAmount, guidanceDirection: null, shortDecrease, targetUp,
      },
      filings: filings.length,
      news: newsItems.length,
    });
  }

  // Sort
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // ── 섹터 다양성 ────────────────────────────────────────────────────────────
  const sectorCnt = new Map<string, number>();
  const withDiversity = scored.map(item => {
    const sec = item.sector ?? "__none__";
    const cnt = (sectorCnt.get(sec) ?? 0) + 1;
    sectorCnt.set(sec, cnt);
    if (cnt > 5) {
      return { ...item, finalScore: item.finalScore * 0.7, meta: { ...item.meta, sectorPenalty: true } };
    }
    return item;
  });
  withDiversity.sort((a, b) => b.finalScore - a.finalScore);

  const candidates = withDiversity.slice(0, 30);

  // 종목명 조회
  const { data: tickerRows } = await admin
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", candidates.map(c => c.ticker));
  const nameMap = new Map(
    (tickerRows ?? []).map(r => [r.ticker, r.name_kr ?? r.name_en ?? r.ticker])
  );

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {candidates.map((item) => (
        <div
          key={item.ticker}
          className={cn(
            "rounded-[6px] border p-4",
            item.meta.sectorPenalty
              ? "border-white/[0.04] bg-[#0d0d0d] opacity-70"
              : "border-white/[0.08] bg-[#0f0f0f]"
          )}
        >
          <div className="flex items-start justify-between gap-1">
            <Link
              href={`/stocks/${item.ticker}`}
              className="inline-block rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-medium text-[#cccccc]"
            >
              {item.ticker}
            </Link>
            <span className="shrink-0 text-[10px] text-[#a6a6a6]">
              {item.finalScore.toFixed(1)}pt
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-medium text-white">
            {nameMap.get(item.ticker) ?? item.ticker}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium",
                  tagStyle(tag)
                )}
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[10px] text-[#a6a6a6]">
            공시 {item.filings}건 · 뉴스 {item.news}건
          </p>
          <p className="mt-0.5 text-[9px] text-[#a6a6a6]/60">
            E:{item.meta.event.toFixed(1)} S:{item.meta.smart.toFixed(1)} P:{item.meta.earnings.toFixed(1)} M:{item.meta.market.toFixed(1)}
          </p>
        </div>
      ))}
    </div>
  );
}

function AdminWatchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-[6px] bg-white/[0.04]" />
      ))}
    </div>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const admin = createAdminClient();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [
    { count: totalCount },
    { count: proCount },
    { count: newTodayCount },
    { count: filingsTodayCount },
    { count: newsTodayCount },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    admin.from("filings").select("*", { count: "exact", head: true }).gte("filed_at", todayISO),
    admin.from("news").select("*", { count: "exact", head: true }).gte("published_at", todayISO),
  ]);

  const total    = totalCount ?? 0;
  const pro      = proCount ?? 0;
  const free     = total - pro;
  const convRate = total > 0 ? ((pro / total) * 100).toFixed(1) : "—";
  const freePct  = total > 0 ? (free / total) * 100 : 0;

  const activityItems = [
    { label: "오늘 신규 가입",       value: `${newTodayCount ?? 0}명` },
    { label: "오늘 공시 수집",       value: `${(filingsTodayCount ?? 0).toLocaleString("ko-KR")}건` },
    { label: "오늘 뉴스 수집",       value: `${(newsTodayCount ?? 0).toLocaleString("ko-KR")}건` },
    { label: "수집 오류",           value: "준비 중" },
    { label: "Claude API 오늘 비용", value: "준비 중" },
    { label: "마지막 수집",          value: "준비 중" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">어드민 홈</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">TickerFlow 운영 현황 요약</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">총 가입자</p>
              <p className="mt-1.5 text-2xl font-semibold text-white">
                {total.toLocaleString("ko-KR")}명
              </p>
              <p className="mt-1 text-xs text-[#a6a6a6]">오늘 +{newTodayCount ?? 0}명 신규</p>
            </div>
            <IconUsers size={20} stroke={1.5} className="text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">유료 전환율</p>
              <p className="mt-1.5 text-2xl font-semibold text-white">{convRate}%</p>
              <p className="mt-1 text-xs text-[#a6a6a6]">Pro {pro}명 / Free {free}명</p>
            </div>
            <IconTrendingUp size={20} stroke={1.5} className="text-green-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">일별 방문자</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#a6a6a6]">준비 중</p>
              <p className="mt-1 text-xs text-[#a6a6a6]">—</p>
            </div>
            <IconEye size={20} stroke={1.5} className="text-purple-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">월 매출</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#a6a6a6]">준비 중</p>
              <p className="mt-1 text-xs text-[#a6a6a6]">—</p>
            </div>
            <IconCurrencyDollar size={20} stroke={1.5} className="text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 현황 */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">오늘 현황</h2>
          <div className="space-y-3">
            {activityItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                  <span className="text-sm text-[#a6a6a6]">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 일별 방문자 (준비 중) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">일별 방문자 (7일)</h2>
          <div className="flex h-28 items-center justify-center">
            <p className="text-sm text-[#a6a6a6]">준비 중</p>
          </div>
        </div>
      </div>

      {/* 플랜 분포 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">플랜 분포</h2>
        <div className="flex items-center gap-4">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${freePct.toFixed(1)}%` }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm">
            <span className="text-[#a6a6a6]">
              Free <span className="font-medium text-white">{free}명</span>
            </span>
            <span className="text-[#a6a6a6]">
              Pro <span className="font-medium text-green-400">{pro}명</span>
            </span>
          </div>
        </div>
      </div>

      {/* 기업 동향 (내부용) */}
      <div className="rounded-xl border border-red-500/60 bg-red-500/[0.03] p-4 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-red-400">기업 동향 (내부용)</h2>
          <p className="mt-1 text-xs text-red-400/70">
            Event×0.4 + SmartMoney×0.3 + Earnings×0.2 + Market×0.1 | Decay | 중복감산 | 섹터다양성 | 상위 30개
          </p>
        </div>
        <Suspense fallback={<AdminWatchSkeleton />}>
          <AdminWatchSection />
        </Suspense>
        <AdminTriggerButtons />
      </div>
    </div>
  );
}
