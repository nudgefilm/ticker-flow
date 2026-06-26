import type { EarningsRow } from "@/lib/insights/types";
import { InsightCard, EmptyState } from "./ui";

function fmtEps(v: number | null): string {
  if (v == null) return "—";
  return v >= 0 ? `$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`;
}

export default function EarningsFlow({ earnings }: { earnings: EarningsRow[] }) {
  return (
    <InsightCard title="실적 (최근 4분기)">
      {earnings.length === 0 ? (
        <EmptyState message="수집된 실적 데이터가 없습니다." />
      ) : (
        <div className="overflow-hidden rounded-[4px] border border-white/[0.06]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0f0f0f]">
                <th className="px-3 py-2 text-left font-medium text-[#a6a6a6]">분기</th>
                <th className="px-3 py-2 text-right font-medium text-[#a6a6a6]">EPS 예상</th>
                <th className="px-3 py-2 text-right font-medium text-[#a6a6a6]">EPS 실제</th>
                <th className="px-3 py-2 text-right font-medium text-[#a6a6a6]">결과</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => {
                const beat =
                  e.epsActual != null && e.epsEstimate != null
                    ? e.epsActual >= e.epsEstimate
                    : null;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-white/[0.04] last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium text-[#cccccc]">{e.quarter}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#a6a6a6]">
                      {fmtEps(e.epsEstimate)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[#cccccc]">
                      {fmtEps(e.epsActual)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {beat === null ? (
                        <span className="text-[#a6a6a6]">—</span>
                      ) : beat ? (
                        <span className="rounded-[3px] border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[10px] text-green-400">
                          상회
                        </span>
                      ) : (
                        <span className="rounded-[3px] border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-400">
                          하회
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[10px] text-[#a6a6a6]">
        EPS(주당순이익) 기준. 출처: Finnhub. 투자 판단의 근거로 사용하지 마세요.
      </p>
    </InsightCard>
  );
}
