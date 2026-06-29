import { SectionCard } from "@/components/dashboard/insights/ui";

export interface AnalystRow {
  id: string;
  period: string | null;
  strong_buy: number | null;
  buy: number | null;
  hold: number | null;
  sell: number | null;
  strong_sell: number | null;
}

const CATS: Array<{
  key: keyof Omit<AnalystRow, "id" | "period">;
  label: string;
  short: string;
  color: string;
}> = [
  { key: "strong_buy",  label: "Strong Buy",  short: "S.Buy",  color: "#34d399" },
  { key: "buy",         label: "Buy",          short: "Buy",    color: "#86efac" },
  { key: "hold",        label: "Hold",         short: "Hold",   color: "#fbbf24" },
  { key: "sell",        label: "Sell",         short: "Sell",   color: "#fb923c" },
  { key: "strong_sell", label: "Strong Sell",  short: "S.Sell", color: "#f87171" },
];

function fmtPeriod(iso: string | null): string {
  if (!iso) return "—";
  const [y, m] = iso.slice(0, 7).split("-");
  return `${y}년 ${parseInt(m)}월`;
}

export function SnapshotAnalyst({ ratings }: { ratings: AnalystRow[] }) {
  if (ratings.length === 0) {
    return (
      <SectionCard title="애널리스트 추천" description="기관 분석가 투자의견 분포">
        <p className="text-sm text-[#a6a6a6]">수집 중입니다.</p>
      </SectionCard>
    );
  }

  const latest = ratings[0];
  const total = CATS.reduce((s, c) => s + (latest[c.key] ?? 0), 0);
  const maxCount = Math.max(...CATS.map((c) => latest[c.key] ?? 0), 1);

  return (
    <SectionCard title="애널리스트 추천" description="기관 분석가 투자의견 분포">
      {/* ── 최신 기간 바 차트 ── */}
      <div className="space-y-2.5">
        {CATS.map((cat) => {
          const count = latest[cat.key] ?? 0;
          const pct = (count / maxCount) * 100;
          return (
            <div key={cat.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-[#a6a6a6]">{cat.label}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-sm bg-white/[0.06]">
                <div
                  className="h-full rounded-sm"
                  style={{ width: `${pct}%`, backgroundColor: cat.color, opacity: 0.75 }}
                />
              </div>
              <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-white">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-[#a6a6a6]">
        기준 기간: {fmtPeriod(latest.period)} · 총 {total}건
      </p>

      {/* ── 3개 기간 비교 테이블 ── */}
      {ratings.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="pb-2 pr-3 font-medium text-[#a6a6a6]">기간</th>
                {CATS.map((c) => (
                  <th
                    key={c.key}
                    className="pb-2 pr-2 text-right font-medium"
                    style={{ color: c.color }}
                  >
                    {c.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {ratings.map((r) => (
                <tr key={r.id}>
                  <td className="py-1.5 pr-3 text-[#a6a6a6]">{fmtPeriod(r.period)}</td>
                  {CATS.map((c) => (
                    <td key={c.key} className="py-1.5 pr-2 text-right tabular-nums text-white">
                      {r[c.key] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[10px] text-[#a6a6a6]">
        출처: Finnhub. 투자 의견을 제공하지 않습니다. 참고 정보로만 활용하세요.
      </p>
    </SectionCard>
  );
}
