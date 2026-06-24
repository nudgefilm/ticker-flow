import { cn } from "@/lib/utils";

const TRANSACTIONS = [
  {
    ticker: "NVDA",
    company: "엔비디아",
    insider: "Jensen Huang",
    role: "CEO",
    type: "매도",
    shares: "120만 주",
    amount: "$180M",
    date: "오늘 09:30 KST",
  },
  {
    ticker: "TSLA",
    company: "테슬라",
    insider: "Vaibhav Taneja",
    role: "CFO",
    type: "매도",
    shares: "85만 주",
    amount: "$211M",
    date: "어제 22:15 KST",
  },
  {
    ticker: "AAPL",
    company: "애플",
    insider: "Arthur Levinson",
    role: "Director",
    type: "매도",
    shares: "51만 주",
    amount: "$109M",
    date: "2일 전 21:45 KST",
  },
  {
    ticker: "META",
    company: "메타",
    insider: "Peter Thiel",
    role: "Board Member",
    type: "매도",
    shares: "32만 주",
    amount: "$185M",
    date: "3일 전 22:00 KST",
  },
  {
    ticker: "AMZN",
    company: "아마존",
    insider: "Andy Jassy",
    role: "CEO",
    type: "매수",
    shares: "15만 주",
    amount: "$29M",
    date: "4일 전 20:30 KST",
  },
] as const;

const COLS = "grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_0.9fr_0.9fr_1.1fr]";

export default function InsiderPreview() {
  return (
    <div className="mt-8">
      <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">거래 내역 미리보기</p>

      <div className="mt-4 blur-sm select-none pointer-events-none" aria-hidden="true">
        <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111]">
          {/* 헤더 */}
          <div className={cn("grid bg-[#0f0f0f] px-5 py-3 text-xs text-[#a6a6a6]", COLS)}>
            <span>종목</span>
            <span>내부자</span>
            <span>직책</span>
            <span>유형</span>
            <span className="text-right">수량</span>
            <span className="text-right">금액</span>
            <span className="text-right">날짜</span>
          </div>

          {/* 데이터 행 */}
          {TRANSACTIONS.map((tx) => (
            <div
              key={`${tx.ticker}-${tx.insider}`}
              className={cn(
                "grid border-t border-white/[0.06] px-5 py-4 items-center",
                COLS
              )}
            >
              {/* 종목 */}
              <div className="flex items-center gap-2">
                <span className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs text-[#cccccc]">
                  {tx.ticker}
                </span>
                <span className="text-sm text-[#a6a6a6]">{tx.company}</span>
              </div>

              {/* 내부자 */}
              <span className="text-sm text-white">{tx.insider}</span>

              {/* 직책 */}
              <span className="text-sm text-[#a6a6a6]">{tx.role}</span>

              {/* 유형 */}
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
                  tx.type === "매도"
                    ? "border-red-500/20 bg-red-500/10 text-red-400"
                    : "border-green-500/20 bg-green-500/10 text-green-400"
                )}
              >
                {tx.type}
              </span>

              {/* 수량 */}
              <span className="text-right text-sm tabular-nums text-[#cccccc]">{tx.shares}</span>

              {/* 금액 */}
              <span className="text-right text-sm font-medium tabular-nums text-white">
                {tx.amount}
              </span>

              {/* 날짜 */}
              <span className="text-right text-xs text-[#a6a6a6]">{tx.date}</span>
            </div>
          ))}

          {/* 각주 */}
          <div className="border-t border-white/[0.06] px-5 py-3 text-xs text-[#a6a6a6]">
            인사이더 거래는 SEC에 공시된 사실 정보입니다. 투자 결정의 근거로 단독 활용하지
            마십시오.
          </div>
        </div>
      </div>
    </div>
  );
}
