import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";

interface FinnhubEarningsItem {
  date: string;               // "2024-01-25"
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;               // "amc" | "bmo" | ""
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
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set" };

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

    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
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

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const result = await runEarningsCollect(from, to);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
