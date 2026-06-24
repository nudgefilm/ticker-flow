import DashboardHeader from "@/components/dashboard/dashboard-header";
import FilingFilterBar from "@/components/dashboard/filing-filter-bar";
import FilingFeedCard, { type Filing } from "@/components/dashboard/filing-feed-card";
import FeedPagination from "@/components/dashboard/feed-pagination";

const FILINGS: Filing[] = [
  {
    badgeColor: "blue",
    badgeLabel: "8-K 주요이벤트",
    company: "TSLA · 테슬라",
    time: "오늘 23:14 KST",
    summary:
      "머스크 CEO, 2026 2분기 생산 목표 하향 조정. 픽업트럭 사이버트럭 생산량을 기존 계획 대비 15% 축소. 멕시코 기가팩토리 완공 시점도 2027년으로 연기.",
    keyNumbers: "생산 목표 -15% · 완공 연기 2027",
  },
  {
    badgeColor: "green",
    badgeLabel: "10-Q 분기보고서",
    company: "NVDA · 엔비디아",
    time: "어제 06:02 KST",
    summary:
      "2026 회계연도 2분기 데이터센터 매출 $39B 기록. 전분기 대비 21% 성장, 호퍼 아키텍처 수요 지속. 중국 수출 규제 관련 리스크 요인 신규 추가.",
    keyNumbers: "데이터센터 $39B · +21% QoQ",
  },
  {
    badgeColor: "amber",
    badgeLabel: "Form 4 인사이더",
    company: "PLTR · 팔란티어",
    time: "2일 전 09:30 KST",
    summary:
      "Alex Karp CEO, 보통주 120만 주 매도. 총 거래 금액 약 1억 8천만 달러 규모. 스톡옵션 행사에 따른 계획적 매도(10b5-1 플랜).",
    keyNumbers: "120만 주 · $180M 매도",
  },
  {
    badgeColor: "blue",
    badgeLabel: "8-K 주요이벤트",
    company: "AAPL · 애플",
    time: "2일 전 22:45 KST",
    summary:
      "2026 회계연도 3분기 실적 발표. 매출 $943억으로 전년 동기 대비 5% 증가. 서비스 부문 매출 $268억으로 역대 최고치 경신.",
    keyNumbers: "매출 $94.3B · 서비스 $26.8B",
  },
  {
    badgeColor: "green",
    badgeLabel: "10-K 연간보고서",
    company: "META · 메타",
    time: "3일 전 07:15 KST",
    summary:
      "2025 회계연도 연간 보고서 제출. 광고 매출 $1,270억으로 전년 대비 22% 성장. 데이터센터 인프라 투자 확대로 자본지출 $380억 기록.",
    keyNumbers: "광고 매출 $127B · CapEx $38B",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="공시 피드" />
      <div className="mt-6">
        <FilingFilterBar />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {FILINGS.map((filing, i) => (
          <FilingFeedCard key={i} filing={filing} />
        ))}
      </div>
      <div className="mt-6">
        <FeedPagination />
      </div>
      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#444444]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
