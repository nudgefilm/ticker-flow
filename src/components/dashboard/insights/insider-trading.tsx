import type { InsiderSummary } from "@/lib/insights/types";
import { InsightCard, EmptyState } from "./ui";

function fmtShares(n: number | null): string {
  if (n == null) return "—";
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString("ko-KR")}만주`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}천주`;
  return `${n}주`;
}

export default function InsiderTrading({ insider }: { insider: InsiderSummary }) {
  const { buyCount, sellCount, totalVolume, trades } = insider;

  return (
    <InsightCard title="내부자 거래 (180일)">
      {/* 요약 */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-[4px] bg-[#0f0f0f] px-3 py-2 text-center">
          <p className="text-lg font-semibold tabular-nums text-green-400">{buyCount}</p>
          <p className="text-[10px] text-[#a6a6a6]">매수</p>
        </div>
        <div className="rounded-[4px] bg-[#0f0f0f] px-3 py-2 text-center">
          <p className="text-lg font-semibold tabular-nums text-red-400">{sellCount}</p>
          <p className="text-[10px] text-[#a6a6a6]">매도</p>
        </div>
        <div className="rounded-[4px] bg-[#0f0f0f] px-3 py-2 text-center">
          <p className="text-lg font-semibold tabular-nums text-[#cccccc]">{totalVolume}</p>
          <p className="text-[10px] text-[#a6a6a6]">총 규모</p>
        </div>
      </div>

      {/* 거래 목록 */}
      {trades.length === 0 ? (
        <EmptyState message="최근 180일 내 내부자 거래 없음" />
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {trades.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
              <span
                className={`shrink-0 rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium ${
                  t.type === "매수"
                    ? "border-green-500/20 bg-green-500/10 text-green-400"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
                }`}
              >
                {t.type}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-xs text-[#cccccc]">{t.name}</p>
                {t.titleLabel && (
                  <p className="truncate text-[10px] text-[#a6a6a6]">{t.titleLabel}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <p className="text-xs tabular-nums text-[#cccccc]">{fmtShares(t.shares)}</p>
                <p className="text-[10px] tabular-nums text-[#a6a6a6]">{t.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[#a6a6a6]">
        출처: SEC Form 4 공시 · 내부자는 임원·이사·10% 이상 대주주를 의미합니다.
      </p>
    </InsightCard>
  );
}
