import type { InsiderTrade } from "@/lib/insights/types";

interface Props {
  trades: InsiderTrade[];
}

function fmtShares(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M주`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}천주`;
  return `${n}주`;
}

export default function SnapshotInsider({ trades }: Props) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">내부자 거래</p>
      <p className="mb-3 text-xs text-[#a6a6a6]">
        내부자(임원, 이사, 10% 이상 대주주)의 자사주 매수·매도 공시입니다.
      </p>

      {trades.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">최근 내부자 거래 내역이 없습니다.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {trades.map((t) => (
            <div key={t.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#a6a6a6]">{t.date}</span>
                <span
                  className={`rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium ${
                    t.type === "매수"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {t.type}
                </span>
              </div>
              <p className="text-sm font-medium text-white">{t.name}</p>
              {t.titleLabel && (
                <p className="text-xs text-[#a6a6a6]">{t.titleLabel}</p>
              )}
              <p className="text-xs tabular-nums text-[#a6a6a6]">
                {fmtShares(t.shares)}
                {t.price != null ? ` · $${t.price.toFixed(2)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[#a6a6a6]">출처: SEC Form 4 공시</p>
    </div>
  );
}
