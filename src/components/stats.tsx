import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

function formatStat(n: number | null): string {
  if (n == null) return "—";
  if (n >= 10000) return `${Math.floor(n / 10000)}만+`;
  if (n >= 1000)  return `${Math.floor(n / 1000)}천+`;
  return `${n}+`;
}

export default async function Stats() {
  let stats = [
    { value: "—", label: "모니터링 기업" },
    { value: "—", label: "수집 공시" },
    { value: "—", label: "수집 뉴스" },
    { value: "—", label: "경제지표" },
  ];

  try {
    const admin = createAdminClient();
    const [tickersRes, filingsRes, newsRes, macroRes] = await Promise.all([
      admin.from("tickers").select("*", { count: "exact", head: true }),
      admin.from("filings").select("*", { count: "exact", head: true }),
      admin.from("news").select("*", { count: "exact", head: true }),
      admin.from("macro_indicators").select("*", { count: "exact", head: true }),
    ]);
    stats = [
      { value: formatStat(tickersRes.count), label: "모니터링 기업" },
      { value: formatStat(filingsRes.count), label: "수집 공시" },
      { value: formatStat(newsRes.count),    label: "수집 뉴스" },
      { value: formatStat(macroRes.count),   label: "경제지표" },
    ];
  } catch {
    // admin 자격증명 없으면 기본값("—") 유지
  }

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
