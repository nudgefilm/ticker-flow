import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeNews } from "@/lib/collect/summarize";
import type { CollectResult } from "@/lib/collect/types";

interface FinnhubNewsItem {
  category: string;
  datetime: number; // Unix timestamp (초)
  headline: string;
  id: number;
  related: string;  // ticker or ""
  source: string;
  summary: string;
  url: string;
}

export async function runNewsCollect(): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set" };

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub news: HTTP ${res.status}`);
    const items: FinnhubNewsItem[] = await res.json();

    const adminClient = createAdminClient();

    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    let skipped = 0;
    let firstError: string | undefined;

    for (const item of items) {
      if (!item.url || !item.headline) { skipped++; continue; }

      let ticker: string | null = null;
      if (item.related) {
        if (!tickerSet.has(item.related)) {
          const { error: tickerErr } = await adminClient.from("tickers").upsert(
            { ticker: item.related, name_en: item.related },
            { onConflict: "ticker", ignoreDuplicates: true }
          );
          if (!tickerErr) tickerSet.add(item.related);
        }
        if (tickerSet.has(item.related)) ticker = item.related;
      }

      const { error } = await adminClient.from("news").upsert(
        {
          ticker,
          headline: item.headline,
          source: item.source || null,
          published_at: new Date(item.datetime * 1000).toISOString(),
          url: item.url,
        },
        { onConflict: "url", ignoreDuplicates: true }
      );

      if (error) {
        firstError ??= error.message;
        console.error("[collect/news] upsert:", error.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    let summarized = 0;
    let summarizeFailed = 0;
    if (process.env.ANTHROPIC_API_KEY) {
      const s = await summarizeNews(adminClient);
      summarized = s.done;
      summarizeFailed = s.failed;
    }

    return {
      ok: true,
      total: items.length,
      inserted,
      skipped,
      summarized,
      ...(summarizeFailed > 0 && { summarizeFailed }),
      ...(firstError && { firstError }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/news]", message);
    return { ok: false, error: message };
  }
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const result = await runNewsCollect();
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
