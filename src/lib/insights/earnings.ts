import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { EarningsRow } from "./types";

type DbClient = SupabaseClient<Database>;

export function deriveQuarter(reportDate: string): string {
  const parts = reportDate.slice(0, 10).split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const q = Math.ceil(month / 3);
  return `${String(year).slice(2)}.Q${q}`;
}

/** 과거 분기 실적만 조회 (report_date <= today). 차트용 오름차순(과거→현재)으로 반환. */
export async function fetchPastEarnings(
  supabase: DbClient,
  ticker: string,
  today: string
): Promise<EarningsRow[]> {
  const { data } = await supabase
    .from("earnings")
    .select("id, report_date, eps_estimate, actual_eps")
    .eq("ticker", ticker)
    .lte("report_date", today)
    .order("report_date", { ascending: false })
    .limit(4);

  return (data ?? [])
    .map((e) => ({
      id: e.id,
      quarter: deriveQuarter(e.report_date),
      epsEstimate: e.eps_estimate,
      epsActual: e.actual_eps,
      reportDate: e.report_date,
    }))
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate));
}
