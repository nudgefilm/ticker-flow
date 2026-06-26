import { SectionCard } from "./ui";

const SOURCES = [
  { name: "SEC EDGAR", desc: "공시 원문 (8-K, 10-K, 10-Q, Form 4 등)" },
  { name: "Finnhub", desc: "뉴스, 실적 캘린더, 내부자 거래" },
  { name: "Yahoo Finance", desc: "주가 히스토리" },
];

export default function DataSources({ updatedAt }: { updatedAt?: string | null }) {
  return (
    <SectionCard
      title="데이터 출처"
      description="본 페이지에 사용된 데이터의 출처입니다."
    >
      <div className="flex flex-wrap items-center gap-2">
        {SOURCES.map((s) => (
          <span
            key={s.name}
            className="inline-flex items-center rounded bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white"
            title={s.desc}
          >
            {s.name}
          </span>
        ))}
      </div>
      {updatedAt && (
        <p className="mt-3 text-xs text-[#a6a6a6]">마지막 업데이트 {updatedAt}</p>
      )}
      <p className="mt-2 text-xs text-[#a6a6a6]">
        모든 데이터는 공개 정보를 기반으로 수집되며, 투자 자문이나 투자 권유를 목적으로 제공되지
        않습니다.
      </p>
    </SectionCard>
  );
}
