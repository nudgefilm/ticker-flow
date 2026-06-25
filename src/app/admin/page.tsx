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

// ─── 내부 관심 종목 ────────────────────────────────────────────────────────────

type SignalTag = "내부자 매수" | "가이던스" | "실적 상회" | "활동 활발" | "애널리스트" | "기관 보유";

function tagStyle(tag: SignalTag): string {
  switch (tag) {
    case "내부자 매수": return "bg-green-500/10 text-green-400 border border-green-500/20";
    case "가이던스":   return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "실적 상회":  return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    case "활동 활발":  return "bg-white/[0.06] text-[#a6a6a6] border border-white/[0.08]";
    case "애널리스트": return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
    case "기관 보유":  return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
  }
}

async function AdminWatchSection() {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  const currentQuarter = (() => {
    const now = new Date();
    const q = Math.floor(now.getUTCMonth() / 3) + 1;
    return `${now.getUTCFullYear()}Q${q}`;
  })();

  const [insiderRes, guidanceRes, earningsRes, filingsRes, newsRes, analystRes, holdingsRes] = await Promise.all([
    admin.from("insider_trades")
      .select("ticker")
      .eq("transaction_type", "buy")
      .gte("transaction_date", sevenDaysAgo.slice(0, 10))
      .limit(300),
    admin.from("filings")
      .select("ticker")
      .eq("event_type", "guidance")
      .gte("filed_at", sevenDaysAgo)
      .limit(200),
    admin.from("earnings")
      .select("ticker, actual_eps, eps_estimate")
      .not("actual_eps", "is", null)
      .not("eps_estimate", "is", null)
      .gte("report_date", ninetyDaysAgo)
      .limit(300),
    admin.from("filings")
      .select("ticker")
      .gte("filed_at", sevenDaysAgo)
      .limit(1000),
    admin.from("news")
      .select("ticker")
      .gte("published_at", sevenDaysAgo)
      .limit(1000),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("analyst_ratings")
      .select("ticker, buy, strong_buy")
      .limit(500),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("institutional_holdings")
      .select("ticker")
      .eq("quarter", currentQuarter)
      .limit(500),
  ]);

  const insiderBuySet = new Set((insiderRes.data ?? []).map((r) => r.ticker));
  const guidanceSet   = new Set((guidanceRes.data ?? []).map((r) => r.ticker));
  const epsBeatSet    = new Set(
    (earningsRes.data ?? [])
      .filter((r) => r.actual_eps != null && r.eps_estimate != null && r.actual_eps > r.eps_estimate)
      .map((r) => r.ticker)
  );

  const filingsCount = new Map<string, number>();
  for (const r of filingsRes.data ?? []) {
    filingsCount.set(r.ticker, (filingsCount.get(r.ticker) ?? 0) + 1);
  }
  const newsCount = new Map<string, number>();
  for (const r of newsRes.data ?? []) {
    if (!r.ticker) continue;
    newsCount.set(r.ticker, (newsCount.get(r.ticker) ?? 0) + 1);
  }

  // 애널리스트: Strong Buy 5+ → +8pt, Buy 5+ → +5pt
  const strongBuy5Set = new Set<string>();
  const buy5Set       = new Set<string>();
  for (const r of (analystRes.data ?? []) as { ticker: string; buy: number; strong_buy: number }[]) {
    if ((r.strong_buy ?? 0) >= 5) strongBuy5Set.add(r.ticker);
    if ((r.buy ?? 0) >= 5)       buy5Set.add(r.ticker);
  }
  const analystSet = new Set([...strongBuy5Set, ...buy5Set]);

  // 13F: 현재 분기 기관 보유 종목
  const in13FSet = new Set<string>(
    ((holdingsRes.data ?? []) as { ticker: string }[]).map((r) => r.ticker)
  );

  // 후보 풀: 공시 or 뉴스 활동 있는 모든 종목 + 시그널 종목
  const allTickers = new Set([
    ...filingsCount.keys(),
    ...newsCount.keys(),
    ...insiderBuySet,
    ...guidanceSet,
    ...epsBeatSet,
    ...analystSet,
    ...in13FSet,
  ]);

  // 주가 수익률: stock_prices에서 종목별 최초/최신 종가 조회 → 기간 수익률 계산
  const priceReturnMap = new Map<string, number>();
  if (allTickers.size > 0) {
    const { data: priceRows } = await admin
      .from("stock_prices")
      .select("ticker, date, close")
      .in("ticker", Array.from(allTickers))
      .order("date", { ascending: true });

    const firstLast = new Map<string, { first: number; last: number }>();
    for (const row of priceRows ?? []) {
      if (!firstLast.has(row.ticker)) {
        firstLast.set(row.ticker, { first: row.close, last: row.close });
      } else {
        firstLast.get(row.ticker)!.last = row.close;
      }
    }
    for (const [ticker, { first, last }] of firstLast) {
      if (first > 0) priceReturnMap.set(ticker, ((last - first) / first) * 100);
    }
  }

  const candidates = Array.from(allTickers)
    .map((ticker) => {
      const fc = filingsCount.get(ticker) ?? 0;
      const nc = newsCount.get(ticker) ?? 0;
      const priceReturn = priceReturnMap.get(ticker) ?? 0;
      const tags: SignalTag[] = [];
      if (insiderBuySet.has(ticker))  tags.push("내부자 매수");
      if (guidanceSet.has(ticker))    tags.push("가이던스");
      if (epsBeatSet.has(ticker))     tags.push("실적 상회");
      if (analystSet.has(ticker))     tags.push("애널리스트");
      if (in13FSet.has(ticker))       tags.push("기관 보유");
      if (fc + nc >= 5)               tags.push("활동 활발");
      const score =
        fc * 2 +
        nc +
        (insiderBuySet.has(ticker)  ? 5 : 0) +
        (strongBuy5Set.has(ticker)  ? 8 : 0) +
        (buy5Set.has(ticker)        ? 5 : 0) +
        (in13FSet.has(ticker)       ? 5 : 0) +
        (epsBeatSet.has(ticker)     ? 6 : 0) +
        (guidanceSet.has(ticker)    ? 6 : 0) +
        (priceReturn >= 20          ? 4 : priceReturn >= 10 ? 2 : 0);
      return { ticker, tags, filings: fc, news: nc, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-[#a6a6a6]">최근 7일 내 해당 조건의 종목이 없습니다.</p>
    );
  }

  const { data: tickerRows } = await admin
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", candidates.map((c) => c.ticker));

  const nameMap = new Map(
    (tickerRows ?? []).map((r) => [r.ticker, r.name_kr ?? r.name_en ?? r.ticker])
  );

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {candidates.map((item) => (
        <div
          key={item.ticker}
          className="rounded-[6px] border border-white/[0.08] bg-[#0f0f0f] p-4"
        >
          <span className="inline-block rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-medium text-[#cccccc]">
            {item.ticker}
          </span>
          <p className="mt-2 truncate text-sm font-medium text-white">
            {nameMap.get(item.ticker) ?? item.ticker}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium",
                  tagStyle(tag)
                )}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-[#a6a6a6]">
            공시 {item.filings}건 · 뉴스 {item.news}건
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

  const total   = totalCount ?? 0;
  const pro     = proCount ?? 0;
  const free    = total - pro;
  const convRate = total > 0 ? ((pro / total) * 100).toFixed(1) : "—";
  const freePct  = total > 0 ? (free / total) * 100 : 0;

  const activityItems = [
    { label: "오늘 신규 가입",      value: `${newTodayCount ?? 0}명` },
    { label: "오늘 공시 수집",      value: `${(filingsTodayCount ?? 0).toLocaleString("ko-KR")}건` },
    { label: "오늘 뉴스 수집",      value: `${(newsTodayCount ?? 0).toLocaleString("ko-KR")}건` },
    { label: "수집 오류",          value: "준비 중" },
    { label: "Claude API 오늘 비용", value: "준비 중" },
    { label: "마지막 수집",         value: "준비 중" },
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
              <p className="mt-1 text-xs text-[#a6a6a6]">
                오늘 +{newTodayCount ?? 0}명 신규
              </p>
            </div>
            <IconUsers size={20} stroke={1.5} className="text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">유료 전환율</p>
              <p className="mt-1.5 text-2xl font-semibold text-white">{convRate}%</p>
              <p className="mt-1 text-xs text-[#a6a6a6]">
                Pro {pro}명 / Free {free}명
              </p>
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
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-white">기업 동향 (내부용)</h2>
          <p className="mt-1 text-xs text-[#a6a6a6]">
            공시×2 + 뉴스×1 + 내부자 매수+5 + Strong Buy 5+개+8 + Buy 5+개+5 + 기관 편입+5 + 어닝서프라이즈+6 + 가이던스+6 + 52주 수익률(20%↑+4 / 10%↑+2)
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
