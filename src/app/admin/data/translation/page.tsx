const dailyUsage = [
  { date: "2026-06-24", model: "claude-haiku-4-5", inputTokens: 842300, outputTokens: 124500, cost: "$1.24" },
  { date: "2026-06-23", model: "claude-haiku-4-5", inputTokens: 721800, outputTokens: 108200, cost: "$1.06" },
  { date: "2026-06-22", model: "claude-haiku-4-5", inputTokens: 903400, outputTokens: 135100, cost: "$1.35" },
  { date: "2026-06-21", model: "claude-haiku-4-5", inputTokens: 654200, outputTokens: 98100, cost: "$0.98" },
  { date: "2026-06-20", model: "claude-haiku-4-5", inputTokens: 812600, outputTokens: 121900, cost: "$1.22" },
];

export default function TranslationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">번역 사용량</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">Claude API 한국어 요약 사용량</p>
      </div>

      {/* 월별 요약 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "이번 달 입력 토큰", value: "18.2M" },
          { label: "이번 달 출력 토큰", value: "2.7M" },
          { label: "이번 달 비용", value: "$27.40" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 일별 바 차트 (목업) */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">일별 비용 (USD)</h2>
        <div className="flex items-end gap-2 h-24">
          {dailyUsage.slice().reverse().map((row, i) => {
            const maxCost = 1.35;
            const cost = parseFloat(row.cost.replace("$", ""));
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-[#a6a6a6]">{row.cost}</span>
                <div
                  className="w-full rounded-sm bg-purple-500/40"
                  style={{ height: `${(cost / maxCost) * 70}px` }}
                />
                <span className="text-[10px] text-[#a6a6a6]">{row.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 일별 상세 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">일별 사용량 상세</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">날짜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">모델</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">입력 토큰</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">출력 토큰</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">비용</th>
            </tr>
          </thead>
          <tbody>
            {dailyUsage.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{row.date}</td>
                <td className="px-4 py-3 text-[#a6a6a6] font-mono text-xs">{row.model}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{(row.inputTokens / 1000).toFixed(1)}K</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{(row.outputTokens / 1000).toFixed(1)}K</td>
                <td className="px-4 py-3 text-white font-medium">{row.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
