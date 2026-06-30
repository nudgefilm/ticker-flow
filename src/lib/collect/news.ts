import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeNews } from "./summarize";
import { runStockBriefCollect } from "./brief";
import type { CollectResult } from "./types";

interface FinnhubNewsItem {
  datetime: number;
  headline: string;
  related: string;
  source: string;
  url: string;
}

export async function runNewsCollect(): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub news: HTTP ${res.status}`);
    const items: FinnhubNewsItem[] = await res.json();

    const adminClient = createAdminClient();

    // tickerSet 전체 조회 — PostgREST 1000행 제한 우회: range 페이지네이션
    const tickerSet = new Set<string>();
    {
      const TICKER_PAGE = 1000;
      let from = 0;
      while (true) {
        const { data } = await adminClient
          .from("tickers")
          .select("ticker")
          .range(from, from + TICKER_PAGE - 1);
        if (!data || data.length === 0) break;
        for (const r of data) tickerSet.add(r.ticker);
        if (data.length < TICKER_PAGE) break;
        from += TICKER_PAGE;
      }
    }
    console.log(`[collect/news] tickerSet 종목 수: ${tickerSet.size}개`);

    let inserted = 0;
    let skipped = 0;
    let firstError: string | undefined;
    const briefTickers = new Set<string>();

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
        if (ticker && briefTickers.size < 20) briefTickers.add(ticker);
      }
    }

    let summarized = 0;
    let summarizeFailed = 0;
    if (process.env.ANTHROPIC_API_KEY) {
      const s = await summarizeNews(adminClient);
      summarized = s.done;
      summarizeFailed = s.failed;

      // 신규 뉴스가 있는 종목의 BRIEF 갱신 (실패해도 collect 결과에 영향 없음)
      if (briefTickers.size > 0) {
        await Promise.allSettled(
          [...briefTickers].map((t) => runStockBriefCollect(t, "news"))
        );
      }
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
