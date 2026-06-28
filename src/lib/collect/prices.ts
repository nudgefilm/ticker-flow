import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

interface FmpHistoricalItem {
  date: string;
  close: number;
  changePercent: number | null;
  volume: number | null;
}

interface FmpHistoricalResponse {
  symbol: string;
  historical: FmpHistoricalItem[];
}

type DayPrice = {
  date: string;
  close: number;
  change_pct: number | null;
  volume: number | null;
};

async function fetchDayPrices(
  ticker: string,
  apiKey: string
): Promise<{ rows: DayPrice[]; error?: string } | null> {
  const from = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const url =
    `https://financialmodelingprep.com/stable/historical-price-eod/full` +
    `?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&apikey=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    return { rows: [], error: `fetch error: ${String(e)}` };
  }

  if (!res.ok) return { rows: [], error: `HTTP ${res.status}` };

  let data: FmpHistoricalResponse;
  try {
    data = await res.json();
  } catch {
    return { rows: [], error: "JSON parse error" };
  }

  if (!data.historical || data.historical.length === 0) {
    return { rows: [], error: "no data" };
  }

  const rows: DayPrice[] = data.historical
    .filter((item) => item.close != null)
    .map((item) => ({
      date: item.date,
      close: Math.round(item.close * 100) / 100,
      change_pct: item.changePercent != null ? Math.round(item.changePercent * 100) / 100 : null,
      volume: item.volume ?? null,
    }));

  return { rows };
}

export async function runPricesCollect(
  tickerParam?: string | null,
  offsetParam?: number
): Promise<CollectResult> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { ok: false, error: "FMP_API_KEY not set", retryable: false };

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

    // stock_prices 행이 없는 티커 추가 — PostgREST 1000행 제한 우회: range 페이지네이션
    {
      const TICKER_PAGE = 1000;
      let from = 0;
      while (true) {
        const { data } = await adminClient
          .from("tickers")
          .select("ticker")
          .order("ticker", { ascending: true })
          .range(from, from + TICKER_PAGE - 1);
        if (!data || data.length === 0) break;
        for (const row of data) {
          if (!seen.has(row.ticker)) prioritized.push(row.ticker);
        }
        if (data.length < TICKER_PAGE) break;
        from += TICKER_PAGE;
      }
    }

    // offset + BATCH_SIZE 적용
    tickers = prioritized.slice(offset, offset + BATCH_SIZE);
  }

  let processed = 0;
  let saved = 0;
  let skipped = 0;

  for (const ticker of tickers) {
    const result = await fetchDayPrices(ticker, apiKey);
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
