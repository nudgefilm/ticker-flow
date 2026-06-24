import DashboardHeader from "@/components/dashboard/dashboard-header";
import MacroFilterBar from "@/components/dashboard/macro-filter-bar";
import MacroKeyEvents from "@/components/dashboard/macro-key-events";
import MacroRow, { type MacroIndicator } from "@/components/dashboard/macro-row";

const THIS_WEEK: MacroIndicator[] = [
  {
    importance: "상",
    name: "FOMC 금리 결정",
    nameEn: "FOMC Rate Decision",
    release: "6/25 수 03:00 KST",
    forecast: "4.25~4.50%",
    previous: "4.25~4.50%",
    actualVariant: "pending",
  },
  {
    importance: "상",
    name: "소비자물가지수",
    nameEn: "CPI (YoY)",
    release: "6/24 화 21:30 KST",
    forecast: "+2.6%",
    previous: "+2.4%",
    actual: "+2.7%",
    actualVariant: "beat",
  },
  {
    importance: "상",
    name: "비농업 고용지수",
    nameEn: "Non-Farm Payrolls",
    release: "6/27 금 21:30 KST",
    forecast: "185K",
    previous: "177K",
    actualVariant: "pending",
  },
  {
    importance: "중",
    name: "신규 실업수당 청구",
    nameEn: "Initial Jobless Claims",
    release: "6/26 목 21:30 KST",
    forecast: "225K",
    previous: "221K",
    actual: "218K",
    actualVariant: "beat",
  },
  {
    importance: "중",
    name: "내구재 주문",
    nameEn: "Durable Goods Orders",
    release: "6/26 목 21:30 KST",
    forecast: "+0.5%",
    previous: "-1.1%",
    actualVariant: "pending",
  },
  {
    importance: "하",
    name: "미시간대 소비자심리",
    nameEn: "Michigan Consumer Sentiment",
    release: "6/27 금 23:00 KST",
    forecast: "68.5",
    previous: "67.8",
    actualVariant: "pending",
  },
];

const NEXT_WEEK: MacroIndicator[] = [
  {
    importance: "상",
    name: "개인소비지출",
    nameEn: "PCE",
    release: "6/30 월 21:30 KST",
  },
  {
    importance: "중",
    name: "ISM 제조업 PMI",
    nameEn: "ISM Manufacturing PMI",
    release: "7/1 화 23:00 KST",
  },
  {
    importance: "상",
    name: "FOMC 의사록",
    nameEn: "FOMC Meeting Minutes",
    release: "7/3 목 03:00 KST",
  },
];

export default function MacroPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="경제지표" />
      <div className="mt-6 flex justify-end">
        <MacroFilterBar />
      </div>
      <div className="mt-6">
        <MacroKeyEvents />
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#444444]">
          이번 주 주요 지표
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {THIS_WEEK.map((m, i) => (
            <MacroRow key={i} macro={m} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#444444]">다음 주 예정</p>
        <div className="mt-3 flex flex-col gap-3">
          {NEXT_WEEK.map((m, i) => (
            <MacroRow key={i} macro={m} compact />
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-[#444444]">
        모든 시각은 한국 시간(KST) 기준입니다. 경제지표 발표 일정 및 수치는 변경될 수 있습니다.
      </p>

      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#444444]">
        본 서비스는 공개된 금융 정보를 시각화하는 도구입니다. 투자 권유가 아닙니다.
      </footer>
    </div>
  );
}
