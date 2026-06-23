const changes = [
  { value: "12건", label: "CEO 교체" },
  { value: "8건", label: "자사주 매입" },
  { value: "31건", label: "내부자 거래" },
  { value: "4건", label: "대규모 계약" },
  { value: "9건", label: "가이던스 변경" },
];

export default function RecentChanges() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
          최근 7일 주요 변화
        </h2>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          나스닥 주요 기업에서 발생한 변화를 유형별로 집계합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {changes.map(({ value, label }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card px-4 py-6 text-center"
          >
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {value}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
