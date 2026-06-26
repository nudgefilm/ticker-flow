import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import FilingFilterBar from "@/components/dashboard/filing-filter-bar";
import FilingFeedCard, { type Filing } from "@/components/dashboard/filing-feed-card";
import FeedPagination from "@/components/dashboard/feed-pagination";
import DisclosureTypeChart from "@/components/dashboard/disclosure-type-chart";
import DisclosureTrendChart from "@/components/dashboard/disclosure-trend-chart";
import SectorActivityChart from "@/components/dashboard/sector-activity-chart";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SECTOR_KR: Record<string, string> = {
  "Technology": "기술",
  "Healthcare": "헬스케어",
  "Financials": "금융",
  "Consumer Discretionary": "경기소비재",
  "Industrials": "산업재",
  "Communication Services": "커뮤니케이션",
  "Consumer Staples": "필수소비재",
  "Energy": "에너지",
  "Utilities": "유틸리티",
  "Real Estate": "부동산",
  "Materials": "소재",
};

const TYPE_COLORS: Record<string, string> = {
  "8-K": "#fbbf24",
  "10-K": "#60a5fa",
  "10-Q": "#93c5fd",
  "Form 4": "#c084fc",
  "기타": "#6b7280",
};

// ─── 스켈레톤 ──────────────────────────────────────────────────────────────────

function FilingFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5 animate-pulse"
        >
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 rounded-[4px] bg-white/[0.06]" />
            <div className="h-4 w-12 rounded bg-white/[0.06]" />
            <div className="ml-auto h-4 w-16 rounded bg-white/[0.06]" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-white/[0.06]" />
            <div className="h-3 w-4/5 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 실 데이터 피드 ────────────────────────────────────────────────────────────

async function FilingFeedList({ page, type }: { page: number; type: string }) {
  const supabase = await createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const base = supabase
    .from("filings")
    .select("id, ticker, form_type, title, summary_kr, filed_at, url", { count: "exact" })
    .order("filed_at", { ascending: false });

  const filtered =
    type === "8k"    ? base.like("form_type", "8-K%") :
    type === "10k"   ? base.like("form_type", "10-K%") :
    type === "10q"   ? base.like("form_type", "10-Q%") :
    type === "form4" ? base.like("form_type", "4%") :
    type === "other" ? base
      .not("form_type", "like", "8-K%")
      .not("form_type", "like", "10-K%")
      .not("form_type", "like", "10-Q%")
      .not("form_type", "like", "4%")
    : base;

  const { data, count, error } = await filtered.range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  const filings: Filing[] = data ?? [];
  const lastPage = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  if (filings.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        수집된 공시가 없습니다.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filings.map((filing, i) => (
          <FilingFeedCard
            key={filing.id}
            filing={filing}
            className={filings.length % 2 !== 0 && i === filings.length - 1 ? "col-span-2" : undefined}
          />
        ))}
      </div>
      <div className="mt-6">
        <FeedPagination page={page} lastPage={lastPage} type={type !== "all" ? type : undefined} />
      </div>
    </>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const { page: pageParam, type: typeParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const type = typeParam ?? "all";

  // ── 차트용 집계 데이터 ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [filingsRaw, tickersRaw] = await Promise.all([
    supabase
      .from("filings")
      .select("form_type, filed_at, ticker")
      .gte("filed_at", thirtyDaysAgo),
    supabase
      .from("tickers")
      .select("ticker, sector")
      .not("sector", "is", null),
  ]);

  const allFilings = filingsRaw.data ?? [];
  const allTickers = tickersRaw.data ?? [];

  // 1. 공시 유형 분포
  const typeCounts: Record<string, number> = {};
  for (const f of allFilings) {
    const key =
      f.form_type.startsWith("8-K")  ? "8-K"    :
      f.form_type.startsWith("10-K") ? "10-K"   :
      f.form_type.startsWith("10-Q") ? "10-Q"   :
      f.form_type.startsWith("4")    ? "Form 4" :
      "기타";
    typeCounts[key] = (typeCounts[key] ?? 0) + 1;
  }

  const total = allFilings.length;
  const typeData = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, color: TYPE_COLORS[name] ?? "#6b7280" }));

  // 2. 최근 7일 트렌드
  const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const trendMap: Record<string, number> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    trendMap[key] = 0;
  }

  for (const f of allFilings) {
    const d = new Date(f.filed_at);
    if (d >= sevenDaysAgoDate) {
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (key in trendMap) trendMap[key] = (trendMap[key] ?? 0) + 1;
    }
  }

  const trendData = Object.entries(trendMap).map(([day, count]) => ({ day, count }));

  // 3. 섹터별 공시 활동 (상위 5개)
  const tickerSectorMap: Record<string, string> = {};
  for (const t of allTickers) {
    if (t.ticker && t.sector) tickerSectorMap[t.ticker] = t.sector;
  }

  const sectorCounts: Record<string, number> = {};
  for (const f of allFilings) {
    const sector = tickerSectorMap[f.ticker];
    if (sector) sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1;
  }

  const sectorData = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => ({
      sector,
      sectorKr: SECTOR_KR[sector] ?? sector,
      count,
    }));

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="공시 피드" />

      {/* 시각화 섹션 */}
      <section className="mt-6 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        {/* 좌측: 공시 유형 분포 (전체 높이) */}
        <DisclosureTypeChart data={typeData} total={total} />
        {/* 우측: 트렌드 + 섹터 위아래 */}
        <div className="flex flex-col gap-4">
          <DisclosureTrendChart data={trendData} />
          <SectorActivityChart data={sectorData} />
        </div>
      </section>

      {/* 필터 탭 + 피드 */}
      <div className="mt-6">
        <FilingFilterBar currentType={type} />
      </div>
      <div className="mt-5">
        <Suspense fallback={<FilingFeedSkeleton />}>
          <FilingFeedList page={page} type={type} />
        </Suspense>
      </div>

      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
