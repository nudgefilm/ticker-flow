import type { Quote, NextEarnings } from "@/lib/insights/types";

function MetricCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#111111] p-4">
      <p className="text-[11px] text-[#a6a6a6]">{label}</p>
      <p
        className="mt-1.5 text-lg font-bold leading-none"
        style={{ color: valueColor ?? "#ffffff" }}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-[#a6a6a6]">{sub}</p> : null}
    </div>
  );
}

export function KeyMetrics({
  quote,
  nextEarnings,
}: {
  quote: Quote | null;
  nextEarnings: NextEarnings | null;
}) {
  const up = (quote?.change ?? 0) >= 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="최근 종가"
        value={quote ? `$${quote.close.toFixed(2)}` : "—"}
      />
      <MetricCard
        label="전일 대비"
        value={
          quote
            ? `${up ? "+" : ""}${quote.change.toFixed(2)} (${up ? "+" : ""}${quote.changePct.toFixed(2)}%)`
            : "—"
        }
        valueColor={quote ? (up ? "#34d399" : "#f87171") : undefined}
      />
      <MetricCard
        label="다음 실적 발표"
        value={nextEarnings ? `D-${nextEarnings.daysUntil}` : "미정"}
        sub={nextEarnings ? `${nextEarnings.date} · ${nextEarnings.timing}` : undefined}
      />
      <MetricCard
        label="시장 예상 EPS"
        value={nextEarnings && nextEarnings.epsEstimate !== 0 ? nextEarnings.epsEstimate.toFixed(2) : "—"}
        sub={nextEarnings && nextEarnings.epsEstimate !== 0 ? "컨센서스" : undefined}
      />
    </div>
  );
}
