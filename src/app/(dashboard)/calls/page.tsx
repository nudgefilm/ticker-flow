import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import CallsBoard from "@/components/dashboard/calls-board";
import type { EarningsCall, GuidanceDirection, KeyStatement, QaPair, KeywordChange } from "@/lib/earnings-calls";

export const dynamic = "force-dynamic";

type EarningsCallRow = {
  id: string;
  ticker: string;
  fiscal_quarter: number;
  fiscal_year: number;
  call_date: string | null;
  summary_kr: string | null;
  key_points: Record<string, unknown> | null;
  processed_at: string | null;
  source_url: string | null;
  transcript_url: string | null;
  tone_change: string | null;
  tickers: { name_kr: string | null; name_en: string | null } | null;
};

function cleanCompanyName(raw: string): string {
  // Remove state/territory codes like " /MO/", " /DE/"
  let name = raw.replace(/\s*\/[A-Z]{2,5}\//g, "").trim();
  // Apply title case only to all-caps ASCII names
  if (name === name.toUpperCase() && /[A-Z]{2,}/.test(name)) {
    name = name
      .split(/\s+/)
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  }
  return name;
}

function toKST(isoString: string): string {
  return new Date(isoString).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CallsPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isPro = false;
  const watchlistSet = new Set<string>();

  if (user) {
    const [profileRes, watchlistRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("watchlist")
        .select("ticker")
        .eq("user_id", user.id),
    ]);

    isPro = profileRes.data?.plan === "pro";
    for (const row of watchlistRes.data ?? []) {
      watchlistSet.add(row.ticker);
    }
  }

  const { data } = await adminClient
    .from("earnings_calls")
    .select(
      "id, ticker, fiscal_quarter, fiscal_year, call_date, summary_kr, key_points, processed_at, source_url, transcript_url, tone_change, tickers(name_kr, name_en)"
    )
    .order("processed_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as EarningsCallRow[];

  const calls: EarningsCall[] = rows.map((row) => {
    const kp = (row.key_points ?? {}) as Record<string, unknown>;

    return {
      id: row.id,
      ticker: row.ticker,
      company_name:
        row.tickers?.name_kr ??
        (row.tickers?.name_en ? cleanCompanyName(row.tickers.name_en) : row.ticker),
      quarter: `Q${row.fiscal_quarter} FY${row.fiscal_year}`,
      call_date: row.call_date?.slice(0, 10) ?? row.processed_at?.slice(0, 10) ?? "",
      headline_summary: row.summary_kr ?? "",
      revenue_actual: String(kp.revenue_actual ?? ""),
      revenue_estimate: String(kp.revenue_estimate ?? ""),
      eps_actual: String(kp.eps_actual ?? ""),
      eps_estimate: String(kp.eps_estimate ?? ""),
      surprise_percent: Number(kp.surprise_percent ?? 0),
      guidance_direction: (kp.guidance_direction as GuidanceDirection) ?? "maintain",
      guidance_previous: (kp.guidance_previous as GuidanceDirection) ?? "maintain",
      guidance_summary: String(kp.guidance_summary ?? ""),
      keywords: Array.isArray(kp.keywords) ? (kp.keywords as string[]) : [],
      key_statements: Array.isArray(kp.key_statements)
        ? (kp.key_statements as KeyStatement[])
        : [],
      qa_pairs: Array.isArray(kp.qa_pairs) ? (kp.qa_pairs as QaPair[]) : [],
      keyword_changes: Array.isArray(kp.keyword_changes)
        ? (kp.keyword_changes as KeywordChange[])
        : [],
      tone_previous: String(kp.tone_previous ?? ""),
      tone_current: String(kp.tone_current ?? row.tone_change ?? ""),
      has_earnings_release: Boolean(kp.has_earnings_release),
      in_watchlist: watchlistSet.has(row.ticker),
      source_url: row.source_url ?? "",
      transcript_url: row.transcript_url ?? String(kp.transcript_url ?? ""),
      summary_generated_at: row.processed_at ? toKST(row.processed_at) : "",
    };
  });

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="어닝콜 요약" badge />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        어닝콜(실적 발표 컨퍼런스콜)이란 경영진이 투자자·애널리스트에게 실적을 직접 설명하는 자리입니다.
      </p>
      <div className="mt-6 flex-1">
        <CallsBoard calls={calls} isPro={isPro} />
      </div>
      <DashboardDisclaimer />
    </div>
  );
}
