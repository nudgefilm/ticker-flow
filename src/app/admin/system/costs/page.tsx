const costData = [
  { date: "2026-06-24", claudeApi: "$1.24", vercel: "$0.48", total: "$1.72" },
  { date: "2026-06-23", claudeApi: "$1.06", vercel: "$0.52", total: "$1.58" },
  { date: "2026-06-22", claudeApi: "$1.35", vercel: "$0.45", total: "$1.80" },
  { date: "2026-06-21", claudeApi: "$0.98", vercel: "$0.41", total: "$1.39" },
  { date: "2026-06-20", claudeApi: "$1.22", vercel: "$0.49", total: "$1.71" },
];

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">비용 모니터링</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">Claude API · Vercel 일별·월별 비용</p>
      </div>

      {/* 월별 요약 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "이번 달 Claude API", value: "$27.40" },
          { label: "이번 달 Vercel", value: "$12.30" },
          { label: "이번 달 합계", value: "$39.70" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 일별 바 차트 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">일별 총 비용 (USD)</h2>
        <div className="flex items-end gap-2 h-24">
          {costData.slice().reverse().map((row, i) => {
            const total = parseFloat(row.total.replace("$", ""));
            const max = 1.80;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-[#a6a6a6]">{row.total}</span>
                <div className="w-full rounded-sm" style={{ height: `${(total / max) * 70}px` }}>
                  <div className="w-full h-full rounded-sm flex flex-col-reverse overflow-hidden">
                    <div className="bg-blue-500/40 flex-none" style={{ height: `${(parseFloat(row.claudeApi.replace("$","")) / total) * 100}%` }} />
                    <div className="bg-purple-500/40 flex-1" />
                  </div>
                </div>
                <span className="text-[10px] text-[#a6a6a6]">{row.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-blue-500/60" />
            <span className="text-xs text-[#a6a6a6]">Claude API</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-purple-500/60" />
            <span className="text-xs text-[#a6a6a6]">Vercel</span>
          </div>
        </div>
      </div>

      {/* 일별 테이블 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">일별 비용 상세</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">날짜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">Claude API</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">Vercel</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">합계</th>
            </tr>
          </thead>
          <tbody>
            {costData.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{row.date}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.claudeApi}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.vercel}</td>
                <td className="px-4 py-3 text-white font-medium">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
