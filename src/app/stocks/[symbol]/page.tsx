import DashboardHeader from "@/components/dashboard/dashboard-header";
import StockHeaderCard from "@/components/dashboard/stock-header-card";
import StockTabs from "@/components/dashboard/stock-tabs";
import StockChart from "@/components/dashboard/stock-chart";
import StockFilingRow, { type StockFiling } from "@/components/dashboard/stock-filing-row";
import StockInfoCard from "@/components/dashboard/stock-info-card";
import StockEarningsTable from "@/components/dashboard/stock-earnings-table";
import { IconLock } from "@tabler/icons-react";

const STATS = [
  { label: "시가총액", value: "$2.15T" },
  { label: "52주 고가", value: "$974.00" },
  { label: "52주 저가", value: "$462.18" },
  { label: "다음 실적", value: "D-2", badge: true },
];

const RECENT_CHANGES = [
  { label: "공시", count: "3건" },
  { label: "뉴스", count: "12건" },
  { label: "인사이더 거래", count: "1건" },
];

const FILINGS: StockFiling[] = [
  {
    badgeColor: "green",
    badgeLabel: "10-Q 분기보고서",
    type: "분기보고서",
    time: "어제 06:02 KST",
  },
  {
    badgeColor: "blue",
    badgeLabel: "8-K 주요이벤트",
    type: "주요이벤트",
    time: "3일 전 22:45 KST",
  },
  {
    badgeColor: "amber",
    badgeLabel: "Form 4 인사이더",
    type: "인사이더",
    time: "1주 전 09:30 KST",
  },
];

const INFO_ROWS = [
  { label: "업종", value: "반도체" },
  { label: "섹터", value: "정보기술" },
  { label: "CEO", value: "Jensen Huang" },
  { label: "직원 수", value: "32,000명" },
  { label: "설립", value: "1993년" },
  { label: "웹사이트", value: "nvidia.com", link: true },
];

const QUARTERS = [
  { quarter: "Q3 FY26", revenue: "$44.1B", eps: "$2.94", latest: true },
  { quarter: "Q2 FY26", revenue: "$39.0B", eps: "$2.67" },
  { quarter: "Q1 FY26", revenue: "$35.1B", eps: "$2.31" },
  { quarter: "Q4 FY25", revenue: "$30.0B", eps: "$1.98" },
];

export default function StockPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="종목 스냅샷" />

      <div className="mt-6">
        <StockHeaderCard
          ticker="NVDA"
          company="엔비디아"
          exchange="NASDAQ"
          price="$875.40"
          change="+3.24%"
          changeUp={true}
          changeAbs="+$27.45 오늘"
          stats={STATS}
        />
      </div>

      {/* 최근 7일 변화 */}
      <div className="mt-6 rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#444444]">최근 7일 변화</p>
        <div className="mt-3 grid grid-cols-3 gap-4">
          {RECENT_CHANGES.map((item) => (
            <div key={item.label}>
              <p className="text-lg font-semibold text-white">{item.count}</p>
              <p className="text-xs text-[#666666]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <StockTabs />
      </div>

      {/* 개요 콘텐츠 */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* 좌측 */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <StockChart />

          {/* 최근 공시 */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#444444]">최근 공시</p>
            <div className="mt-4 flex flex-col gap-3">
              {FILINGS.map((filing, i) => (
                <StockFilingRow key={i} filing={filing} />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
              <a
                href="/dashboard"
                className="text-xs text-[#666666] transition-colors hover:text-[#cccccc]"
              >
                전체 공시 보기 →
              </a>
              <a
                href="/billing"
                className="flex items-center gap-1 text-xs text-[#666666] transition-colors hover:text-[#cccccc]"
              >
                <IconLock className="size-3.5" stroke={1.5} />
                공시 인사이트 보기
              </a>
            </div>
          </div>
        </div>

        {/* 우측 */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
            <StockInfoCard rows={INFO_ROWS} />
          </div>
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
            <StockEarningsTable rows={QUARTERS} />
          </div>

          {/* 다음 실적 발표 */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#444444]">
              다음 실적 발표
            </p>
            <div className="mt-3">
              <p className="text-sm font-medium text-white">2026년 7월 11일 (금)</p>
              <p className="mt-1 text-xs text-[#666666]">장 마감 후 · 07:00 KST</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-[4px] border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                  D-2
                </span>
                <span className="text-xs text-[#666666]">
                  EPS 컨센서스{" "}
                  <span className="text-[#cccccc]">$2.80</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#444444]">
        본 서비스는 공개된 금융 정보를 시각화하는 도구입니다. 투자 권유가 아닙니다.
      </footer>
    </div>
  );
}
