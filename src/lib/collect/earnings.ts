import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

// ── earnings calendar (upcoming) ──────────────────────────────────────────────

interface FinnhubEarningsItem {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface FinnhubEarningsResponse {
  earningsCalendar: FinnhubEarningsItem[];
}

export async function runEarningsCollect(
  from?: string | null,
  to?: string | null
): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const fromDate = from ?? today;
  const toDate = to ?? thirtyDaysLater;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${fromDate}&to=${toDate}&token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub earnings: HTTP ${res.status}`);
    const data: FinnhubEarningsResponse = await res.json();
    const items = data.earningsCalendar ?? [];

    const adminClient = createAdminClient();

    const { data: knownRows } = await adminClient.from("tickers").select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.symbol || !item.date) { skipped++; continue; }

      if (!tickerSet.has(item.symbol)) {
        await adminClient
          .from("tickers")
          .upsert({ ticker: item.symbol, name_en: item.symbol }, { onConflict: "ticker" });
        tickerSet.add(item.symbol);
      }

      const timeOfDay =
        item.hour === "amc" || item.hour === "bmo" ? item.hour : null;

      const { error } = await adminClient.from("earnings").upsert(
        {
          ticker: item.symbol,
          report_date: item.date,
          time_of_day: timeOfDay,
          eps_estimate: item.epsEstimate ?? null,
          revenue_estimate: item.revenueEstimate ?? null,
          actual_eps: item.epsActual ?? null,
          actual_revenue: item.revenueActual ?? null,
        },
        { onConflict: "ticker,report_date" }
      );

      if (error) {
        console.error("[collect/earnings] upsert:", error.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    return { ok: true, from: fromDate, to: toDate, total: items.length, inserted, skipped };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/earnings]", message);
    return { ok: false, error: message };
  }
}

// ── earnings actual / surprise ─────────────────────────────────────────────────

interface FinnhubEarningsSurprise {
  actual: number | null;
  estimate: number | null;
  period: string;
  quarter: number;
  symbol: string;
  year: number;
}

async function updateEarningsForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ saved: number; skipped: number; error?: string }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=${apiKey}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return { saved: 0, skipped: 1, error: `HTTP ${res.status}` };

  const surprises: FinnhubEarningsSurprise[] = await res.json();
  if (!Array.isArray(surprises) || surprises.length === 0) return { saved: 0, skipped: 0 };

  // actual이 있는 최근 4분기만
  const valid = surprises.filter((s) => s.actual != null && s.period).slice(0, 4);
  if (valid.length === 0) return { saved: 0, skipped: 0 };

  let saved = 0;
  let skipped = 0;
  const collectedAt = new Date().toISOString();

  for (const surprise of valid) {
    // collected_at은 아직 생성 타입에 미반영 — as any 캐스트 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any).from("earnings").upsert(
      {
        ticker: surprise.symbol,
        report_date: surprise.period,
        eps_estimate: surprise.estimate ?? null,
        actual_eps: surprise.actual,
        collected_at: collectedAt,
      },
      { onConflict: "ticker,report_date" }
    );

    if (error) {
      console.error(`[collect/earnings-actual] ${ticker} ${surprise.period}:`, error.message);
      skipped++;
    } else {
      saved++;
    }
  }

  return { saved, skipped };
}

export async function runEarningsActualCollect(
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

    // earnings 테이블에서 우선순위 정렬:
    // 1) actual_eps IS NULL 먼저 (실제값 미수집)
    // 2) collected_at ASC (오래된 순)
    // collected_at은 생성 타입에 미반영 — as any 캐스트 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: earningsRows } = await (adminClient as any)
      .from("earnings")
      .select("ticker")
      .order("actual_eps", { ascending: true, nullsFirst: true })
      .order("collected_at", { ascending: true, nullsFirst: true })
      .limit(5000);

    // 티커 중복 제거 (우선순위 순서 유지)
    const seen = new Set<string>();
    const prioritized: string[] = [];
    for (const row of (earningsRows as { ticker: string }[] | null) ?? []) {
      if (!seen.has(row.ticker)) {
        seen.add(row.ticker);
        prioritized.push(row.ticker);
      }
    }

    // earnings 행이 없는 티커 추가 (미수집 종목)
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
      const res = await updateEarningsForTicker(ticker, apiKey, adminClient);
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
