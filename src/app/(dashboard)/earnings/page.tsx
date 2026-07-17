import { Suspense } from "react";
import Link from "next/link";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import EarningsFilterBar from "@/components/dashboard/earnings-filter-bar";
import EarningsRow, { type Earnings } from "@/components/dashboard/earnings-row";
import { IconInfoCircle, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { FeedScrollAnchor } from "@/components/dashboard/feed-scroll-anchor";
import { EarningsPagination } from "@/components/dashboard/earnings-pagination";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const currentYear = new Date().getFullYear().toString();
  if (y === currentYear) return `${parseInt(m)}월 ${parseInt(d)}일`;
  return `${y}. ${parseInt(m)}. ${parseInt(d)}`;
}

// ─── 실적 헬퍼 ────────────────────────────────────────────────────────────────

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

// timeOfDay는 Finnhub 실적 캘린더의 hour 필드("bmo"/"amc"/빈 값)를 그대로 반영한다.
// "미정"은 날짜 자체가 불확실한 게 아니라 발표 시각(개장 전/마감 후 구분)만 아직
// 공개되지 않았다는 뜻이라, 라벨과 툴팁 모두에서 이 구분을 명확히 한다.
function getSession(timeOfDay: string | null): { label: string; tooltip: string } {
  if (timeOfDay === "bmo") {
    return {
      label: "개장 전",
      tooltip: "개장 전(BMO, Before Market Open) — 미국 정규장이 열리기 전에 실적을 발표합니다.",
    };
  }
  if (timeOfDay === "amc") {
    return {
      label: "장 마감 후",
      tooltip: "장 마감 후(AMC, After Market Close) — 미국 정규장이 마감된 뒤에 실적을 발표합니다.",
    };
  }
  return {
    label: "시각 미정",
    tooltip: "발표 날짜는 확정되었지만, 발표 시각(개장 전/마감 후 여부)은 아직 공개되지 않았습니다.",
  };
}

function formatEps(eps: number | null): string {
  if (eps === null) return "미정";
  const sign = eps < 0 ? "-" : "";
  return `${sign}$${Math.abs(eps).toFixed(2)}`;
}

// revRaw는 실제 매출 금액(달러 단위) 원본값이다 — Finnhub 캘린더 응답의
// revenueEstimate/revenueActual을 가공 없이 그대로 저장한 값(src/lib/collect/
// earnings.ts)이라 "백만 달러" 단위가 아니다. 과거 코드가 이 값을 이미 백만
// 단위인 것처럼 다시 1,000,000으로 나눠 "$86.0T"(실제 8,600만 달러) 같은
// 비정상적으로 큰 값을 표시하던 버그를 수정했다(2026-07-17, HFWA·AAL 등
// 실제 사례로 확인). CLAUDE.md 15항(초보자 배려 원칙)에 맞춰 T/B/M 축약
// 대신 "백만 달러/십억 달러/조 달러"로 표기한다.
function formatRevenue(revRaw: number | null): string {
  if (revRaw === null) return "";
  if (revRaw >= 1_000_000_000_000) return `${(revRaw / 1_000_000_000_000).toFixed(1)}조 달러`;
  if (revRaw >= 1_000_000_000)     return `${(revRaw / 1_000_000_000).toFixed(1)}십억 달러`;
  if (revRaw >= 1_000_000)         return `${(revRaw / 1_000_000).toFixed(1)}백만 달러`;
  return `${revRaw.toFixed(0)}달러`;
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
  tickers: { name_kr: string | null; name_en: string | null } | null;
};

type DbDividend = {
  id: string;
  ticker: string;
  ex_date: string | null;
  payment_date: string | null;
  dividend: number | null;
  tickers: { name_kr: string | null; name_en: string | null } | null;
};

// "시장 예상"은 실적 발표 전 여러 증권사 추정치의 평균이라는 사실만 전달한다
// (투자 의견·추천 표현 없이, CLAUDE.md 6항 준수).
const MARKET_ESTIMATE_NOTE = "시장 예상치는 여러 증권사 추정치의 평균입니다.";

