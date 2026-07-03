export interface DataStatusMetric {
  label: string;
  value: number;
  unit: string;
  color: string;
}

export interface DataStatusTodayMetric {
  label: string;
  value: number;
  color: string;
}

interface Props {
  metrics: DataStatusMetric[];
  todayMetrics: DataStatusTodayMetric[];
  lastUpdatedDayLabel: string; // "오늘" 또는 "MM.DD"
  lastUpdatedTime: string | null; // "HH:MM" (없으면 null)
}

export default function DataStatusCard({
  metrics,
  todayMetrics,
  lastUpdatedDayLabel,
  lastUpdatedTime,
}: Props) {
  return (
    <div className="mt-6 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#1a1a1a]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#242424] px-6 py-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
          TickerFlow 데이터 현황
        </p>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-3 gap-x-6 gap-y-5">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-xs text-[#a6a6a6]">{m.label}</p>
              <p className="mt-1.5 text-xl font-semibold leading-none">
                <span style={{ color: m.color }}>{m.value.toLocaleString("ko-KR")}</span>
                <span className="ml-1 text-xs font-normal text-[#a6a6a6]">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="my-4 border-t border-white/[0.06]" />

        <p className="text-xs text-[#a6a6a6]">오늘 업데이트</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {todayMetrics.map((m) => (
            <p key={m.label} className="text-sm">
              <span className="text-[#a6a6a6]">{m.label} </span>
              <span className="font-medium" style={{ color: m.color }}>
                +{m.value.toLocaleString("ko-KR")}
              </span>
              <span className="text-[#a6a6a6]">건</span>
            </p>
          ))}
        </div>

        <div className="my-4 border-t border-white/[0.06]" />

        <p className="text-xs text-[#a6a6a6]">
          마지막 업데이트: {lastUpdatedDayLabel} KST{" "}
          {lastUpdatedTime ? (
            <span style={{ color: "#60a5fa" }}>{lastUpdatedTime}</span>
          ) : (
            "—"
          )}
        </p>
      </div>
    </div>
  );
}
