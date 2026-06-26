import type { Quote, NextEarnings } from "@/lib/insights/types";

interface Props {
  quote: Quote | null;
  nextEarnings: NextEarnings | null;
}

export default function KeyMetrics({ quote, nextEarnings }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* 최근 종가 */}
      <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
        <p className="text-xs text-[#a6a6a6]">최근 종가</p>
        <p className="mt-1.5 text-lg font-semibold tabular-nums text-white">
          {quote ? `$${quote.close.toFixed(2)}` : "—"}
        </p>
        {quote && (
          <p className="mt-0.5 text-xs text-[#a6a6a6]">{quote.dataDate} 기준</p>
        )}
      </div>

      {/* 전일 대비 */}
      <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
        <p className="text-xs text-[#a6a6a6]">전일 대비</p>
        <p
          className={`mt-1.5 text-lg font-semibold tabular-nums ${
            quote == null
              ? "text-[#a6a6a6]"
              : quote.changePct >= 0
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {quote == null
            ? "—"
            : `${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%`}
        </p>
        {quote && (
          <p className="mt-0.5 text-xs text-[#a6a6a6]">
            {quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)}
          </p>
        )}
      </div>

      {/* 다음 실적 */}
      <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
        <p className="text-xs text-[#a6a6a6]">다음 실적</p>
        {nextEarnings ? (
          <>
            <p className="mt-1 text-sm font-semibold text-white">
              {nextEarnings.date}{" "}
              <span className="text-xs font-normal text-[#a6a6a6]">
                (D-{nextEarnings.daysUntil}일)
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[#a6a6a6]">
              {nextEarnings.timing === "BMO" ? "개장 전(BMO)" : "장 마감 후(AMC)"}
            </p>
            {nextEarnings.epsEstimate !== 0 && (
              <p className="mt-0.5 text-xs text-[#a6a6a6]">
                시장 예상 EPS{" "}
                <span className="tabular-nums text-[#cccccc]">
                  ${nextEarnings.epsEstimate.toFixed(2)}
                </span>
              </p>
            )}
          </>
        ) : (
          <p className="mt-1.5 text-lg font-semibold text-[#a6a6a6]">미정</p>
        )}
      </div>
    </div>
  );
}
