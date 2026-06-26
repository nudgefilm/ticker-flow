"use client"

type Props = {
  trend: { day: string; count: number }[]
}

export default function NewsTrendChart({ trend }: Props) {
  const maxCount = Math.max(...trend.map((d) => d.count), 1)
  const BAR_HEIGHT = 52

  return (
    <div className="flex h-full flex-col rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
        최근 7일 추이
      </p>

      {trend.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#a6a6a6]">데이터 없음</p>
      ) : (
        <div className="flex items-end gap-1" style={{ height: `${BAR_HEIGHT + 32}px` }}>
          {trend.map((d) => {
            const barH = d.count > 0
              ? Math.max(2, Math.round((d.count / maxCount) * BAR_HEIGHT))
              : 2
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center">
                <span className="mb-1 text-[10px] tabular-nums text-[#a6a6a6]">
                  {d.count > 0 ? d.count : ""}
                </span>
                <div className="flex w-full flex-col justify-end" style={{ height: `${BAR_HEIGHT}px` }}>
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${barH}px`,
                      background: d.count > 0
                        ? "linear-gradient(to top, rgba(59,130,246,0.4), #60a5fa)"
                        : "rgba(255,255,255,0.06)",
                    }}
                  />
                </div>
                <span className="mt-1.5 text-[10px] tabular-nums text-[#a6a6a6]">
                  {d.day}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
