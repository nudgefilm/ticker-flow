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

export interface ProfileCollectResult {
  ok: boolean;
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  firstError: string | null;
}

export async function runProfileCollect(limit = 20): Promise<ProfileCollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { ok: false, total: 0, updated: 0, skipped: 0, errors: 1, firstError: "FINNHUB_API_KEY not set" };
  }

  const adminClient = createAdminClient();
  const clampedLimit = Math.min(Math.max(1, isNaN(limit) ? 20 : limit), 50);

  const { data: tickerRows, error: fetchErr } = await adminClient
    .from("tickers")
    .select("ticker")
    .is("sector", null)
    .limit(clampedLimit);

  if (fetchErr) {
    return { ok: false, total: 0, updated: 0, skipped: 0, errors: 1, firstError: fetchErr.message };
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

  return { ok: true, total: tickers.length, updated, skipped, errors, firstError };
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
  const result = await runProfileCollect(limitParam);

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
