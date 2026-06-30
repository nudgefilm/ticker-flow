import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import FilingFilterBar from "@/components/dashboard/filing-filter-bar";
import FilingFeedCard, { type Filing } from "@/components/dashboard/filing-feed-card";
import FeedPagination from "@/components/dashboard/feed-pagination";
import DisclosureTypeChart from "@/components/dashboard/disclosure-type-chart";
import DisclosureTrendChart from "@/components/dashboard/disclosure-trend-chart";
import SectorActivityChart from "@/components/dashboard/sector-activity-chart";
import { createClient } from "@/lib/supabase/server";
import { normalizeSector } from "@/lib/sectors";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SECTOR_KR: Record<string, string> = {
  "Technology": "기술",
  "Healthcare": "헬스케어",
  "Financials": "금융",
  "Financial Services": "금융",
  "Consumer Discretionary": "경기소비재",
  "Consumer Cyclical": "경기소비재",
  "Industrials": "산업재",
  "Communication Services": "커뮤니케이션",
  "Consumer Staples": "필수소비재",
  "Consumer Defensive": "필수소비재",
  "Energy": "에너지",
  "Utilities": "유틸리티",
  "Real Estate": "부동산",
  "Materials": "소재",
};

// FMP 실제 반환값 기준 정규 섹터 목록 (11개) — 제로패딩용
const CANONICAL_SECTORS = [
  "Technology", "Healthcare", "Financial Services",
  "Consumer Cyclical", "Consumer Defensive", "Industrials",
  "Communication Services", "Energy", "Utilities", "Real Estate", "Materials",
];

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
          className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5 animate-pulse"
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
            className={[
              i % 2 === 0 ? "bg-[#111820]" : "",
              filings.length % 2 !== 0 && i === filings.length - 1 ? "col-span-2" : "",
            ].filter(Boolean).join(" ") || undefined}
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

  // filings: 유형분포·트렌드용(타입 포함) + 섹터용(tickers join)을 병렬 요청
  // 섹터 쿼리는 tickers!inner join으로 DB에서 직접 매핑 → JS 두 테이블 join 방식의 1000행 제한 우회
  const [filingsRaw, sectorRaw] = await Promise.all([
    supabase
      .from("filings")
      .select("form_type, filed_at, ticker")
      .gte("filed_at", thirtyDaysAgo),
    supabase
      .from("filings")
      .select("tickers!inner(sector)")
      .gte("filed_at", thirtyDaysAgo),
  ]);

  const allFilings = filingsRaw.data ?? [];

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

  // 3. 섹터별 공시 활동 — tickers join 결과에서 집계
  type FilingWithSector = { tickers: { sector: string | null } | null };
  const sectorFilings = (sectorRaw.data ?? []) as unknown as FilingWithSector[];

  const sectorCounts: Record<string, number> = {};
  for (const f of sectorFilings) {
    const raw = f.tickers?.sector;
    if (raw) {
      const sector = normalizeSector(raw);
      sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1;
    }
  }

  // 데이터 있는 섹터 먼저, 없는 섹터는 0으로 채워 전체 11개 표시
  const activeSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([sector, count]) => ({ sector, sectorKr: SECTOR_KR[sector] ?? sector, count }));
  const activeKeys = new Set(activeSectors.map((s) => s.sector));
  const zeroSectors = CANONICAL_SECTORS
    .filter((sector) => !activeKeys.has(sector))
    .map((sector) => ({ sector, sectorKr: SECTOR_KR[sector] ?? sector, count: 0 }));
  const sectorData = [...activeSectors, ...zeroSectors];

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="공시 피드" />

      {/* 시각화 섹션 */}
      <section className="mt-6 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        {/* 좌측: 공시 유형 분포 + 최근 7일 트렌드 위아래 */}
        <div className="flex flex-col gap-4">
          <DisclosureTypeChart data={typeData} total={total} />
          <DisclosureTrendChart data={trendData} />
        </div>
        {/* 우측: 섹터별 활동 */}
        <SectorActivityChart data={sectorData} />
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

      <DashboardDisclaimer />
    </div>
  );
}
