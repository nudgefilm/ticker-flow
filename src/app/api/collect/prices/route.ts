import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Yahoo Finance v8 chart API (비공개 무료 엔드포인트, 인증 불필요)
interface YahooChartMeta {
  regularMarketPrice: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: YahooChartMeta;
      indicators: {
        quote: Array<{ close: (number | null)[] }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

async function fetchPriceForTicker(
  ticker: string
): Promise<{ currentPrice: number; high52: number; low52: number; return52: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TickerFlow/1.0; +https://tickerflow.net)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data: YahooChartResponse = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close ?? [];

    // 유효한 종가만 필터
    const validCloses = closes.filter((c): c is number => c != null && isFinite(c));
    if (validCloses.length < 2) return null;

    const currentPrice = meta.regularMarketPrice;
    const high52 = meta.fiftyTwoWeekHigh;
    const low52 = meta.fiftyTwoWeekLow;
    const firstClose = validCloses[0];
    const return52 = firstClose > 0
      ? ((currentPrice - firstClose) / firstClose) * 100
      : 0;

    return {
      currentPrice: Math.round(currentPrice * 100) / 100,
      high52: Math.round(high52 * 100) / 100,
      low52: Math.round(low52 * 100) / 100,
      return52: Math.round(return52 * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const adminClient = createAdminClient();
  const tickerParam = req.nextUrl.searchParams.get("ticker");

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

    // 1회 최대 20개 (Yahoo Finance rate limit 대응)
    tickers = [...tickerSet].slice(0, 20);
  }

  let upserted = 0;
  let skipped = 0;
  const collectedAt = new Date().toISOString();

  for (const ticker of tickers) {
    const price = await fetchPriceForTicker(ticker);

    if (!price) {
      skipped++;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from("stock_prices")
        .upsert(
          {
            ticker,
            current_price: price.currentPrice,
            week52_high: price.high52,
            week52_low: price.low52,
            week52_return: price.return52,
            collected_at: collectedAt,
          },
          { onConflict: "ticker" }
        );

      if (error) {
        console.error(`[collect/prices] ${ticker}:`, error.message);
        skipped++;
      } else {
        upserted++;
      }
    }

    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return NextResponse.json({
    ok: true,
    tickers: tickers.length,
    upserted,
    skipped,
  });
}
