"use client"

type Props = {
  data: { name: string; value: number; color: string }[]
  total: number
}

export default function DisclosureTypeChart({ data, total }: Props) {
  // 누적 퍼센트로 conic-gradient 문자열 빌드
  let cumulative = 0
  const gradient = data.length > 0
    ? data.map((d) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0
        const from = cumulative.toFixed(2)
        cumulative += pct
        return `${d.color} ${from}% ${cumulative.toFixed(2)}%`
      }).join(", ")
    : ""

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
        공시 유형 분포
      </p>

      {total === 0 ? (
        <p className="py-6 text-center text-xs text-[#a6a6a6]">데이터 없음</p>
      ) : (
        <div className="flex items-center gap-4">
          {/* 도넛 */}
          <div className="relative h-[84px] w-[84px] shrink-0">
            <div
              className="h-full w-full rounded-full"
              style={{
                background: gradient
                  ? `conic-gradient(${gradient})`
                  : "#1a1a1a",
              }}
            />
            {/* 가운데 구멍 */}
            <div className="absolute inset-[22px] flex items-center justify-center rounded-full bg-[#111111]">
              <span className="text-[11px] font-semibold tabular-nums text-white">
                {total}
              </span>
            </div>
          </div>

          {/* 범례 */}
          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="min-w-0 truncate text-[11px] text-[#a6a6a6]">
                  {d.name}
                </span>
                <span className="ml-auto text-[11px] font-medium tabular-nums text-white">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
