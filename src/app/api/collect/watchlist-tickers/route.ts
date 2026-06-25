import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { collectTickerData } from "@/lib/collect/collect-ticker";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const adminClient = createAdminClient();

  const { data: rows } = await adminClient
    .from("watchlist")
    .select("ticker");

  const tickers = [...new Set((rows ?? []).map((r) => r.ticker))];
  if (tickers.length === 0) {
    return NextResponse.json({ ok: true, tickers: 0, filings: 0, news: 0 });
  }

  let totalFilings = 0;
  let totalNews    = 0;
  const errors: string[] = [];

  for (const ticker of tickers) {
    try {
      const result = await collectTickerData(ticker);
      totalFilings += result.filings;
      totalNews    += result.news;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      errors.push(`${ticker}: ${msg}`);
      console.error("[api/collect/watchlist-tickers]", ticker, err);
    }
  }

  return NextResponse.json({
    ok: true,
    tickers: tickers.length,
    filings: totalFilings,
    news:    totalNews,
    ...(errors.length > 0 && { errors }),
  });
}
