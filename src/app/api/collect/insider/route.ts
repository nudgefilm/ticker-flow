export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  transactionCode: string;  // "P"=buy, "S"=sell, "A"=award, etc.
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

// Finnhub transaction code → DB transaction_type
function mapTransactionType(code: string): "buy" | "sell" | null {
  if (code === "P") return "buy";
  if (code === "S") return "sell";
  return null; // A(award), D(disposition), M(exercise) 등 제외
}

// 한 티커 수집
async function collectForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  const res = await fetch(
    `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}&token=${apiKey}`
  );
  if (!res.ok) return { inserted: 0, skipped: 1 };

  const data: FinnhubInsiderResponse = await res.json();
  const transactions = data.data ?? [];

  for (const tx of transactions) {
    const transactionType = mapTransactionType(tx.transactionCode);
    if (!transactionType) continue;
    if (tx.isDerivative) continue; // 파생상품 제외

    const value =
      tx.share && tx.transactionPrice
        ? tx.share * tx.transactionPrice
        : null;

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

    // 23505 = unique_violation (중복 레코드) — 무시
    if (error && error.code !== "23505") {
      console.error(`[collect/insider] ${ticker}:`, error.message);
      skipped++;
    } else if (!error) {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function runInsiderCollect(
  tickerParam?: string | null
): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set" };

  const adminClient = createAdminClient();
  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
  } else {
    const { data: watchlistRows } = await adminClient
      .from("watchlist")
      .select("ticker");

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

    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { ok: true, tickers: tickers.length, inserted: totalInserted, skipped: totalSkipped };
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const tickerParam = req.nextUrl.searchParams.get("ticker");
  const result = await runInsiderCollect(tickerParam);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
