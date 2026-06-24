const KPI = [
  { value: "2", label: "D-3 이내" },
  { value: "7", label: "이번 주 실적" },
  { value: "3", label: "다음 주 실적" },
  { value: "1", label: "발표 완료" },
];

export default function EarningsKpi() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {KPI.map((item) => (
        <div
          key={item.label}
          className="flex h-20 flex-col justify-center rounded-[6px] border border-white/[0.08] bg-[#111111] px-4"
        >
          <p className="text-2xl font-semibold tabular-nums text-white">{item.value}</p>
          <p className="mt-0.5 text-xs text-[#666666]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
