import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not set" }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  // 기본: 오늘부터 30일치 수집
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const from = req.nextUrl.searchParams.get("from") ?? today;
  const to = req.nextUrl.searchParams.get("to") ?? thirtyDaysLater;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub earnings: HTTP ${res.status}`);
    const data: FinnhubEarningsResponse = await res.json();
    const items = data.earningsCalendar ?? [];

    const adminClient = createAdminClient();

    // 신규 티커도 자동 upsert (실적 캘린더는 나스닥 전종목 대상)
    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.symbol || !item.date) { skipped++; continue; }

      // 신규 티커 자동 추가
      if (!tickerSet.has(item.symbol)) {
        await adminClient
          .from("tickers")
          .upsert({ ticker: item.symbol, name_en: item.symbol }, { onConflict: "ticker" });
        tickerSet.add(item.symbol);
      }

      const timeOfDay =
        item.hour === "amc" || item.hour === "bmo" ? item.hour : null;

      // UNIQUE(ticker, report_date): 중복 시 업데이트 (실적 발표 후 actual 값 갱신)
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

    return NextResponse.json({
      ok: true,
      from,
      to,
      total: items.length,
      inserted,
      skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/earnings]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
