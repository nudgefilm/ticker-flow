import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import FilingFilterBar from "@/components/dashboard/filing-filter-bar";
import FilingFeedCard, { type Filing } from "@/components/dashboard/filing-feed-card";
import FeedPagination from "@/components/dashboard/feed-pagination";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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
    type === "8-K"  ? base.like("form_type", "8-K%") :
    type === "10-K" ? base.like("form_type", "10-K%") :
    type === "10-Q" ? base.like("form_type", "10-Q%") :
    type === "4"    ? base.like("form_type", "4%") :
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
        <FeedPagination page={page} lastPage={lastPage} type={type || undefined} />
      </div>
    </>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { page?: string; type?: string };
}) {
  const page = Math.max(1, parseInt(searchParams?.page ?? "1") || 1);
  const type = searchParams?.type ?? "";

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="공시 피드" />
      <div className="mt-6">
        <FilingFilterBar activeType={type} />
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
