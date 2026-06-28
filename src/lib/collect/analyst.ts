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
): Promise<{ saved: number; skipped: number; error?: string }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/recommendation?symbol=${ticker}&token=${apiKey}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return { saved: 0, skipped: 1, error: `HTTP ${res.status}` };

  const data: FinnhubRecommendation[] = await res.json();
  if (!Array.isArray(data) || data.length === 0) return { saved: 0, skipped: 0 };

  const recent = data.slice(0, 3);
  let saved = 0;
  let skipped = 0;
  const collectedAt = new Date().toISOString();

  for (const r of recent) {
    if (!r.period) continue;

    // collected_at은 생성 타입에 미반영 — as any 캐스트 사용
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
        collected_at: collectedAt,
      },
      { onConflict: "ticker,period" }
    );

    if (error) {
      console.error(`[collect/analyst] ${ticker} ${r.period}:`, error.message);
      skipped++;
    } else {
      saved++;
    }
  }

  return { saved, skipped };
}

export async function runAnalystCollect(
  tickerParam?: string | null,
  offsetParam?: number
): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

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

    // analyst_ratings에서 우선순위 정렬 (collected_at ASC NULLS FIRST)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: analystRows } = await (adminClient as any)
      .from("analyst_ratings")
      .select("ticker")
      .order("collected_at", { ascending: true, nullsFirst: true })
      .limit(5000);

    // 티커 중복 제거 (우선순위 순서 유지)
    const seen = new Set<string>();
    const prioritized: string[] = [];
    for (const row of (analystRows as { ticker: string }[] | null) ?? []) {
      if (!seen.has(row.ticker)) {
        seen.add(row.ticker);
        prioritized.push(row.ticker);
      }
    }

    // analyst_ratings 행이 없는 티커 추가 (미수집 종목)
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
    try {
      const res = await collectAnalystForTicker(ticker, apiKey, adminClient);
      saved += res.saved;
      skipped += res.skipped;
      if (res.error && !firstError) firstError = res.error;
    } catch (err) {
      skipped++;
      if (!firstError) firstError = err instanceof Error ? err.message : String(err);
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
