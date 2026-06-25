export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Finnhub /stock/recommendation 응답 형식
interface FinnhubRecommendation {
  buy: number;
  hold: number;
  period: string;      // "YYYY-MM-DD"
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

  // 가장 최근 3개 기간만 보관
  const recent = data.slice(0, 3);
  let upserted = 0;
  let skipped = 0;

  for (const r of recent) {
    if (!r.period) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from("analyst_ratings")
      .upsert(
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

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not set" }, { status: 500 });
  }

  const adminClient = createAdminClient();
  const tickerParam = req.nextUrl.searchParams.get("ticker");

  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
  } else {
    // 와치리스트 종목 + 최근 7일 공시 종목
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: watchlistRows }, { data: filingRows }] = await Promise.all([
      adminClient.from("watchlist").select("ticker"),
      adminClient.from("filings").select("ticker").gte("filed_at", sevenDaysAgo),
    ]);

    const tickerSet = new Set<string>();
    watchlistRows?.forEach((r) => tickerSet.add(r.ticker));
    filingRows?.forEach((r) => tickerSet.add(r.ticker));

    // 1회 실행당 최대 15개 (Finnhub 1 req/ticker → ~10초)
    tickers = [...tickerSet].slice(0, 15);
  }

  let totalUpserted = 0;
  let totalSkipped = 0;

  for (const ticker of tickers) {
    const { upserted, skipped } = await collectAnalystForTicker(ticker, apiKey, adminClient);
    totalUpserted += upserted;
    totalSkipped += skipped;

    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({
    ok: true,
    tickers: tickers.length,
    upserted: totalUpserted,
    skipped: totalSkipped,
  });
}
