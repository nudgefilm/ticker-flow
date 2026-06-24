const STATS = [
  { label: "공시", count: "7건" },
  { label: "뉴스", count: "18건" },
  { label: "실적 임박", count: "2건" },
];

export default function WatchlistChangesSummary() {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4">
      <p className="text-xs uppercase tracking-widest text-[#444444]">오늘 감지된 변화</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-[4px] bg-[#1a1a1a] px-3 py-2.5 text-center">
            <p className="text-xl font-semibold tabular-nums text-white">{stat.count}</p>
            <p className="mt-0.5 text-xs text-[#666666]">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
