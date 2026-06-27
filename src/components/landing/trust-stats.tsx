import { TRUST_STATS } from "@/lib/mock/landing";

export default function TrustStats() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
        {TRUST_STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1 bg-card px-4 py-8">
            <p className="text-3xl font-semibold tabular-nums text-foreground md:text-4xl">
              {stat.value.toLocaleString("ko-KR")}
              <span className="text-blue-400">{stat.suffix}</span>
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
