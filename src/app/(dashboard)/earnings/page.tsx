import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import EarningsFilterBar from "@/components/dashboard/earnings-filter-bar";
import EarningsRow, { type Earnings } from "@/components/dashboard/earnings-row";
import { IconInfoCircle } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function getDday(reportDateStr: string): { label: string; variant: Earnings["ddayVariant"] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const report = new Date(reportDateStr + "T00:00:00");
  const diffDays = Math.round((report.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0)  return { label: "발표완료", variant: "done" };
  if (diffDays === 0) return { label: "오늘",    variant: "near" };
  if (diffDays <= 3)  return { label: `D-${diffDays}`, variant: "near" };
  return { label: `D-${diffDays}`, variant: "far" };
}

function getSession(timeOfDay: string | null): string {
  if (timeOfDay === "bmo") return "개장 전";
  if (timeOfDay === "amc") return "장 마감 후";
  return "미정";
}

function formatEps(eps: number | null): string {
  if (eps === null) return "미정";
  const sign = eps < 0 ? "-" : "";
  return `${sign}$${Math.abs(eps).toFixed(2)}`;
}

function formatRevenue(revMillion: number | null): string {
  if (revMillion === null) return "";
  if (revMillion >= 1_000_000) return `$${(revMillion / 1_000_000).toFixed(1)}T`;
  if (revMillion >= 1_000)     return `$${(revMillion / 1_000).toFixed(1)}B`;
  return `$${revMillion.toFixed(0)}M`;
}

// ─── DB 타입 + 매핑 ───────────────────────────────────────────────────────────

type DbEarning = {
  ticker: string;
  report_date: string;
  time_of_day: string | null;
  eps_estimate: number | null;
  revenue_estimate: number | null;
  actual_eps: number | null;
  actual_revenue: number | null;
  tickers: { name_kr: string | null; name_en: string } | null;
};

function mapRow(row: DbEarning): Earnings {
  const { label: dday, variant: ddayVariant } = getDday(row.report_date);
  const company = row.tickers?.name_kr ?? row.tickers?.name_en ?? row.ticker;
  const hasActual = row.actual_eps !== null;
  const epsValue  = hasActual ? row.actual_eps  : row.eps_estimate;
  const revValue  = hasActual ? row.actual_revenue : row.revenue_estimate;
  const revStr    = formatRevenue(revValue);

  return {
    dday,
    ddayVariant,
    ticker: row.ticker,
    company,
    session: getSession(row.time_of_day),
    epsLabel: hasActual ? "EPS 실적" : "시장 예상 EPS",
    eps: formatEps(epsValue),
    ...(revStr ? {
      revenueLabel: hasActual ? "매출 실적" : "시장 예상 매출",
      revenue: revStr,
    } : {}),
  };
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────

function EarningsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex flex-col gap-3 rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-5 w-12 rounded-[4px] bg-white/[0.06]" />
            <div className="h-4 w-24 rounded bg-white/[0.06]" />
            <div className="h-5 w-10 rounded-[4px] bg-white/[0.06]" />
          </div>
          <div className="h-4 w-20 rounded bg-white/[0.06]" />
          <div className="flex gap-3">
            <div className="h-4 w-28 rounded bg-white/[0.06]" />
            <div className="h-4 w-28 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 실 데이터 목록 ───────────────────────────────────────────────────────────

async function EarningsList() {
  const supabase = await createClient();

  const today   = new Date().toISOString().slice(0, 10);
  const limit30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("earnings")
    .select("ticker, report_date, time_of_day, eps_estimate, revenue_estimate, actual_eps, actual_revenue, tickers(name_kr, name_en)")
    .gte("report_date", today)
    .lte("report_date", limit30)
    .order("report_date", { ascending: true });

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  const rows = (data ?? []) as DbEarning[];

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        향후 30일 내 등록된 실적 일정이 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <EarningsRow key={`${row.ticker}-${row.report_date}`} earnings={mapRow(row)} />
      ))}
    </div>
  );
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="실적 캘린더" />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        주요 미국 기업의 실적 발표 일정을 한국 시간 기준으로 제공합니다.
      </p>

      <div className="mt-6">
        <EarningsFilterBar />
      </div>

      <div className="mt-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
          향후 30일 실적 일정
        </p>
        <Suspense fallback={<EarningsSkeleton />}>
          <EarningsList />
        </Suspense>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-[6px] border border-white/[0.08] bg-[#111111] px-4 py-3.5">
        <IconInfoCircle className="mt-0.5 size-4 shrink-0 text-[#a6a6a6]" stroke={1.5} />
        <div className="space-y-1 text-sm">
          <p className="text-[#cccccc]">모든 시각은 한국 시간(KST) 기준입니다.</p>
          <p className="text-[#a6a6a6]">
            실적 발표 일정은 기업 사정에 따라 변경될 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-0.5 pt-1 text-xs text-[#a6a6a6]">
            <span><span className="text-[#cccccc]">EPS</span> — 주당순이익 (Earnings Per Share)</span>
            <span><span className="text-[#cccccc]">BMO</span> — 개장 전 발표 (Before Market Open)</span>
            <span><span className="text-[#cccccc]">AMC</span> — 장 마감 후 발표 (After Market Close)</span>
          </div>
        </div>
      </div>

      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