// formatRevenue()의 "백만 단위 착각" 버그를 고친 뒤에도(2026-07-17) 이 종목들은
// 실제 기업 규모 대비 비정상적으로 큰 매출 값이 남아 있다 — Finnhub가 현지
// 통화(BABA는 CNY, KSPI는 KZT로 추정)로 미환산된 값을 반환하는 것으로 의심되나
// 아직 확정하지 못했다. 원인이 확정되기 전까지 잘못된 숫자를 노출하지 않도록
// 매출만 숨기고 "확인 중"으로 표시한다 — EPS 등 다른 값은 정상이라 그대로 노출.
const REVENUE_UNVERIFIED_TICKERS = new Set(["BABA", "KSPI"]);

function mapRow(row: DbEarning): Earnings {
  const { label: dday, variant: ddayVariant } = getDday(row.report_date);
  const company = row.tickers?.name_kr ?? row.tickers?.name_en ?? row.ticker;
  const hasActual = row.actual_eps !== null;
  const epsValue  = hasActual ? row.actual_eps  : row.eps_estimate;
  const revValue  = hasActual ? row.actual_revenue : row.revenue_estimate;
  const revStrRaw = formatRevenue(revValue);
  const revUnverified = revStrRaw !== "" && REVENUE_UNVERIFIED_TICKERS.has(row.ticker);
  const revStr = revUnverified ? "확인 중" : revStrRaw;
  const session   = getSession(row.time_of_day);

  return {
    dday,
    ddayVariant,
    ticker: row.ticker,
    company,
    session: session.label,
    sessionTooltip: session.tooltip,
    epsLabel: hasActual ? "EPS 실적" : "시장 예상 EPS",
    eps: formatEps(epsValue),
    epsTooltip: hasActual
      ? "EPS(주당순이익) — 회사가 주식 1주당 벌어들인 순이익입니다."
      : `EPS(주당순이익) — 회사가 주식 1주당 벌어들인 순이익입니다. ${MARKET_ESTIMATE_NOTE}`,
    ...(revStr ? {
      revenueLabel: hasActual ? "매출 실적" : "시장 예상 매출",
      revenue: revStr,
      revenueTooltip: revUnverified
        ? "이 종목은 매출 데이터에 단위 오류가 의심되어 정확한 값을 확인하는 중입니다. 확인되면 다시 표시됩니다."
        : hasActual
          ? "매출 — 기업이 해당 기간 동안 판매로 벌어들인 총 금액입니다."
          : `매출 — 기업이 해당 기간 동안 판매로 벌어들인 총 금액입니다. ${MARKET_ESTIMATE_NOTE}`,
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
          className="animate-pulse flex flex-col gap-3 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
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

function DividendSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-white/[0.08]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-white/[0.06] px-5 py-3.5 last:border-0"
        >
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
          <div className="h-4 w-32 rounded bg-white/[0.06]" />
          <div className="h-4 w-20 rounded bg-white/[0.06]" />
          <div className="h-4 w-20 rounded bg-white/[0.06]" />
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

// ─── 페이지네이션 ─────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  prefix,
}: {
  currentPage: number;
  totalPages: number;
  prefix: string; // e.g. "?" or "?tab=dividends&"
}) {
  const pages: (number | "ellipsis")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end   = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  const btn =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded-[4px] px-2 text-sm transition-colors";

  return (
    <div className="mt-6 flex items-center justify-center gap-1">
      <Link
        href={`${prefix}page=${currentPage - 1}`}
        aria-disabled={currentPage === 1}
        className={`${btn} border border-white/[0.08] text-[#a6a6a6] ${currentPage === 1 ? "pointer-events-none opacity-30" : "hover:bg-[#1a1a1a] hover:text-white"}`}
      >
        <IconChevronLeft size={14} stroke={1.5} />
      </Link>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className={`${btn} text-[#a6a6a6]`}>…</span>
        ) : (
          <Link
            key={p}
            href={`${prefix}page=${p}`}
            className={`${btn} border ${
              p === currentPage
                ? "border-white/20 bg-[#1a1a1a] text-white"
                : "border-white/[0.08] text-[#a6a6a6] hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={`${prefix}page=${currentPage + 1}`}
        aria-disabled={currentPage === totalPages}
        className={`${btn} border border-white/[0.08] text-[#a6a6a6] ${currentPage === totalPages ? "pointer-events-none opacity-30" : "hover:bg-[#1a1a1a] hover:text-white"}`}
      >
        <IconChevronRight size={14} stroke={1.5} />
      </Link>
    </div>
  );
}

// ─── 실적 목록 ────────────────────────────────────────────────────────────────

async function EarningsList({ page }: { page: number }) {
  const supabase = await createClient();

  const today   = new Date().toISOString().slice(0, 10);
  const limit30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const offset  = (page - 1) * PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("earnings")
    .select(
      "ticker, report_date, time_of_day, eps_estimate, revenue_estimate, actual_eps, actual_revenue, tickers(name_kr, name_en)",
      { count: "exact" }
    )
    .gte("report_date", today)
    .lte("report_date", limit30)
    .order("report_date", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  const rows = (data ?? []) as unknown as DbEarning[];

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        향후 30일 내 등록된 실적 일정이 없습니다.
      </p>
    );
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      <FeedScrollAnchor />
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <EarningsRow key={`${row.ticker}-${row.report_date}`} earnings={mapRow(row)} />
        ))}
      </div>
      {totalPages > 1 && (
        <EarningsPagination currentPage={page} totalPages={totalPages} prefix="?" />
      )}
    </>
  );
}

