const stats = [
  { value: "500+", label: "커버 종목" },
  { value: "15분 이내", label: "변화 알림" },
  { value: "최근 7일", label: "주요 변화 추적" },
];

export default function Stats() {
  return (
    <section className="border-y border-border py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-center">
          {stats.map(({ value, label }, i) => (
            <div
              key={label}
              className={`flex-1 text-center ${i > 0 ? "border-l border-border" : ""}`}
            >
              <p className="text-2xl font-semibold tabular-nums text-foreground md:text-3xl">
                {value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
