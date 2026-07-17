import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { MONTHLY_BRIEF_WINDOW_DAYS } from "./limits";
import {
  computeRange,
  fetchTopCompanies,
  fetchMarketChangeStats,
  fetchPeriodComparison,
  fetchSectorTrends,
  fetchTopFilings,
  fetchEarningsHighlights,
  fetchMacroSnapshot,
  fetchTagLeaders,
  generateBriefSummary,
  type MonthlyBriefData,
} from "@/lib/watchlist-brief";

// 해당 날짜가 속한 달의 1일을 YYYY-MM-DD로 반환 (UTC)
function firstOfMonth(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export async function runMonthlyBriefCollect(): Promise<CollectResult> {
  try {
    const adminClient = createAdminClient();
    const range = computeRange(MONTHLY_BRIEF_WINDOW_DAYS);

    const [topCompanies, marketStats, comparison, sectors, filings, earningsHighlights, macro, tagLeaders] =
      await Promise.all([
        fetchTopCompanies(adminClient, range, 20),
        fetchMarketChangeStats(adminClient, range),
        fetchPeriodComparison(adminClient, range),
        fetchSectorTrends(adminClient, range, 5),
        fetchTopFilings(adminClient, range, 10),
        fetchEarningsHighlights(adminClient, range, 10),
        fetchMacroSnapshot(adminClient),
        fetchTagLeaders(adminClient, range, 8),
      ]);

    const summary = await generateBriefSummary({
      periodLabel:        "이번 달",
      top1Name:            topCompanies[0]?.name ?? "",
      newEntrantCount:     comparison.newEntrants.length,
      filingsCount:        marketStats.filingsCount,
      epsBeatCount:        marketStats.epsBeatCount,
      institutionalCount:  marketStats.institutionalCount,
      insiderBuyCount:     marketStats.insiderBuyCount,
      sentenceCount:       "3~5문장",
    });

    const data: MonthlyBriefData = {
      topCompanies,
      marketStats,
      newEntrants: comparison.newEntrants,
      sectors,
      tagLeaders,
      filings,
      earningsHighlights,
      macro,
      summary,
    };

    const monthStart = firstOfMonth(new Date());

    // monthly_briefs는 신규 테이블이라 생성된 타입에 아직 없음 (CLAUDE.md 16항)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from("monthly_briefs")
      .upsert(
        { month_start: monthStart, data, generated_at: new Date().toISOString() },
        { onConflict: "month_start" }
      );

    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      monthStart,
      topCompanies: topCompanies.length,
      newEntrants: comparison.newEntrants.length,
      summarized: !!summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/monthly-brief]", message);
    return { ok: false, error: message };
  }
}
