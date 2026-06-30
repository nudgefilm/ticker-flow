"use client"

type Props = {
  data: { sector: string; sectorKr: string; count: number }[]
}

export default function SectorActivityChart({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex flex-1 flex-col rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">섹터별 공시 활동</p>
        <span className="text-[10px] text-[#a6a6a6]">최근 30일</span>
      </div>

      {data.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#a6a6a6]">데이터 없음</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((d) => (
            <div key={d.sector}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-[#cccccc]">{d.sectorKr}</span>
                <span className="text-[11px] font-medium tabular-nums text-white">
                  {d.count}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[#60a5fa]"
                  style={{ width: `${(d.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
