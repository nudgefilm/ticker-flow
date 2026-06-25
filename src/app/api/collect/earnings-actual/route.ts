export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Finnhub /stock/earnings 응답 (fiscal quarter end 기준)
interface FinnhubEarningsSurprise {
  actual: number | null;
  estimate: number | null;
  period: string;    // "YYYY-MM-DD" (회계 분기 마감일)
  quarter: number;
  surprise: number | null;
  surprisePercent: number | null;
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
  // Finnhub 어닝서프라이즈 조회 (최근 4분기)
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=${apiKey}`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return { updated: 0, skipped: 1 };

  const surprises: FinnhubEarningsSurprise[] = await res.json();
  if (!Array.isArray(surprises) || surprises.length === 0) return { updated: 0, skipped: 0 };

  // actual 값이 있는 최근 4분기만 처리
  const valid = surprises
    .filter((s) => s.actual != null && s.period)
    .slice(0, 4);

  if (valid.length === 0) return { updated: 0, skipped: 0 };

  // DB에서 해당 티커의 과거 실적 행 조회 (actual_eps NULL인 것만)
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
    // Finnhub period(회계 분기 마감) ↔ DB report_date(발표일) 매칭:
    // 발표일은 분기 마감 후 30~90일 사이에 위치
    const match = dbRows.find(
      (row) =>
        row.actual_eps == null &&
        daysDiff(surprise.period, row.report_date) <= 90
    );

    if (!match) {
      skipped++;
      continue;
    }

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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: watchlistRows }, { data: filingRows }] = await Promise.all([
      adminClient.from("watchlist").select("ticker"),
      adminClient.from("filings").select("ticker").gte("filed_at", sevenDaysAgo),
    ]);

    const tickerSet = new Set<string>();
    watchlistRows?.forEach((r) => tickerSet.add(r.ticker));
    filingRows?.forEach((r) => tickerSet.add(r.ticker));

    // 1회 최대 15개 (Finnhub API 300ms 딜레이)
    tickers = [...tickerSet].slice(0, 15);
  }

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const ticker of tickers) {
    const { updated, skipped } = await updateEarningsForTicker(ticker, apiKey, adminClient);
    totalUpdated += updated;
    totalSkipped += skipped;

    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return NextResponse.json({
    ok: true,
    tickers: tickers.length,
    upserted: totalUpdated,
    skipped: totalSkipped,
  });
}
