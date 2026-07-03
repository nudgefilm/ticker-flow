import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import WatchlistClient from "@/components/dashboard/watchlist-client";
import { type WatchlistStock } from "@/components/dashboard/watchlist-card";
import { createClient } from "@/lib/supabase/server";
import TrendingCarousel from "@/components/dashboard/trending-carousel";
import type { TrendingItem } from "@/components/dashboard/trending-carousel";
import WeeklySummaryCard, { type SummaryMetric } from "@/components/dashboard/weekly-summary-card";
import DataStatusCard from "@/components/dashboard/data-status-card";
import WeeklyBrief from "@/components/dashboard/weekly-brief";
import MonthlyBrief from "@/components/dashboard/monthly-brief";

export const dynamic = "force-dynamic";

// ─── 스켈레톤 ──────────────────────────────────────────────────────────────────

function WatchlistSkeleton() {
  return (
    <>
      <div className="mt-6 flex animate-pulse items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="h-3 w-52 rounded bg-white/[0.06]" />
        </div>
        <div className="h-9 w-24 rounded-[6px] bg-white/[0.06]" />
      </div>
      <div className="mt-5 h-28 animate-pulse rounded-[6px] bg-white/[0.04]" />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-12 rounded bg-white/[0.06]" />
                <div className="h-4 w-20 rounded bg-white/[0.06]" />
              </div>
              <div className="h-4 w-4 rounded bg-white/[0.06]" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-14 rounded-[4px] bg-white/[0.04]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatDday(reportDate: string | null): string {
  if (!reportDate) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const report = new Date(reportDate + "T00:00:00");
  const diff = Math.round((report.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return "—";
  if (diff === 0) return "오늘";
  return `D-${diff}`;
}

// ─── 실 데이터 ──────────────────────────────────────────────────────────────────

async function WatchlistContent() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <WatchlistClient initialStocks={[]} isPro={false} />;

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysLater = new Date(Date.now() + 6 * 86_400_000).toISOString().slice(0, 10);

  // 날짜 키 배열 (과거 7일: 공시·뉴스, 미래 7일: 실적)
  const pastKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    pastKeys.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  }
  const futureKeys: string[] = [];
  for (let i = 0; i < 7; i++) {
    futureKeys.push(new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10));
  }

  // 1. watchlist + 회사명 + plan 병렬 조회
  const [{ data: wl }, { data: profile }] = await Promise.all([
    supabase
      .from("watchlist")
      .select("ticker, tickers(name_kr, name_en)")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single(),
  ]);

  const isPro = profile?.plan === "pro";

  type WlRow = {
    ticker: string;
    tickers: { name_kr: string | null; name_en: string | null } | null;
  };
  const rows = (wl ?? []) as unknown as WlRow[];

  const emptyMetrics: SummaryMetric[] = [
    { label: "신규 공시", color: "#60a5fa", unit: "건",   value: 0, series: [0, 0, 0, 0, 0, 0, 0] },
    { label: "신규 뉴스", color: "#93c5fd", unit: "건",   value: 0, series: [0, 0, 0, 0, 0, 0, 0] },
    { label: "실적 임박", color: "#fbbf24", unit: "종목", value: 0, series: [0, 0, 0, 0, 0, 0, 0] },
  ];

  if (rows.length === 0) {
    return (
      <>
        <WeeklySummaryCard metrics={emptyMetrics} />
        <WatchlistClient initialStocks={[]} isPro={isPro} />
      </>
    );
  }

  const tickers = rows.map(r => r.ticker);

  // 2. 주간 요약 배치 쿼리 + 종목별 통계 병렬 실행
  const [batchResults, stocks] = await Promise.all([
    Promise.all([
      // 쿼리 1: 최근 7일 공시 (와치리스트 ticker 한정)
      supabase.from("filings").select("filed_at").in("ticker", tickers).gte("filed_at", sevenDaysAgo),
      // 쿼리 2: 최근 7일 뉴스 (와치리스트 ticker 한정)
      supabase.from("news").select("published_at").in("ticker", tickers).gte("published_at", sevenDaysAgo),
      // 쿼리 3: 오늘~7일 이내 실적 (와치리스트 ticker 한정)
      supabase.from("earnings").select("report_date, ticker").in("ticker", tickers).gte("report_date", today).lte("report_date", sevenDaysLater),
    ]),
    Promise.all(
      rows.map(async (row): Promise<WatchlistStock> => {
        const t = row.tickers as { name_kr: string | null; name_en: string | null } | null;

        const [filingsRes, newsRes, earningsRes] = await Promise.all([
          supabase
            .from("filings")
            .select("*", { count: "exact", head: true })
            .eq("ticker", row.ticker)
            .gte("filed_at", sevenDaysAgo),
          supabase
            .from("news")
            .select("*", { count: "exact", head: true })
            .eq("ticker", row.ticker)
            .gte("published_at", sevenDaysAgo),
          supabase
            .from("earnings")
            .select("report_date")
            .eq("ticker", row.ticker)
            .gte("report_date", today)
            .order("report_date", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        if (filingsRes.error) console.error(`[watchlist] filings count ${row.ticker}:`, filingsRes.error.message);
        if (newsRes.error)    console.error(`[watchlist] news count ${row.ticker}:`, newsRes.error.message);
        if (earningsRes.error) console.error(`[watchlist] earnings ${row.ticker}:`, earningsRes.error.message);

        return {
          ticker: row.ticker,
          company: t?.name_kr ?? t?.name_en ?? row.ticker,
          newFilings: filingsRes.count ?? 0,
          newNews: newsRes.count ?? 0,
          earningsDday: formatDday(earningsRes.data?.report_date ?? null),
        };
      })
    ),
  ]);

  const [filingsWeekRes, newsWeekRes, earningsWeekRes] = batchResults;

  // 3. 주간 요약 집계
  const filingsByDay = Object.fromEntries(pastKeys.map(k => [k, 0])) as Record<string, number>;
  for (const row of filingsWeekRes.data ?? []) {
    const key = String(row.filed_at ?? "").slice(0, 10);
    if (key in filingsByDay) filingsByDay[key]++;
  }

  const newsByDay = Object.fromEntries(pastKeys.map(k => [k, 0])) as Record<string, number>;
  for (const row of newsWeekRes.data ?? []) {
    const key = String(row.published_at ?? "").slice(0, 10);
    if (key in newsByDay) newsByDay[key]++;
  }

  const earningsByDay = Object.fromEntries(futureKeys.map(k => [k, 0])) as Record<string, number>;
  const earningsTickerSet = new Set<string>();
  for (const row of earningsWeekRes.data ?? []) {
    const key = String(row.report_date ?? "");
    if (key in earningsByDay) earningsByDay[key]++;
    if (row.ticker) earningsTickerSet.add(row.ticker);
  }

  const metrics: SummaryMetric[] = [
    {
      label: "신규 공시",
      color: "#60a5fa",
      unit: "건",
      value: (filingsWeekRes.data ?? []).length,
      series: pastKeys.map(k => filingsByDay[k]),
    },
    {
      label: "신규 뉴스",
      color: "#93c5fd",
      unit: "건",
      value: (newsWeekRes.data ?? []).length,
      series: pastKeys.map(k => newsByDay[k]),
    },
    {
      label: "실적 임박",
      color: "#fbbf24",
      unit: "종목",
      value: earningsTickerSet.size,
      series: futureKeys.map(k => earningsByDay[k]),
    },
  ];

  return (
    <>
      <WeeklySummaryCard metrics={metrics} />
      <WatchlistClient initialStocks={stocks} isPro={isPro} />
    </>
  );
}

// ─── 데이터 현황 스켈레톤 ───────────────────────────────────────────────────────

function DataStatusSkeleton() {
  return (
    <div className="mt-6 h-64 animate-pulse rounded-[6px] border border-white/[0.08] bg-[#1a1a1a]" />
  );
}

// ─── 데이터 현황 ────────────────────────────────────────────────────────────────

// KST(UTC+9) 기준 오늘 00:00에 해당하는 UTC 시각(ISO)
function todayKstStartUtcIso(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const kstMidnightUtcMs =
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 0, 0, 0) -
    9 * 60 * 60 * 1000;
  return new Date(kstMidnightUtcMs).toISOString();
}

// 가장 최근 타임스탬프를 "오늘"/"MM.DD" + "HH:MM"(KST)로 분리 포맷
function formatLastUpdated(iso: string | null): { dayLabel: string; time: string | null } {
  if (!iso) return { dayLabel: "—", time: null };

  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const todayKst = new Date(Date.now() + 9 * 60 * 60 * 1000);

  const isToday =
    kst.getUTCFullYear() === todayKst.getUTCFullYear() &&
    kst.getUTCMonth() === todayKst.getUTCMonth() &&
    kst.getUTCDate() === todayKst.getUTCDate();

  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  const dayLabel = isToday
    ? "오늘"
    : `${String(kst.getUTCMonth() + 1).padStart(2, "0")}.${String(kst.getUTCDate()).padStart(2, "0")}`;

  return { dayLabel, time: `${hh}:${mm}` };
}

// institutional_holdings.institution_name / macro_indicators.indicator_name distinct 개수는
// PostgREST에 distinct count가 없어 값 컬럼만 전체 조회(range 페이지네이션) 후 클라이언트에서 집계
async function fetchDistinctCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "institutional_holdings" | "macro_indicators",
  column: "institution_name" | "indicator_name"
): Promise<number> {
  const names = new Set<string>();
  const PAGE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase.from(table).select(column).range(from, from + PAGE - 1);
    if (error) {
      console.error(`[watchlist] ${table}.${column} distinct count 조회 실패:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    for (const row of data as unknown as Record<string, string | null>[]) {
      const v = row[column];
      if (v) names.add(v);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return names.size;
}

async function DataStatusContent() {
  const supabase = await createClient();
  const todayStart = todayKstStartUtcIso();

  const [
    { count: tickersCount },
    { count: filingsCount },
    { count: newsCount },
    { count: insiderCount },
    { count: todayFilings },
    { count: todayNews },
    { count: todayInsider },
    { data: lastFiling },
    { data: lastNews },
    { data: lastInsider },
    macroIndicatorCount,
    institutionCount,
  ] = await Promise.all([
    supabase.from("tickers").select("*", { count: "exact", head: true }),
    supabase.from("filings").select("*", { count: "exact", head: true }),
    supabase.from("news").select("*", { count: "exact", head: true }),
    supabase.from("insider_trades").select("*", { count: "exact", head: true }),
    supabase.from("filings").select("*", { count: "exact", head: true }).gte("filed_at", todayStart),
    supabase.from("news").select("*", { count: "exact", head: true }).gte("published_at", todayStart),
    supabase.from("insider_trades").select("*", { count: "exact", head: true }).gte("filed_at", todayStart),
    supabase.from("filings").select("filed_at").order("filed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("news").select("published_at").order("published_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("insider_trades").select("filed_at").order("filed_at", { ascending: false }).limit(1).maybeSingle(),
    fetchDistinctCount(supabase, "macro_indicators", "indicator_name"),
    fetchDistinctCount(supabase, "institutional_holdings", "institution_name"),
  ]);

  const lastTimestamps = [lastFiling?.filed_at, lastNews?.published_at, lastInsider?.filed_at].filter(
    (v): v is string => Boolean(v)
  );
  const latestIso = lastTimestamps.length > 0
    ? lastTimestamps.reduce((a, b) => (a > b ? a : b))
    : null;
  const { dayLabel, time } = formatLastUpdated(latestIso);

  return (
    <DataStatusCard
      metrics={[
        { label: "모니터링 기업", value: tickersCount ?? 0, unit: "개", color: "#60a5fa" },
        { label: "수집 공시", value: filingsCount ?? 0, unit: "건", color: "#a78bfa" },
        { label: "수집 뉴스", value: newsCount ?? 0, unit: "건", color: "#34d399" },
        { label: "경제지표", value: macroIndicatorCount, unit: "개", color: "#fbbf24" },
        { label: "내부자 거래", value: insiderCount ?? 0, unit: "건", color: "#f87171" },
        { label: "기관 수급 데이터", value: institutionCount, unit: "개 기관 추적 중", color: "#22d3ee" },
      ]}
      todayMetrics={[
        { label: "공시", value: todayFilings ?? 0, color: "#a78bfa" },
        { label: "뉴스", value: todayNews ?? 0, color: "#34d399" },
        { label: "내부자 거래", value: todayInsider ?? 0, color: "#f87171" },
      ]}
      lastUpdatedDayLabel={dayLabel}
      lastUpdatedTime={time}
    />
  );
}

// ─── 주간/월간 BRIEF 스켈레톤 ───────────────────────────────────────────────────

function BriefSkeleton() {
  return (
    <div className="mt-6 h-40 animate-pulse rounded-[6px] border border-white/[0.08] bg-[#1a1a1a]" />
  );
}

// ─── 주간 BRIEF (Pro 여부 확인 후 위임) ─────────────────────────────────────────

async function WeeklyBriefSection() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isPro = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
    isPro = profile?.plan === "pro";
  }

  return (
    <div className="mt-6">
      <WeeklyBrief isPro={isPro} />
    </div>
  );
}

// ─── 월간 BRIEF ────────────────────────────────────────────────────────────────

function MonthlyBriefSection() {
  return (
    <div className="mt-6">
      <MonthlyBrief />
    </div>
  );
}

// ─── 기업 동향 스켈레톤 ─────────────────────────────────────────────────────────

function TrendingSkeleton() {
  return (
    <section className="mt-8 border-t border-white/[0.06] pt-8">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-52 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="flex gap-1">
          <div className="h-7 w-7 animate-pulse rounded-[4px] bg-white/[0.06]" />
          <div className="h-7 w-7 animate-pulse rounded-[4px] bg-white/[0.06]" />
        </div>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 w-44 shrink-0 animate-pulse rounded-[6px] bg-white/[0.04]"
          />
        ))}
      </div>
    </section>
  );
}

// ─── 공시 유형 약어 → 풀네임 변환 ─────────────────────────────────────────────
function expandFormType(raw: string): string {
  const map: Record<string, string> = {
    "8-K":     "8-K(주요 경영 이벤트)",
    "10-K":    "10-K(연간 보고서)",
    "10-Q":    "10-Q(분기 보고서)",
    "4":       "Form 4(내부자 거래)",
    "S-1":     "S-1(신규 상장)",
    "DEF 14A": "DEF 14A(주주총회)",
    "DEF14A":  "DEF 14A(주주총회)",
  };
  return map[raw] ?? raw;
}

// ─── 기업 동향 ────────────────────────────────────────────────────────────────

async function TrendingContent() {
  const supabase = await createClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const sevenDaysAgoDate = sevenDaysAgo.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // ① 최근 7일 공시(form_type 포함)·뉴스 수집
  const [filingsRes, newsRes] = await Promise.all([
    supabase.from("filings").select("ticker, form_type").gte("filed_at", sevenDaysAgo).limit(500),
    supabase.from("news").select("ticker").gte("published_at", sevenDaysAgo).limit(500),
  ]);

  // 종목별 집계
  const filingsData = new Map<string, { count: number; formTypes: string[] }>();
  for (const r of filingsRes.data ?? []) {
    const d = filingsData.get(r.ticker) ?? { count: 0, formTypes: [] };
    d.count++;
    if (r.form_type && !d.formTypes.includes(r.form_type)) d.formTypes.push(r.form_type);
    filingsData.set(r.ticker, d);
  }
  const newsCount = new Map<string, number>();
  for (const r of newsRes.data ?? []) {
    if (!r.ticker) continue;
    newsCount.set(r.ticker, (newsCount.get(r.ticker) ?? 0) + 1);
  }

  // ② 합산 기준 상위 10개 선별
  const totalCount = new Map<string, number>();
  for (const [t, d] of filingsData) totalCount.set(t, (totalCount.get(t) ?? 0) + d.count);
  for (const [t, n] of newsCount) totalCount.set(t, (totalCount.get(t) ?? 0) + n);

  const top30 = Array.from(totalCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([t]) => t);

  if (top30.length === 0) return null;

  // ③ 상위 30개 대상 추가 조회 (회사명·내부자거래·실적 일정)
  const [tickerNamesRes, insiderRes, earningsRes] = await Promise.all([
    supabase.from("tickers").select("ticker, name_kr, name_en").in("ticker", top30),
    supabase.from("insider_trades").select("ticker, transaction_type")
      .in("ticker", top30).gte("transaction_date", sevenDaysAgoDate).limit(200),
    supabase.from("earnings").select("ticker, report_date")
      .in("ticker", top30).gte("report_date", today)
      .order("report_date", { ascending: true }).limit(20),
  ]);

  const nameEnMap = new Map(
    (tickerNamesRes.data ?? []).map((r) => [r.ticker, r.name_en ?? r.ticker])
  );
  const nameKrMap = new Map(
    (tickerNamesRes.data ?? []).map((r) => [r.ticker, r.name_kr ?? null])
  );
  const insiderBuys  = new Map<string, number>();
  const insiderSells = new Map<string, number>();
  for (const r of insiderRes.data ?? []) {
    if (r.transaction_type === "buy")  insiderBuys.set(r.ticker,  (insiderBuys.get(r.ticker)  ?? 0) + 1);
    if (r.transaction_type === "sell") insiderSells.set(r.ticker, (insiderSells.get(r.ticker) ?? 0) + 1);
  }
  // 종목당 최초 실적일만 보관
  const earningsMap = new Map<string, string>();
  for (const r of earningsRes.data ?? []) {
    if (!earningsMap.has(r.ticker)) earningsMap.set(r.ticker, r.report_date);
  }

  // ④ 팩트 문장 생성
  const todayMs = new Date(today + "T00:00:00").getTime();

  const items: TrendingItem[] = top30.map((ticker) => {
    const fd       = filingsData.get(ticker);
    const fc       = fd?.count ?? 0;
    const fTypes   = fd?.formTypes ?? [];
    const nc       = newsCount.get(ticker) ?? 0;
    const buys     = insiderBuys.get(ticker) ?? 0;
    const sells    = insiderSells.get(ticker) ?? 0;
    const eDate    = earningsMap.get(ticker);

    const sentences: string[] = [];

    // 우선순위: 실적 예정 > 내부자 취득 > 내부자 처분 > 공시 > 뉴스
    if (eDate) {
      const dday = Math.round((new Date(eDate + "T00:00:00").getTime() - todayMs) / 86_400_000);
      sentences.push(dday === 0 ? "실적 발표 오늘 예정" : `실적 발표 D-${dday}일 예정`);
    }
    if (sentences.length < 2 && buys > 0)
      sentences.push(`내부자 취득 ${buys}건 확인`);
    if (sentences.length < 2 && sells > 0)
      sentences.push(`내부자 처분 ${sells}건 확인`);
    if (sentences.length < 2 && fc > 0) {
      const ft = fTypes[0] ? expandFormType(fTypes[0]) : null;
      const suffix = fTypes.length > 1 ? " 등" : "";
      sentences.push(ft ? `최근 7일 ${ft}${suffix} 공시 ${fc}건 제출` : `최근 7일 공시 ${fc}건 제출`);
    }
    if (sentences.length < 2 && nc > 0)
      sentences.push(`관련 뉴스 ${nc}건 발생`);

    if (sentences.length === 0)
      sentences.push("최근 7일 주요 활동 없음");

    const companyEn = nameEnMap.get(ticker) ?? ticker;
    const companyKr = nameKrMap.get(ticker) ?? undefined;
    return {
      ticker,
      company: companyEn,
      companyKr: companyKr !== companyEn ? companyKr : undefined,
      sentences,
    };
  });

  return (
    <section className="mt-8 border-t border-white/[0.06] pt-8">
      <TrendingCarousel items={items} />
    </section>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="와치리스트" />
      <Suspense fallback={<DataStatusSkeleton />}>
        <DataStatusContent />
      </Suspense>
      <Suspense fallback={<BriefSkeleton />}>
        <WeeklyBriefSection />
      </Suspense>
      <Suspense fallback={<BriefSkeleton />}>
        <MonthlyBriefSection />
      </Suspense>
      <Suspense fallback={<TrendingSkeleton />}>
        <TrendingContent />
      </Suspense>
      <Suspense fallback={<WatchlistSkeleton />}>
        <WatchlistContent />
      </Suspense>
      <DashboardDisclaimer />
    </div>
  );
}
