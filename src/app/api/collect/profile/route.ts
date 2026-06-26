export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const INDUSTRY_TO_SECTOR: Record<string, string> = {
  // Technology
  "Software": "Technology",
  "Semiconductors": "Technology",
  "Hardware": "Technology",
  "IT Services": "Technology",
  "Electronic Components": "Technology",
  "Computers and Peripherals": "Technology",
  // Healthcare
  "Biotechnology": "Healthcare",
  "Pharmaceuticals": "Healthcare",
  "Medical Devices": "Healthcare",
  "Health Care Equipment": "Healthcare",
  "Health Care Services": "Healthcare",
  "Managed Health Care": "Healthcare",
  // Financials
  "Banks": "Financials",
  "Insurance": "Financials",
  "Capital Markets": "Financials",
  "Consumer Finance": "Financials",
  "Financial Services": "Financials",
  "Asset Management": "Financials",
  // Consumer Discretionary
  "Retail": "Consumer Discretionary",
  "Automobiles": "Consumer Discretionary",
  "Hotels and Entertainment Services": "Consumer Discretionary",
  "Specialty Retail": "Consumer Discretionary",
  "Internet Retail": "Consumer Discretionary",
  // Consumer Staples
  "Food and Beverage": "Consumer Staples",
  "Household Products": "Consumer Staples",
  "Personal Products": "Consumer Staples",
  "Tobacco": "Consumer Staples",
  // Industrials
  "Aerospace and Defense": "Industrials",
  "Machinery": "Industrials",
  "Transportation": "Industrials",
  "Commercial Services": "Industrials",
  "Construction": "Industrials",
  "Electrical Equipment": "Industrials",
  // Communication Services
  "Media": "Communication Services",
  "Telecommunications Services": "Communication Services",
  "Interactive Media": "Communication Services",
  "Entertainment": "Communication Services",
  // Energy
  "Oil and Gas": "Energy",
  "Energy": "Energy",
  "Renewable Energy": "Energy",
  // Materials
  "Chemicals": "Materials",
  "Metals and Mining": "Materials",
  "Paper and Forest Products": "Materials",
  // Real Estate
  "Real Estate": "Real Estate",
  "REITs": "Real Estate",
  // Utilities
  "Utilities": "Utilities",
  "Electric Utilities": "Utilities",
  "Gas Utilities": "Utilities",
};

interface FinnhubProfile {
  name?: string;
  ticker?: string;
  exchange?: string;
  finnhubIndustry?: string;
  weburl?: string;
  logo?: string;
  marketCapitalization?: number;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  console.log("[profile] header check", {
    authExists: !!authHeader,
    authLength: authHeader?.length,
    authPrefix: authHeader?.slice(0, 15),
    cronExists: !!cronSecret,
    cronLength: cronSecret?.length,
    cronPrefix: cronSecret?.slice(0, 15),
    match: authHeader === `Bearer ${cronSecret}`,
  });

  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "FINNHUB_API_KEY not set" }, { status: 500 });
  }

  const adminClient = createAdminClient();

  // ?limit=N 파라미터 (기본 20, 최대 50)
  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 50);

  // sector IS NULL인 종목 조회
  const { data: tickerRows, error: fetchErr } = await adminClient
    .from("tickers")
    .select("ticker")
    .is("sector", null)
    .limit(limit);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  const tickers = (tickerRows ?? []).map((r) => r.ticker);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let firstError: string | null = null;

  for (const ticker of tickers) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`
      );

      if (!res.ok) {
        skipped++;
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const profile: FinnhubProfile = await res.json();

      if (!profile.finnhubIndustry) {
        skipped++;
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      const industry = profile.finnhubIndustry;
      const sector = INDUSTRY_TO_SECTOR[industry] ?? industry;

      const { error: updateErr } = await adminClient
        .from("tickers")
        .update({ sector, industry })
        .eq("ticker", ticker);

      if (updateErr) {
        errors++;
        if (!firstError) firstError = updateErr.message;
      } else {
        updated++;
      }
    } catch (err) {
      errors++;
      if (!firstError) firstError = err instanceof Error ? err.message : "Unknown error";
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    ok: true,
    total: tickers.length,
    updated,
    skipped,
    errors,
    firstError,
  });
}
