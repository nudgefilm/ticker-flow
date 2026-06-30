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
    { value: "—", label: "내부자 거래" },
    { value: "—", label: "어닝콜 분석" },
    { value: "—", label: "실적 발표" },
  ];

  try {
    const admin = createAdminClient();
    const [
      tickersRes,
      filingsRes,
      newsRes,
      macroRes,
      insiderRes,
      earningsCallsRes,
      earningsRes,
    ] = await Promise.all([
      admin.from("tickers").select("*", { count: "exact", head: true }),
      admin.from("filings").select("*", { count: "exact", head: true }),
      admin.from("news").select("*", { count: "exact", head: true }),
      admin.from("macro_indicators").select("*", { count: "exact", head: true }),
      admin.from("insider_trades").select("*", { count: "exact", head: true }),
      admin.from("earnings_calls").select("*", { count: "exact", head: true }),
      admin.from("earnings").select("*", { count: "exact", head: true }),
    ]);
    stats = [
      { value: formatStat(tickersRes.count),       label: "모니터링 기업" },
      { value: formatStat(filingsRes.count),       label: "수집 공시" },
      { value: formatStat(newsRes.count),          label: "수집 뉴스" },
      { value: formatStat(macroRes.count),         label: "경제지표" },
      { value: formatStat(insiderRes.count),       label: "내부자 거래" },
      { value: formatStat(earningsCallsRes.count), label: "어닝콜 분석" },
      { value: formatStat(earningsRes.count),      label: "실적 발표" },
    ];
  } catch {
    // admin 자격증명 없으면 기본값("—") 유지
  }

  return (
    <section className="border-y border-border py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-7 lg:gap-0 lg:divide-x lg:divide-border">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center lg:px-3">
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
