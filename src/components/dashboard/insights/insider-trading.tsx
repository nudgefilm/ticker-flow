import type { InsiderSummary } from "@/lib/insights/types";
import { SectionCard } from "./ui";

function fmtAmount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function fmtShares(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US") + "주";
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-3 text-center">
      <p className="text-xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[#a6a6a6]">{label}</p>
    </div>
  );
}

export default function InsiderTrading({ insider }: { insider: InsiderSummary }) {
  const { buyCount, sellCount, totalVolume, trades } = insider;

  return (
    <SectionCard title="내부자 거래" description="최근 180일 · 임원·이사·10% 이상 대주주">
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="매수 건수" value={buyCount} color="#34d399" />
        <StatCard label="매도 건수" value={sellCount} color="#f87171" />
        <StatCard label="총 거래 규모" value={totalVolume} color="#60a5fa" />
      </div>

      {trades.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#a6a6a6]">
          최근 180일 내 내부자 거래 내역이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-xs text-[#a6a6a6]">
                <th className="py-2 pr-3 font-medium">거래일</th>
                <th className="py-2 pr-3 font-medium">내부자</th>
                <th className="py-2 pr-3 font-medium">직책</th>
                <th className="py-2 pr-3 font-medium">구분</th>
                <th className="py-2 pr-3 text-right font-medium">수량</th>
                <th className="py-2 text-right font-medium">금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {trades.map((t) => {
                const buy = t.type === "매수";
                return (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-3 tabular-nums text-[#a6a6a6]">
                      {t.date}
                    </td>
                    <td className="py-2.5 pr-3 text-white">{t.name}</td>
                    <td className="py-2.5 pr-3 text-[#a6a6a6]">
                      {t.titleLabel ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                        style={{
                          color: buy ? "#34d399" : "#f87171",
                          backgroundColor: buy
                            ? "rgba(52,211,153,0.15)"
                            : "rgba(248,113,113,0.15)",
                        }}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-[#a6a6a6]">
                      {fmtShares(t.shares)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-white">
                      {fmtAmount(t.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[10px] text-[#a6a6a6]">출처: SEC Form 4 공시</p>
    </SectionCard>
  );
}
