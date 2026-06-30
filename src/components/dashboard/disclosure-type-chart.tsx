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
    <div className="flex h-full flex-col rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">공시 유형 분포</p>
        <span className="text-[10px] text-[#a6a6a6]">최근 30일</span>
      </div>

      {total === 0 ? (
        <p className="flex flex-1 items-center justify-center text-xs text-[#a6a6a6]">데이터 없음</p>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-5">
          {/* 도넛 */}
          <div className="relative h-48 w-48 shrink-0">
            <div
              className="h-full w-full rounded-full"
              style={{
                background: gradient
                  ? `conic-gradient(${gradient})`
                  : "#1a1a1a",
              }}
            />
            {/* 가운데 구멍 */}
            <div className="absolute inset-[48px] flex items-center justify-center rounded-full bg-[#1a1a1a]">
              <span className="text-2xl font-semibold tabular-nums text-white">
                {total}
              </span>
            </div>
          </div>

          {/* 범례 */}
          <ul className="flex w-full flex-1 flex-col justify-between">
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="min-w-0 truncate text-sm text-[#a6a6a6]">
                  {d.name}
                </span>
                <span className="ml-auto text-sm font-medium tabular-nums text-white">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
                <span className="text-xs tabular-nums text-[#a6a6a6]">
                  ({d.value})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
