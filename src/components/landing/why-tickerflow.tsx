const ROWS = [
  { label: "공시 확인", legacy: "SEC 직접 검색", tf: "한국어 요약 제공" },
  { label: "어닝콜", legacy: "직접 청취 (1시간+)", tf: "핵심만 정리" },
  { label: "정보 수집", legacy: "여러 사이트 이동", tf: "한 곳에서 확인" },
  { label: "내부자 거래", legacy: "별도 검색 필요", tf: "자동 수집·분류" },
  { label: "정보 형태", legacy: "영어 원문", tf: "한국어 정리" },
];

export default function WhyTickerFlow() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">기존 방식과 비교해 보세요</h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {/* 헤더 */}
        <div className="grid grid-cols-3 border-b border-border bg-secondary/40">
          <div className="px-4 py-3 text-sm font-medium text-muted-foreground md:px-6">항목</div>
          <div className="px-4 py-3 text-sm font-medium text-muted-foreground md:px-6">기존 방식</div>
          <div className="border-l border-border bg-blue-500/[0.06] px-4 py-3 text-sm font-semibold text-blue-400 md:px-6">
            TickerFlow
          </div>
        </div>

        {/* 행 */}
        {ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-3 ${i < ROWS.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="px-4 py-4 text-sm font-medium text-foreground md:px-6">{row.label}</div>
            <div className="px-4 py-4 text-sm text-muted-foreground md:px-6">{row.legacy}</div>
            <div className="border-l border-border bg-blue-500/[0.04] px-4 py-4 text-sm font-medium text-foreground md:px-6">
              {row.tf}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
