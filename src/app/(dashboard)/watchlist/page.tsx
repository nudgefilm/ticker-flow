import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import WatchlistClient from "@/components/dashboard/watchlist-client";
import { type WatchlistStock } from "@/components/dashboard/watchlist-card";
import { createClient } from "@/lib/supabase/server";

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
            className="animate-pulse rounded-[6px] border border-white/[0.08] bg-[#111111] p-5"
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

  if (rows.length === 0) {
    return <WatchlistClient initialStocks={[]} isPro={isPro} />;
  }

  // 2. 종목별 통계 병렬 조회 (count 쿼리 + 다음 실적)
  const stocks: WatchlistStock[] = await Promise.all(
    rows.map(async (row) => {
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
  );

  return <WatchlistClient initialStocks={stocks} isPro={isPro} />;
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="와치리스트" />
      <Suspense fallback={<WatchlistSkeleton />}>
        <WatchlistContent />
      </Suspense>
      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
