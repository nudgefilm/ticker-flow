import DashboardHeader from "@/components/dashboard/dashboard-header";
import WatchlistChangesSummary from "@/components/dashboard/watchlist-changes-summary";
import WatchlistCard, { type WatchlistStock } from "@/components/dashboard/watchlist-card";

const STOCKS: WatchlistStock[] = [
  {
    ticker: "NVDA",
    company: "엔비디아",
    price: "$875.40",
    change: "+3.24%",
    changeUp: true,
    newFilings: "3건",
    earningsDday: "D-2",
    newNews: "6건",
  },
  {
    ticker: "TSLA",
    company: "테슬라",
    price: "$248.75",
    change: "-1.87%",
    changeUp: false,
    newFilings: "2건",
    earningsDday: "발표완료",
    newNews: "4건",
  },
  {
    ticker: "AAPL",
    company: "애플",
    price: "$213.32",
    change: "+0.54%",
    changeUp: true,
    newFilings: "1건",
    earningsDday: "D-3",
    newNews: "3건",
  },
  {
    ticker: "PLTR",
    company: "팔란티어",
    price: "$42.18",
    change: "-0.92%",
    changeUp: false,
    newFilings: "4건",
    earningsDday: "D-14",
    newNews: "2건",
  },
  {
    ticker: "AMZN",
    company: "아마존",
    price: "$192.65",
    change: "+1.13%",
    changeUp: true,
    newFilings: "1건",
    earningsDday: "D-6",
    newNews: "3건",
  },
];

export default function WatchlistPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="와치리스트" />

      {/* 정보 바 */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-white">5 / 5 종목</span>
          <span className="text-sm text-[#a6a6a6]">
            Free 플랜은 최대 5종목까지 등록 가능합니다.
          </span>
        </div>
        <button
          disabled
          className="h-9 cursor-not-allowed rounded-[6px] border border-white/[0.08] px-3 text-sm text-[#a6a6a6]"
        >
          + 종목 추가
        </button>
      </div>

      {/* 오늘 감지된 변화 */}
      <div className="mt-5">
        <WatchlistChangesSummary />
      </div>

      {/* 종목 카드 그리드 */}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {STOCKS.map((stock, i) => (
          <div
            key={stock.ticker}
            className={STOCKS.length % 2 !== 0 && i === STOCKS.length - 1 ? "md:col-span-2" : undefined}
          >
            <WatchlistCard stock={stock} />
          </div>
        ))}
      </div>

      {/* 업그레이드 배너 */}
      <div className="mt-3 flex items-center justify-between rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4">
        <p className="text-sm text-[#cccccc]">
          Pro로 업그레이드하면 종목 수 제한 없이 등록할 수 있습니다.
        </p>
        <button className="h-9 shrink-0 rounded-[6px] border border-white/[0.08] px-3 text-sm text-white transition-colors hover:bg-[#1a1a1a]">
          Pro 시작하기
        </button>
      </div>

      <footer className="mt-6 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