// ─── 배당 목록 ────────────────────────────────────────────────────────────────

async function DividendsList({ page }: { page: number }) {
  const supabase = await createClient();

  const today  = new Date().toISOString().slice(0, 10);
  const offset = (page - 1) * PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("dividends")
    .select(
      "id, ticker, ex_date, payment_date, dividend, tickers(name_kr, name_en)",
      { count: "exact" }
    )
    .gte("ex_date", today)
    .order("ex_date", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </p>
    );
  }

  const rows = (data ?? []) as unknown as DbDividend[];

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        예정된 배당 일정이 없습니다.
      </p>
    );
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#111111]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">티커</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">회사명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">배당락일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">지급일</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#a6a6a6]">배당금/주</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#a6a6a6]">수익률(%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((row) => {
              const company = row.tickers?.name_kr ?? row.tickers?.name_en ?? "—";
              const dividend = row.dividend != null ? `$${row.dividend.toFixed(4)}` : "—";

              return (
                <tr
                  key={row.id}
                  className="bg-[#111111] transition-colors hover:bg-[#1a1a1a]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/stocks/${row.ticker}`}
                      className="font-mono text-sm font-semibold text-[#60a5fa] hover:underline"
                    >
                      {row.ticker}
                    </Link>
                  </td>
                  <td className="max-w-[180px] px-4 py-3 text-sm text-[#cccccc]">
                    <span className="block truncate">{company}</span>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-white">
                    {fmtDate(row.ex_date)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-[#a6a6a6]">
                    {fmtDate(row.payment_date)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-white">
                    {dividend}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-[#a6a6a6]">—</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <EarningsPagination currentPage={page} totalPages={totalPages} prefix="?tab=dividends&" />
      )}
      <p className="mt-2 text-right text-[11px] text-[#a6a6a6]">
        수익률은 추후 제공 예정입니다.
      </p>
    </>
  );
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const tab  = params.tab === "dividends" ? "dividends" : "earnings";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const tabBtn = (active: boolean) =>
    `rounded-[4px] px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-[#262626] text-white"
        : "text-[#a6a6a6] hover:text-[#cccccc]"
    }`;

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="실적 캘린더" />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        주요 미국 기업의 실적 발표 및 배당 일정을 한국 시간 기준으로 제공합니다.
      </p>

      {/* ── 탭 네비게이션 ── */}
      <div className="mt-6 flex w-fit items-center rounded-[6px] border border-white/[0.08] bg-[#111111] p-1">
        <Link href="?tab=earnings" className={tabBtn(tab === "earnings")}>
          실적 발표
        </Link>
        <Link href="?tab=dividends" className={tabBtn(tab === "dividends")}>
          배당 일정
        </Link>
      </div>

      {tab === "earnings" ? (
        <>
          <div className="mt-6">
            <EarningsFilterBar />
          </div>

          <div className="mt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
              향후 30일 실적 일정
            </p>
            <Suspense key={`earnings-${page}`} fallback={<EarningsSkeleton />}>
              <EarningsList page={page} />
            </Suspense>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-4 py-3.5">
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
        </>
      ) : (
        <div className="mt-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
            배당락일 기준 예정 일정
          </p>
          <Suspense key={`dividends-${page}`} fallback={<DividendSkeleton />}>
            <DividendsList page={page} />
          </Suspense>
        </div>
      )}

      <DashboardDisclaimer />
    </div>
  );
}
