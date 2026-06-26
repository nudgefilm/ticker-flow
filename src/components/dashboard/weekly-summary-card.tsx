export interface SummaryMetric {
  label: string;
  value: number;
  unit: string;
  color: string;
  series: number[];
}

export default function WeeklySummaryCard({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <div className="mt-6 rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-5">
      <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
        최근 7일 변화 요약
      </p>
      <div className="mt-4 grid grid-cols-3 gap-6">
        {metrics.map((m) => {
          const peak = Math.max(...m.series, 1);
          return (
            <div key={m.label}>
              {/* 스파크라인 */}
              <div className="flex h-10 items-end gap-[2px]">
                {m.series.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-[2px]"
                    style={{
                      height: `${Math.max(10, Math.round((v / peak) * 100))}%`,
                      backgroundColor: m.color,
                      opacity: v === 0 ? 0.15 : 1,
                    }}
                  />
                ))}
              </div>
              {/* 수치 */}
              <p className="mt-3 text-2xl font-semibold" style={{ color: m.color }}>
                {m.value}
                <span className="ml-1 text-xs font-normal text-[#a6a6a6]">{m.unit}</span>
              </p>
              <p className="mt-0.5 text-xs text-[#a6a6a6]">{m.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
