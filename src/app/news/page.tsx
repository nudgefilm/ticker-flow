import DashboardHeader from "@/components/dashboard/dashboard-header";
import NewsTodaySummary from "@/components/dashboard/news-today-summary";
import NewsFilterBar from "@/components/dashboard/news-filter-bar";
import NewsFeedCard, { type NewsItem } from "@/components/dashboard/news-feed-card";
import FeedPagination from "@/components/dashboard/feed-pagination";

const NEWS: NewsItem[] = [
  {
    category: "가이던스 변경",
    event: "데이터센터 매출 전망 상향",
    company: "NVDA · 엔비디아",
    source: "Reuters",
    time: "오늘 11:23 KST",
    summary:
      "엔비디아가 2분기 실적 발표 후 3분기 데이터센터 매출 전망을 상향 조정했다. 호퍼 아키텍처 수요가 예상을 크게 상회하고 있다.",
    tag: "NVDA",
  },
  {
    category: "규제 이슈",
    event: "독점 조사 확대",
    company: "GOOGL · 구글",
    source: "WSJ",
    time: "오늘 08:12 KST",
    summary:
      "미국 법무부가 구글의 온라인 광고 시장 독점 행위에 대한 추가 조사를 시작했다. 검색 독점 소송과 별개로 진행된다.",
    tag: "GOOGL",
  },
  {
    category: "CEO·임원",
    event: "CEO 주식 매도 계획 공개",
    company: "PLTR · 팔란티어",
    source: "CNBC",
    time: "어제 15:40 KST",
    summary:
      "팔란티어의 알렉스 카프 CEO가 향후 12개월간 보유 주식의 일부를 단계적으로 매도할 계획을 밝혔다.",
    tag: "PLTR",
  },
  {
    category: "가이던스 변경",
    event: "실적 전망 하향 조정",
    company: "TSLA · 테슬라",
    source: "Bloomberg",
    time: "어제 13:20 KST",
    summary:
      "테슬라가 사이버트럭 생산 차질로 인해 연간 차량 인도 목표를 하향 조정했다. 중국 시장 점유율 하락도 영향을 미쳤다.",
    tag: "TSLA",
  },
  {
    category: "대규모 계약",
    event: "대규모 클라우드 공급 계약 체결",
    company: "MSFT · 마이크로소프트",
    source: "FT",
    time: "어제 09:05 KST",
    summary:
      "마이크로소프트가 미국 정부 기관과 대규모 클라우드 서비스 공급 계약을 체결했다. 계약 규모는 수십억 달러에 달하는 것으로 전해졌다.",
    tag: "MSFT",
  },
  {
    category: "CEO·임원",
    event: "신규 CEO 선임",
    company: "INTC · 인텔",
    source: "Reuters",
    time: "2일 전 22:30 KST",
    summary:
      "인텔이 새로운 CEO를 선임했다. 신임 CEO는 반도체 제조 경쟁력 회복과 파운드리 사업 확대를 최우선 과제로 밝혔다.",
    tag: "INTC",
  },
  {
    category: "신제품",
    event: "신규 이미지 센서 탑재 발표",
    company: "AAPL · 애플",
    source: "TechCrunch",
    time: "2일 전 18:45 KST",
    summary:
      "애플이 차기 iPhone에 소니의 최신 이미지 센서를 탑재할 계획인 것으로 알려졌다. 촬영 성능이 대폭 개선될 전망이다.",
    tag: "AAPL",
  },
  {
    category: "규제 이슈",
    event: "반독점 합의금 부과",
    company: "META · 메타",
    source: "WSJ",
    time: "3일 전 07:15 KST",
    summary:
      "유럽연합이 메타에 반독점법 위반으로 대규모 합의금을 부과했다. 플랫폼 간 데이터 공유 관행이 문제가 됐다.",
    tag: "META",
  },
];

export default function NewsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="뉴스 피드" />
      <div className="mt-6">
        <NewsTodaySummary />
      </div>
      <div className="mt-6">
        <NewsFilterBar />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {NEWS.map((news, i) => (
          <NewsFeedCard key={i} news={news} />
        ))}
      </div>
      <div className="mt-6">
        <FeedPagination lastPage={8} />
      </div>
      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
