"use client"

const SECTOR_KR: Record<string, string> = {
  "Technology": "기술",
  "Healthcare": "헬스케어",
  "Financials": "금융",
  "Consumer Discretionary": "경기소비재",
  "Industrials": "산업재",
  "Communication Services": "커뮤니케이션",
  "Consumer Staples": "필수소비재",
  "Energy": "에너지",
  "Utilities": "유틸리티",
  "Real Estate": "부동산",
  "Materials": "소재",
}

type Props = {
  sectors: { sector: string; count: number }[]
}

export default function NewsSectorChart({ sectors }: Props) {
  const maxCount = Math.max(...sectors.map((d) => d.count), 1)

  return (
    <div className="flex flex-1 flex-col rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-4">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
        섹터별 뉴스 활동
      </p>

      {sectors.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#a6a6a6]">데이터 없음</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sectors.map((d) => (
            <div key={d.sector}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-[#cccccc]">
                  {SECTOR_KR[d.sector] ?? d.sector}
                </span>
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
