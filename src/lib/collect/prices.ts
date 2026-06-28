import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

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

async function fetchDayPrices(
  ticker: string
): Promise<{ rows: DayPrice[]; error?: string } | null> {
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
    });
  } catch (e) {
    return { rows: [], error: `fetch error: ${String(e)}` };
  }

  if (!res.ok) return { rows: [], error: `HTTP ${res.status}` };

  let data: YahooChartResponse;
  try {
    data = await res.json();
  } catch {
    return { rows: [], error: "JSON parse error" };
  }

  if (data.chart.error) return { rows: [], error: data.chart.error.description };

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

export async function runPricesCollect(
  tickerParam?: string | null,
  offsetParam?: number
): Promise<CollectResult> {
  const adminClient = createAdminClient();
  const BATCH_SIZE = 50;
  const offset = offsetParam ?? 0;
  let firstError: string | undefined;
  let total = 0;
  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
    total = 1;
  } else {
    // 전체 티커 수
    const { count } = await adminClient
      .from("tickers")
      .select("*", { count: "exact", head: true });
    total = count ?? 0;

    // stock_prices에서 우선순위 정렬 (collected_at ASC NULLS FIRST)
    // collected_at은 생성 타입에 미반영 — as any 캐스트 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: priceRows } = await (adminClient as any)
      .from("stock_prices")
      .select("ticker")
      .order("collected_at", { ascending: true, nullsFirst: true })
      .limit(5000);

    // 티커 중복 제거 (우선순위 순서 유지)
    const seen = new Set<string>();
    const prioritized: string[] = [];
    for (const row of (priceRows as { ticker: string }[] | null) ?? []) {
      if (!seen.has(row.ticker)) {
        seen.add(row.ticker);
        prioritized.push(row.ticker);
      }
    }

    // stock_prices 행이 없는 티커 추가 (미수집 종목)
    const { data: allTickers } = await adminClient
      .from("tickers")
      .select("ticker")
      .order("ticker", { ascending: true })
      .limit(10000);

    for (const row of allTickers ?? []) {
      if (!seen.has(row.ticker)) {
        prioritized.push(row.ticker);
      }
    }

    // offset + BATCH_SIZE 적용
    tickers = prioritized.slice(offset, offset + BATCH_SIZE);
  }

  let processed = 0;
  let saved = 0;
  let skipped = 0;

  for (const ticker of tickers) {
    const result = await fetchDayPrices(ticker);
    const collectedAt = new Date().toISOString();

    if (!result || result.rows.length === 0) {
      if (result?.error && !firstError) firstError = `${ticker}: ${result.error}`;
      skipped++;
    } else {
      // collected_at은 생성 타입에 미반영 — as any 캐스트 사용
      const insertRows = result.rows.map((r) => ({ ticker, ...r, collected_at: collectedAt }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from("stock_prices")
        .upsert(insertRows, { onConflict: "ticker,date" });

      if (error) {
        console.error(`[collect/prices] upsert ${ticker}:`, error.message);
        if (!firstError) firstError = `${ticker}: ${error.message}`;
        skipped++;
      } else {
        saved += result.rows.length;
      }
    }

    processed++;
    if (tickers.length > 1) await new Promise((r) => setTimeout(r, 300));
  }

  const nextOffset = offset + processed < total ? offset + processed : 0;

  return {
    ok: true,
    total,
    processed,
    saved,
    skipped,
    offset,
    nextOffset,
    ...(firstError ? { firstError } : {}),
  };
}
