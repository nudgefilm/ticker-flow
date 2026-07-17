import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { WEEKLY_BRIEF_WINDOW_DAYS } from "./limits";
import {
  computeRange,
  fetchTopCompanies,
  fetchMarketChangeStats,
  fetchPeriodComparison,
  fetchSectorTrends,
  fetchTopFilings,
  fetchEarningsHighlights,
  generateBriefSummary,
  type WeeklyBriefData,
} from "@/lib/watchlist-brief";

// 해당 날짜가 속한 주(월요일 시작, UTC)의 월요일 날짜를 YYYY-MM-DD로 반환
function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=일 ... 1=월
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

export async function runWeeklyBriefCollect(): Promise<CollectResult> {
  try {
    const adminClient = createAdminClient();
    const range = computeRange(WEEKLY_BRIEF_WINDOW_DAYS);

    const [topCompanies, marketStats, comparison, sectors, filings, earningsHighlights] = await Promise.all([
      fetchTopCompanies(adminClient, range, 10),
      fetchMarketChangeStats(adminClient, range),
      fetchPeriodComparison(adminClient, range),
      fetchSectorTrends(adminClient, range, 5),
      fetchTopFilings(adminClient, range, 10),
      fetchEarningsHighlights(adminClient, range, 10),
    ]);

    const summary = await generateBriefSummary({
      periodLabel:        "이번 주",
      top1Name:            topCompanies[0]?.name ?? "",
      newEntrantCount:     comparison.newEntrants.length,
      filingsCount:        marketStats.filingsCount,
      epsBeatCount:        marketStats.epsBeatCount,
      institutionalCount:  marketStats.institutionalCount,
      insiderBuyCount:     marketStats.insiderBuyCount,
      sentenceCount:       "2~3문장",
    });

    const data: WeeklyBriefData = {
      topCompanies,
      marketStats,
      newEntrants: comparison.newEntrants,
      dropped: comparison.dropped,
      movers: comparison.movers,
      sectors,
      filings,
      earningsHighlights,
      summary,
    };

    const weekStart = mondayOf(new Date());

    // weekly_briefs는 신규 테이블이라 생성된 타입에 아직 없음 (CLAUDE.md 16항)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from("weekly_briefs")
      .upsert(
        { week_start: weekStart, data, generated_at: new Date().toISOString() },
        { onConflict: "week_start" }
      );

    if (error) return { ok: false, error: error.message };

    return {
      ok: true,
      weekStart,
      topCompanies: topCompanies.length,
      newEntrants: comparison.newEntrants.length,
      summarized: !!summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/weekly-brief]", message);
    return { ok: false, error: message };
  }
}
