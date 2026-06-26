const SOURCES = [
  { name: "SEC EDGAR",  desc: "공시 원문 (8-K, 10-K, 10-Q, Form 4 등)", color: "#60a5fa" },
  { name: "Finnhub",    desc: "뉴스, 실적 캘린더, 내부자 거래",          color: "#34d399" },
  { name: "Yahoo Finance", desc: "주가 히스토리",                        color: "#fbbf24" },
];

export default function DataSources() {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">데이터 출처</p>
      <div className="flex flex-wrap gap-4">
        {SOURCES.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs font-medium text-[#cccccc]">{s.name}</span>
            <span className="text-xs text-[#a6a6a6]">— {s.desc}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-[#a6a6a6]">
        모든 데이터는 공개 정보를 기반으로 수집되며, 투자 자문이나 투자 권유를 목적으로 제공되지 않습니다.
      </p>
    </div>
  );
}
