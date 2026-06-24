const STATS = [
  { label: "CEO·임원", count: "3건" },
  { label: "가이던스 변경", count: "2건" },
  { label: "대규모 계약", count: "1건" },
  { label: "규제 이슈", count: "4건" },
];

export default function NewsTodaySummary() {
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-[#a6a6a6]">
        오늘 주요 변화
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-4 py-4"
          >
            <p className="text-xs text-[#a6a6a6]">{stat.label}</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white">
              {stat.count}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
