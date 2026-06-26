import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

interface FinnhubRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

async function collectAnalystForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ upserted: number; skipped: number }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/recommendation?symbol=${ticker}&token=${apiKey}`
  );
  if (!res.ok) return { upserted: 0, skipped: 1 };

  const data: FinnhubRecommendation[] = await res.json();
  if (!Array.isArray(data) || data.length === 0) return { upserted: 0, skipped: 0 };

  const recent = data.slice(0, 3);
  let upserted = 0;
  let skipped = 0;

  for (const r of recent) {
    if (!r.period) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any).from("analyst_ratings").upsert(
      {
        ticker,
        period: r.period,
        buy: r.buy ?? 0,
        hold: r.hold ?? 0,
        sell: r.sell ?? 0,
        strong_buy: r.strongBuy ?? 0,
        strong_sell: r.strongSell ?? 0,
        collected_at: new Date().toISOString(),
      },
      { onConflict: "ticker,period" }
    );

    if (error) {
      console.error(`[collect/analyst] ${ticker} ${r.period}:`, error.message);
      skipped++;
    } else {
      upserted++;
    }
  }

  return { upserted, skipped };
}

export async function runAnalystCollect(tickerParam?: string | null): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set" };

  const adminClient = createAdminClient();
  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
  } else {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: watchlistRows }, { data: filingRows }] = await Promise.all([
      adminClient.from("watchlist").select("ticker"),
      adminClient.from("filings").select("ticker").gte("filed_at", sevenDaysAgo),
    ]);

    const tickerSet = new Set<string>();
    watchlistRows?.forEach((r) => tickerSet.add(r.ticker));
    filingRows?.forEach((r) => tickerSet.add(r.ticker));

    tickers = [...tickerSet].slice(0, 15);
  }

  let totalUpserted = 0;
  let totalSkipped = 0;

  for (const ticker of tickers) {
    const { upserted, skipped } = await collectAnalystForTicker(ticker, apiKey, adminClient);
    totalUpserted += upserted;
    totalSkipped += skipped;
    if (tickers.length > 1) await new Promise((r) => setTimeout(r, 300));
  }

  return { ok: true, tickers: tickers.length, upserted: totalUpserted, skipped: totalSkipped };
}
