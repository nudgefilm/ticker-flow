"use client"

type Props = {
  sources: { name: string; value: number; color: string }[]
  total: number
}

export default function NewsSourceChart({ sources, total }: Props) {
  let cumulative = 0
  const gradient = sources.length > 0
    ? sources.map((s) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0
        const from = cumulative.toFixed(2)
        cumulative += pct
        return `${s.color} ${from}% ${cumulative.toFixed(2)}%`
      }).join(", ")
    : ""

  return (
    <div className="flex h-full flex-col rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      <p className="mb-5 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
        뉴스 출처 분포
      </p>

      {total === 0 ? (
        <p className="flex flex-1 items-center justify-center text-xs text-[#a6a6a6]">
          데이터 없음
        </p>
      ) : (
        <div className="flex flex-1 items-center gap-8">
          {/* 도넛 */}
          <div className="relative h-48 w-48 shrink-0">
            <div
              className="h-full w-full rounded-full"
              style={{ background: gradient ? `conic-gradient(${gradient})` : "#1a1a1a" }}
            />
            <div className="absolute inset-[48px] flex items-center justify-center rounded-full bg-[#111111]">
              <span className="text-2xl font-semibold tabular-nums text-white">
                {total}
              </span>
            </div>
          </div>

          {/* 범례 */}
          <ul className="flex min-w-0 flex-1 flex-col gap-3">
            {sources.map((s) => (
              <li key={s.name} className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="min-w-0 truncate text-sm text-[#a6a6a6]">{s.name}</span>
                <span className="ml-auto text-sm font-medium tabular-nums text-white">
                  {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                </span>
                <span className="text-xs tabular-nums text-[#a6a6a6]">({s.value})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
