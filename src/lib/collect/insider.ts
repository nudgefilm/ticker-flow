import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  transactionCode: string;
  transactionDate: string;
  transactionPrice: number;
  change: number;
  isDerivative: boolean;
  filingDate: string;
  symbol: string;
  title?: string;
}

interface FinnhubInsiderResponse {
  data: FinnhubInsiderTransaction[];
  symbol: string;
}

function mapTransactionType(code: string): "buy" | "sell" | null {
  if (code === "P") return "buy";
  if (code === "S") return "sell";
  return null;
}

async function collectForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}&token=${apiKey}`
  );
  if (!res.ok) return { inserted: 0, skipped: 1 };

  const data: FinnhubInsiderResponse = await res.json();
  const transactions = data.data ?? [];

  let inserted = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const transactionType = mapTransactionType(tx.transactionCode);
    if (!transactionType || tx.isDerivative) continue;

    const value =
      tx.share && tx.transactionPrice ? tx.share * tx.transactionPrice : null;

    const { error } = await adminClient.from("insider_trades").insert({
      ticker,
      name: tx.name || null,
      title: tx.title || null,
      transaction_type: transactionType,
      shares: tx.share || null,
      price: tx.transactionPrice || null,
      value,
      transaction_date: tx.transactionDate || null,
      filed_at: tx.filingDate ? `${tx.filingDate}T00:00:00Z` : null,
    });

    if (error && error.code !== "23505") {
      console.error(`[collect/insider] ${ticker}:`, error.message);
      skipped++;
    } else if (!error) {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function runInsiderCollect(tickerParam?: string | null): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

  const adminClient = createAdminClient();
  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
  } else {
    const { data: watchlistRows } = await adminClient.from("watchlist").select("ticker");

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: filingRows } = await adminClient
      .from("filings")
      .select("ticker")
      .gte("filed_at", sevenDaysAgo);

    const tickerSet = new Set<string>();
    watchlistRows?.forEach((r) => tickerSet.add(r.ticker));
    filingRows?.forEach((r) => tickerSet.add(r.ticker));

    tickers = [...tickerSet].slice(0, 10);
  }

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const ticker of tickers) {
    const { inserted, skipped } = await collectForTicker(ticker, apiKey, adminClient);
    totalInserted += inserted;
    totalSkipped += skipped;
    if (tickers.length > 1) await new Promise((r) => setTimeout(r, 200));
  }

  return { ok: true, tickers: tickers.length, inserted: totalInserted, skipped: totalSkipped };
}
