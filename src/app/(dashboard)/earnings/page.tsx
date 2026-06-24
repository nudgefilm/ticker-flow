import DashboardHeader from "@/components/dashboard/dashboard-header";
import EarningsKpi from "@/components/dashboard/earnings-kpi";
import EarningsFilterBar from "@/components/dashboard/earnings-filter-bar";
import EarningsRow, { type Earnings } from "@/components/dashboard/earnings-row";
import { IconInfoCircle } from "@tabler/icons-react";

const UPCOMING: Earnings[] = [
  {
    dday: "D-2",
    ddayVariant: "near",
    ticker: "NVDA",
    company: "엔비디아",
    session: "장 마감 후",
    time: "07:00 KST",
    epsLabel: "시장 예상 EPS",
    eps: "$2.80",
    revenueLabel: "시장 예상 매출",
    revenue: "$43.1B",
  },
  {
    dday: "D-3",
    ddayVariant: "near",
    ticker: "AAPL",
    company: "애플",
    session: "장 마감 후",
    time: "07:00 KST",
    epsLabel: "시장 예상 EPS",
    eps: "$1.43",
    revenueLabel: "시장 예상 매출",
    revenue: "$94.2B",
  },
];

const THIS_WEEK: Earnings[] = [
  {
    dday: "D-4",
    ddayVariant: "far",
    ticker: "MSFT",
    company: "마이크로소프트",
    session: "장 마감 후",
    time: "07:00 KST",
    epsLabel: "시장 예상 EPS",
    eps: "$3.11",
    revenueLabel: "시장 예상 매출",
    revenue: "$68.4B",
  },
  {
    dday: "D-5",
    ddayVariant: "far",
    ticker: "META",
    company: "메타",
    session: "장 마감 후",
    time: "07:00 KST",
    epsLabel: "시장 예상 EPS",
    eps: "$5.22",
    revenueLabel: "시장 예상 매출",
    revenue: "$40.5B",
  },
  {
    dday: "D-6",
    ddayVariant: "far",
    ticker: "AMZN",
    company: "아마존",
    session: "장 마감 후",
    time: "07:00 KST",
    epsLabel: "시장 예상 EPS",
    eps: "$1.36",
    revenueLabel: "시장 예상 매출",
    revenue: "$158.2B",
  },
  {
    dday: "D-7",
    ddayVariant: "far",
    ticker: "GOOGL",
    company: "알파벳",
    session: "장 마감 후",
    time: "07:00 KST",
    epsLabel: "시장 예상 EPS",
    eps: "$2.01",
    revenueLabel: "시장 예상 매출",
    revenue: "$89.3B",
  },
  {
    dday: "발표완료",
    ddayVariant: "done",
    ticker: "TSLA",
    company: "테슬라",
    session: "장 마감 후",
    epsLabel: "EPS 실적",
    eps: "$0.72",
    revenueLabel: "매출 실적",
    revenue: "$25.1B",
    beat: "EPS +$0.04",
    resultTag: "컨센서스 상회",
  },
];

const NEXT_WEEK: Earnings[] = [
  {
    dday: "D-9",
    ddayVariant: "far",
    ticker: "CRM",
    company: "세일즈포스",
    session: "장 마감 후",
    epsLabel: "시장 예상 EPS",
    eps: "$2.45",
  },
  {
    dday: "D-11",
    ddayVariant: "far",
    ticker: "SNOW",
    company: "스노우플레이크",
    session: "장 마감 후",
    epsLabel: "시장 예상 EPS",
    eps: "$0.24",
  },
  {
    dday: "D-12",
    ddayVariant: "far",
    ticker: "COST",
    company: "코스트코",
    session: "장 마감 후",
    epsLabel: "시장 예상 EPS",
    eps: "$4.12",
  },
];

export default function EarningsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="실적 캘린더" />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        주요 미국 기업의 실적 발표 일정을 한국 시간 기준으로 제공합니다.
      </p>

      <div className="mt-6">
        <EarningsKpi />
      </div>
      <div className="mt-6">
        <EarningsFilterBar />
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
          다가오는 발표
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {UPCOMING.map((e, i) => (
            <EarningsRow key={i} earnings={e} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
          이번 주 실적
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {THIS_WEEK.map((e, i) => (
            <EarningsRow key={i} earnings={e} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
          다음 주 예정
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {NEXT_WEEK.map((e, i) => (
            <EarningsRow key={i} earnings={e} compact />
          ))}
        </div>
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
