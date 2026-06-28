import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import NewsFilterBar from "@/components/dashboard/news-filter-bar";
import NewsFeedCard, { type NewsItem } from "@/components/dashboard/news-feed-card";
import FeedPagination from "@/components/dashboard/feed-pagination";
import NewsSourceChart from "@/components/dashboard/news-source-chart";
import NewsTrendChart from "@/components/dashboard/news-trend-chart";
import NewsSectorChart from "@/components/dashboard/news-sector-chart";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SOURCE_COLORS = ["#60a5fa", "#93c5fd", "#fbbf24", "#c084fc", "#6b7280"];

// ─── 스켈레톤 ──────────────────────────────────────────────────────────────────

function NewsFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 rounded bg-white/[0.06]" />
            <div className="h-3 w-10 rounded bg-white/[0.06]" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-4 w-full rounded bg-white/[0.06]" />
            <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-3 w-full rounded bg-white/[0.06]" />
            <div className="h-3 w-5/6 rounded bg-white/[0.06]" />
          </div>
          <div className="mt-3 flex justify-between">
            <div className="h-5 w-12 rounded bg-white/[0.06]" />
            <div className="h-3 w-14 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 실 데이터 피드 ────────────────────────────────────────────────────────────

async function NewsFeedList({ page }: { page: number }) {
  const supabase = await createClient();
  const offset = (page - 1) * PAGE_SIZE;

  const { data, count, error } = await supabase
    .from("news")
    .select("id, ticker, headline, source, published_at, url, summary_kr", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  const items: NewsItem[] = data ?? [];
  const lastPage = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        수집된 뉴스가 없습니다.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <NewsFeedCard
            key={item.id}
            news={item}
            className={[
              i % 2 === 0 ? "bg-[#111820]" : "",
              items.length % 2 !== 0 && i === items.length - 1 ? "col-span-2" : "",
            ].filter(Boolean).join(" ") || undefined}
          />
        ))}
      </div>
      <div className="mt-6">
        <FeedPagination page={page} lastPage={lastPage} />
      </div>
    </>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function NewsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams?.page ?? "1") || 1);

  // ── 차트용 집계 데이터 ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 섹터 쿼리는 tickers!inner join으로 DB에서 직접 매핑 → JS 두 테이블 join 방식의 1000행 제한 우회
  const [sourceRaw, trendRaw, sectorNewsRaw] = await Promise.all([
    // 쿼리 1: 출처 분포 (최근 30일)
    supabase.from("news").select("source").gte("published_at", thirtyDaysAgo),
    // 쿼리 2: 7일 추이
    supabase.from("news").select("published_at").gte("published_at", sevenDaysAgo),
    // 쿼리 3: 섹터별 활동 — tickers inner join으로 sector 직접 조회
    supabase
      .from("news")
      .select("tickers!inner(sector)")
      .gte("published_at", sevenDaysAgo),
  ]);

  // 1. 출처 분포 집계
  const sourceCounts: Record<string, number> = {};
  for (const row of sourceRaw.data ?? []) {
    const key = row.source ?? "기타";
    sourceCounts[key] = (sourceCounts[key] ?? 0) + 1;
  }
  const totalNews = (sourceRaw.data ?? []).length;
  const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  const top5 = sortedSources.slice(0, 5);
  const otherCount = sortedSources.slice(5).reduce((sum, [, v]) => sum + v, 0);
  const sourceData = top5.map(([name, value], i) => ({
    name,
    value,
    color: SOURCE_COLORS[i] ?? "#6b7280",
  }));
  if (otherCount > 0) {
    sourceData.push({ name: "기타", value: otherCount, color: "#6b7280" });
  }

  // 2. 7일 트렌드 집계
  const trendMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    trendMap[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
  }
  for (const row of trendRaw.data ?? []) {
    const d = new Date(row.published_at);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (key in trendMap) trendMap[key] = (trendMap[key] ?? 0) + 1;
  }
  const trendData = Object.entries(trendMap).map(([day, count]) => ({ day, count }));

  // 3. 섹터별 활동 집계 — tickers join 결과에서 집계
  type NewsWithSector = { tickers: { sector: string | null } | null };
  const newsSectorRows = (sectorNewsRaw.data ?? []) as unknown as NewsWithSector[];

  const sectorCounts: Record<string, number> = {};
  for (const row of newsSectorRows) {
    const sector = row.tickers?.sector;
    if (sector) sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1;
  }
  const sectorData = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => ({ sector, count }));

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="뉴스 피드" />

      {/* 시각화 섹션 */}
      <section className="mt-6 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        {/* 좌측: 출처 분포 (전체 높이) */}
        <NewsSourceChart sources={sourceData} total={totalNews} />
        {/* 우측: 추이 + 섹터 위아래 */}
        <div className="flex flex-col gap-4">
          <NewsTrendChart trend={trendData} />
          <NewsSectorChart sectors={sectorData} />
        </div>
      </section>

      <div className="mt-6">
        <NewsFilterBar />
      </div>
      <div className="mt-5">
        <Suspense fallback={<NewsFeedSkeleton />}>
          <NewsFeedList page={page} />
        </Suspense>
      </div>
      <DashboardDisclaimer />
    </div>
  );
}
