export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Yahoo Finance v8 chart API
// query2 도메인 + Referer 헤더가 서버사이드 호출 차단 우회에 더 효과적
interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

type DayPrice = {
  date: string;
  close: number;
  change_pct: number | null;
  volume: number | null;
};

async function fetchDayPrices(ticker: string): Promise<
  { rows: DayPrice[]; error?: string } | null
> {
  const url =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?range=1mo&interval=1d&includePrePost=false`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://finance.yahoo.com/",
        Origin: "https://finance.yahoo.com",
      },
      // Vercel 기본 타임아웃(60s) 내에서 동작; signal 미사용
    });
  } catch (e) {
    return { rows: [], error: `fetch error: ${String(e)}` };
  }

  if (!res.ok) {
    return { rows: [], error: `HTTP ${res.status}` };
  }

  let data: YahooChartResponse;
  try {
    data = await res.json();
  } catch {
    return { rows: [], error: "JSON parse error" };
  }

  if (data.chart.error) {
    return { rows: [], error: data.chart.error.description };
  }

  const result = data.chart.result?.[0];
  if (!result) return { rows: [], error: "no result" };

  const timestamps = result.timestamp ?? [];
  const closes  = result.indicators?.quote?.[0]?.close  ?? [];
  const volumes = result.indicators?.quote?.[0]?.volume ?? [];

  const rows: DayPrice[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || !isFinite(close)) continue;

    const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    const prevClose = i > 0 ? closes[i - 1] : null;
    const change_pct =
      prevClose != null && prevClose > 0
        ? Math.round(((close - prevClose) / prevClose) * 10000) / 100
        : null;

    rows.push({
      date,
      close: Math.round(close * 100) / 100,
      change_pct,
      volume: volumes[i] ?? null,
    });
  }

  return { rows };
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
    tickers = [...tickerSet].slice(0, 20);
  }

  let upserted = 0;
  let skipped = 0;
  let firstError: string | null = null;

  for (const ticker of tickers) {
    const result = await fetchDayPrices(ticker);

    if (!result || result.rows.length === 0) {
      if (result?.error && !firstError) firstError = `${ticker}: ${result.error}`;
      skipped++;
    } else {
      // stock_prices 테이블: (ticker, date) 복합 PK
      const insertRows = result.rows.map((r) => ({ ticker, ...r }));
      const { error } = await adminClient
        .from("stock_prices")
        .upsert(insertRows, { onConflict: "ticker,date" });

      if (error) {
        console.error(`[collect/prices] upsert ${ticker}:`, error.message);
        if (!firstError) firstError = `${ticker}: ${error.message}`;
        skipped++;
      } else {
        upserted += result.rows.length;
      }
    }

    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({
    ok: true,
    tickers: tickers.length,
    upserted,
    skipped,
    firstError,
  });
}
