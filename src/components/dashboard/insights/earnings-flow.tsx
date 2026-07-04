import type { EarningsRow } from "@/lib/insights/types";
import { SectionCard } from "./ui";

function fmtEps(v: number | null): string {
  if (v == null) return "—";
  return v >= 0 ? `$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`;
}

function surprise(estimate: number | null, actual: number | null): number | null {
  if (estimate == null || actual == null || estimate === 0) return null;
  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

function LineChart({ earnings }: { earnings: EarningsRow[] }) {
  if (earnings.length < 2) return null;

  const w = 520, h = 120, pad = 8;
  const all = earnings.flatMap((e) =>
    [e.epsEstimate, e.epsActual].filter((v): v is number => v != null)
  );
  if (all.length === 0) return null;

  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const n = earnings.length;

  const x = (i: number) => pad + (i / (n - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);

  const estimatePts = earnings
    .map((e, i) => (e.epsEstimate != null ? `${x(i)},${y(e.epsEstimate)}` : null))
    .filter(Boolean)
    .join(" ");

  const actualPts = earnings
    .map((e, i) => (e.epsActual != null ? `${x(i)},${y(e.epsActual)}` : null))
    .filter(Boolean)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" preserveAspectRatio="none">
      {estimatePts && (
        <polyline
          points={estimatePts}
          fill="none"
          stroke="#a6a6a6"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      )}
      {actualPts && (
        <polyline points={actualPts} fill="none" stroke="#60a5fa" strokeWidth={2} />
      )}
      {earnings.map((e, i) =>
        e.epsActual != null ? (
          <circle key={i} cx={x(i)} cy={y(e.epsActual)} r={3} fill="#60a5fa" />
        ) : null
      )}
    </svg>
  );
}

export default function EarningsFlow({ earnings }: { earnings: EarningsRow[] }) {
  return (
    <SectionCard title="실적 흐름" description="최근 4분기">
      {earnings.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">이 종목의 실적 데이터가 없습니다.</p>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-4 text-xs text-[#a6a6a6]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-[#60a5fa]" /> EPS 실제
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 border-t border-dashed border-[#a6a6a6]" />{" "}
                EPS 예상
              </span>
            </div>
            <LineChart earnings={earnings} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs text-[#a6a6a6]">
                  <th className="py-2 pr-3 font-medium">분기</th>
                  <th className="py-2 pr-3 text-right font-medium">EPS 예상</th>
                  <th className="py-2 pr-3 text-right font-medium">EPS 실제</th>
                  <th className="py-2 pr-3 text-right font-medium">예상 대비</th>
                  <th className="py-2 text-right font-medium">발표일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[...earnings].reverse().map((e) => {
                  const s = surprise(e.epsEstimate, e.epsActual);
                  return (
                    <tr key={e.id}>
                      <td className="py-2.5 pr-3 text-white">{e.quarter}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-[#a6a6a6]">
                        {fmtEps(e.epsEstimate)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-white">
                        {fmtEps(e.epsActual)}
                      </td>
                      <td
                        className="py-2.5 pr-3 text-right tabular-nums font-medium"
                        style={{
                          color:
                            s == null ? "#a6a6a6" : s >= 0 ? "#34d399" : "#f87171",
                        }}
                      >
                        {s == null ? "—" : `${s >= 0 ? "+" : ""}${s.toFixed(1)}%`}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-[#a6a6a6]">
                        {e.reportDate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="mt-3 text-[10px] text-[#a6a6a6]">
        📌 EPS(주당순이익) 기준. 출처: Finnhub. 투자 판단의 근거로 사용하지 마세요.
      </p>
    </SectionCard>
  );
}
