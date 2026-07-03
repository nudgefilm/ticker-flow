import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import ProGate from "@/components/dashboard/pro-gate";
import CallsBoard from "@/components/dashboard/calls-board";
import type { EarningsCall, GuidanceDirection, KeyStatement, QaPair, KeywordChange } from "@/lib/earnings-calls";
import DataSources from "@/components/dashboard/insights/data-sources";

export const dynamic = "force-dynamic";

type EarningsCallRow = {
  id: string;
  ticker: string;
  fiscal_quarter: number;
  fiscal_year: number;
  call_date: string | null;
  headline_summary: string | null;
  revenue_actual: string | null;
  revenue_estimate: string | null;
  eps_actual: string | null;
  eps_estimate: string | null;
  surprise_percent: number | null;
  guidance_direction: string | null;
  guidance_previous: string | null;
  guidance_summary: string | null;
  keywords: string[] | null;
  key_statements: KeyStatement[] | null;
  qa_pairs: QaPair[] | null;
  keyword_changes: KeywordChange[] | null;
  tone_previous: string | null;
  tone_current: string | null;
  has_earnings_release: boolean | null;
  processed_at: string | null;
  source_url: string | null;
  transcript_url: string | null;
  summary_generated_at: string | null;
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
      "id, ticker, fiscal_quarter, fiscal_year, call_date, headline_summary, revenue_actual, revenue_estimate, eps_actual, eps_estimate, surprise_percent, guidance_direction, guidance_previous, guidance_summary, keywords, key_statements, qa_pairs, keyword_changes, tone_previous, tone_current, has_earnings_release, processed_at, source_url, transcript_url, summary_generated_at, tickers(name_kr, name_en)"
    )
    .order("call_date", { ascending: false, nullsFirst: false })
    .order("processed_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as EarningsCallRow[];

  function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  }
  const dataUpdatedAt = rows[0]?.processed_at ? fmtDate(rows[0].processed_at) : null;

  function toGuidanceDirection(v: string | null): GuidanceDirection {
    return v === "up" || v === "down" ? v : "maintain";
  }

  const calls: EarningsCall[] = rows.map((row) => {
    return {
      id: row.id,
      ticker: row.ticker,
      company_name:
        row.tickers?.name_kr ??
        (row.tickers?.name_en ? cleanCompanyName(row.tickers.name_en) : row.ticker),
      quarter: `Q${row.fiscal_quarter} FY${row.fiscal_year}`,
      call_date: row.call_date?.slice(0, 10) ?? row.processed_at?.slice(0, 10) ?? "",
      headline_summary: row.headline_summary ?? "",
      revenue_actual: row.revenue_actual ?? "",
      revenue_estimate: row.revenue_estimate ?? "",
      eps_actual: row.eps_actual ?? "",
      eps_estimate: row.eps_estimate ?? "",
      surprise_percent: row.surprise_percent ?? 0,
      guidance_direction: toGuidanceDirection(row.guidance_direction),
      guidance_previous: toGuidanceDirection(row.guidance_previous),
      guidance_summary: row.guidance_summary ?? "",
      keywords: row.keywords ?? [],
      key_statements: row.key_statements ?? [],
      qa_pairs: row.qa_pairs ?? [],
      keyword_changes: row.keyword_changes ?? [],
      tone_previous: row.tone_previous ?? "",
      tone_current: row.tone_current ?? "",
      has_earnings_release: row.has_earnings_release ?? false,
      in_watchlist: watchlistSet.has(row.ticker),
      source_url: row.source_url ?? "",
      transcript_url: row.transcript_url ?? "",
      summary_generated_at: row.summary_generated_at
        ? toKST(row.summary_generated_at)
        : row.processed_at
          ? toKST(row.processed_at)
          : "",
    };
  });

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="어닝콜 요약" badge />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        어닝콜(실적 발표 컨퍼런스콜)이란 경영진이 투자자·애널리스트에게 실적을 직접 설명하는 자리입니다.
      </p>
      <div className="mt-6 flex-1">
        <ProGate
          iconName="microphone"
          title="어닝콜 요약은 Pro 전용 기능입니다"
          description="1시간이 넘는 어닝콜을 한국어로 요약합니다.&#10;핵심 발언, Q&A, 가이던스 변화를 한눈에 확인하세요."
        >
          <CallsBoard calls={calls} isPro={isPro} />
        </ProGate>
      </div>
      <div className="mt-6">
        <DataSources
          description="미국 증권거래위원회(SEC EDGAR) 공시 데이터를 기반으로 제공됩니다."
          updatedAt={dataUpdatedAt}
        />
      </div>
      <DashboardDisclaimer />
    </div>
  );
}
