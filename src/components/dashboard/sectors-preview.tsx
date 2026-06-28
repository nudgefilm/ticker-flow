const DATES = ["6/17(월)", "6/18(화)", "6/19(수)", "6/20(목)", "6/21(금)", "6/22(토)", "6/23(일)"];

const SECTORS = [
  {
    name: "반도체·AI칩",
    cells: [
      "bg-green-500/40",
      "bg-green-500/60",
      "bg-green-500/30",
      "bg-green-500/70",
      "bg-green-500/80",
      "bg-white/10",
      "bg-white/10",
    ],
  },
  {
    name: "클라우드·소프트웨어",
    cells: [
      "bg-white/10",
      "bg-green-500/30",
      "bg-green-500/50",
      "bg-green-500/40",
      "bg-green-500/60",
      "bg-white/10",
      "bg-white/10",
    ],
  },
  {
    name: "전기차·에너지",
    cells: [
      "bg-red-500/40",
      "bg-red-500/60",
      "bg-red-500/30",
      "bg-white/10",
      "bg-green-500/20",
      "bg-white/10",
      "bg-white/10",
    ],
  },
  {
    name: "바이오·헬스케어",
    cells: [
      "bg-green-500/20",
      "bg-white/10",
      "bg-red-500/20",
      "bg-red-500/40",
      "bg-white/10",
      "bg-white/10",
      "bg-white/10",
    ],
  },
  {
    name: "소비·커머스",
    cells: [
      "bg-white/10",
      "bg-green-500/20",
      "bg-green-500/40",
      "bg-green-500/30",
      "bg-green-500/50",
      "bg-white/10",
      "bg-white/10",
    ],
  },
  {
    name: "금융·핀테크",
    cells: [
      "bg-red-500/20",
      "bg-white/10",
      "bg-green-500/20",
      "bg-white/10",
      "bg-red-500/30",
      "bg-white/10",
      "bg-white/10",
    ],
  },
  {
    name: "방산·우주",
    cells: [
      "bg-green-500/30",
      "bg-green-500/50",
      "bg-green-500/40",
      "bg-green-500/60",
      "bg-green-500/70",
      "bg-white/10",
      "bg-white/10",
    ],
  },
];

const SUMMARY = [
  { label: "이번 주 뉴스 활발 섹터", value: "방산·우주" },
  { label: "뉴스 감소 섹터", value: "전기차·에너지" },
  { label: "뉴스 변화 최대", value: "반도체·AI칩" },
];

export default function SectorsPreview() {
  return (
    <div className="mt-5 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">히트맵 미리보기</p>

      <div className="flex flex-col gap-3">
        {/* 히트맵 카드 */}
        <div className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5">
          {/* 날짜 헤더 */}
          <div className="flex items-center gap-2">
            <div className="w-32 shrink-0" />
            <div className="grid flex-1 grid-cols-7 gap-2">
              {DATES.map((d) => (
                <span key={d} className="text-right text-xs text-[#a6a6a6]">
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* 섹터 행 */}
          <div className="mt-3 flex flex-col gap-2">
            {SECTORS.map((sector) => (
              <div key={sector.name} className="flex items-center gap-2">
                <span className="w-32 shrink-0 text-sm text-[#cccccc]">{sector.name}</span>
                <div className="grid flex-1 grid-cols-7 gap-2">
                  {sector.cells.map((cls, i) => (
                    <div key={i} className={`aspect-square rounded-[4px] ${cls}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 범례 */}
          <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-[2px] bg-red-500/60" />
              <span className="text-xs text-[#a6a6a6]">뉴스 감소</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-[2px] bg-white/10" />
              <span className="text-xs text-[#a6a6a6]">보통</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-[2px] bg-green-500/60" />
              <span className="text-xs text-[#a6a6a6]">뉴스 증가</span>
            </div>
            <span className="ml-auto text-xs text-[#a6a6a6]">뉴스 흐름 기반 섹터 동향</span>
          </div>
        </div>

        {/* 요약 카드 3개 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SUMMARY.map((item) => (
            <div
              key={item.label}
              className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-4 py-3"
            >
              <p className="text-xs text-[#a6a6a6]">{item.label}</p>
              <p className="mt-1 text-sm font-medium text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
