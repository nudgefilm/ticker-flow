import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import NewsFilterBar from "@/components/dashboard/news-filter-bar";
import NewsFeedCard, { type NewsItem } from "@/components/dashboard/news-feed-card";
import FeedPagination from "@/components/dashboard/feed-pagination";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// ─── 스켈레톤 ──────────────────────────────────────────────────────────────────

function NewsFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5 animate-pulse"
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
            className={items.length % 2 !== 0 && i === items.length - 1 ? "col-span-2" : undefined}
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

export default function NewsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams?.page ?? "1") || 1);

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="뉴스 피드" />
      <div className="mt-6">
        <NewsFilterBar />
      </div>
      <div className="mt-5">
        <Suspense fallback={<NewsFeedSkeleton />}>
          <NewsFeedList page={page} />
        </Suspense>
      </div>
      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
