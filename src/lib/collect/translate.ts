import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { summarizeFilings, summarizeNews } from "./summarize";

export async function runTranslateCollect(): Promise<CollectResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not set", retryable: false };
  }

  try {
    const adminClient = createAdminClient();

    const { data: watchlistRows } = await adminClient
      .from("watchlist")
      .select("ticker");
    const priorityTickers = [
      ...new Set(watchlistRows?.map((r: { ticker: string }) => r.ticker) ?? []),
    ];

    const [filings, news] = await Promise.all([
      summarizeFilings(adminClient, { priorityTickers }),
      summarizeNews(adminClient, { priorityTickers }),
    ]);

    const totalFailed = filings.failed + news.failed;

    return {
      ok: true,
      summarized: filings.done + news.done,
      ...(totalFailed > 0 && {
        firstError: `번역 실패 — 공시 ${filings.failed}건, 뉴스 ${news.failed}건`,
      }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[translate]", message);
    return { ok: false, error: message };
  }
}
