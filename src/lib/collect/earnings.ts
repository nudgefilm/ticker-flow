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

function daysDiff(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24);
}

async function updateEarningsForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ updated: number; skipped: number }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=${apiKey}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return { updated: 0, skipped: 1 };

  const surprises: FinnhubEarningsSurprise[] = await res.json();
  if (!Array.isArray(surprises) || surprises.length === 0) return { updated: 0, skipped: 0 };

  const valid = surprises.filter((s) => s.actual != null && s.period).slice(0, 4);
  if (valid.length === 0) return { updated: 0, skipped: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const { data: dbRows } = await adminClient
    .from("earnings")
    .select("ticker, report_date, actual_eps")
    .eq("ticker", ticker)
    .lte("report_date", today)
    .limit(20);

  if (!dbRows || dbRows.length === 0) return { updated: 0, skipped: valid.length };

  let updated = 0;
  let skipped = 0;

  for (const surprise of valid) {
    const match = dbRows.find(
      (row) => row.actual_eps == null && daysDiff(surprise.period, row.report_date) <= 90
    );
    if (!match) { skipped++; continue; }

    const { error } = await adminClient
      .from("earnings")
      .update({ actual_eps: surprise.actual, eps_estimate: surprise.estimate ?? undefined })
      .eq("ticker", ticker)
      .eq("report_date", match.report_date);

    if (error) {
      console.error(`[collect/earnings-actual] ${ticker} ${match.report_date}:`, error.message);
      skipped++;
    } else {
      updated++;
    }
  }

  return { updated, skipped };
}

export async function runEarningsActualCollect(
  tickerParam?: string | null
): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

  const adminClient = createAdminClient();
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

    tickers = [...tickerSet].slice(0, 15);
  }

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const ticker of tickers) {
    const { updated, skipped } = await updateEarningsForTicker(ticker, apiKey, adminClient);
    totalUpdated += updated;
    totalSkipped += skipped;
    if (tickers.length > 1) await new Promise((r) => setTimeout(r, 300));
  }

  return { ok: true, tickers: tickers.length, upserted: totalUpdated, skipped: totalSkipped };
}
