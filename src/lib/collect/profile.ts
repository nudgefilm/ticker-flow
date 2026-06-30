import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const INDUSTRY_TO_SECTOR: Record<string, string> = {
  "Software": "Technology",
  "Semiconductors": "Technology",
  "Hardware": "Technology",
  "IT Services": "Technology",
  "Electronic Components": "Technology",
  "Computers and Peripherals": "Technology",
  "Biotechnology": "Healthcare",
  "Pharmaceuticals": "Healthcare",
  "Medical Devices": "Healthcare",
  "Health Care Equipment": "Healthcare",
  "Health Care Services": "Healthcare",
  "Managed Health Care": "Healthcare",
  "Banks": "Financial Services",
  "Insurance": "Financial Services",
  "Capital Markets": "Financial Services",
  "Consumer Finance": "Financial Services",
  "Financial Services": "Financial Services",
  "Asset Management": "Financial Services",
  "Retail": "Consumer Cyclical",
  "Automobiles": "Consumer Cyclical",
  "Hotels and Entertainment Services": "Consumer Cyclical",
  "Specialty Retail": "Consumer Cyclical",
  "Internet Retail": "Consumer Cyclical",
  "Food and Beverage": "Consumer Defensive",
  "Household Products": "Consumer Defensive",
  "Personal Products": "Consumer Defensive",
  "Tobacco": "Consumer Defensive",
  "Aerospace and Defense": "Industrials",
  "Machinery": "Industrials",
  "Transportation": "Industrials",
  "Commercial Services": "Industrials",
  "Construction": "Industrials",
  "Electrical Equipment": "Industrials",
  "Media": "Communication Services",
  "Telecommunications Services": "Communication Services",
  "Interactive Media": "Communication Services",
  "Entertainment": "Communication Services",
  "Oil and Gas": "Energy",
  "Energy": "Energy",
  "Renewable Energy": "Energy",
  "Chemicals": "Materials",
  "Metals and Mining": "Materials",
  "Paper and Forest Products": "Materials",
  "Real Estate": "Real Estate",
  "REITs": "Real Estate",
  "Utilities": "Utilities",
  "Electric Utilities": "Utilities",
  "Gas Utilities": "Utilities",
};

interface FinnhubProfile {
  finnhubIndustry?: string;
}

export async function runProfileCollect(limit = 20): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

  const adminClient = createAdminClient();
  const clampedLimit = Math.min(Math.max(1, isNaN(limit) ? 20 : limit), 200);

  const { data: tickerRows, error: fetchErr } = await adminClient
    .from("tickers")
    .select("ticker")
    .is("sector", null)
    .limit(clampedLimit);

  if (fetchErr) return { ok: false, error: fetchErr.message };

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

      if (!res.ok) { skipped++; await new Promise((r) => setTimeout(r, 200)); continue; }

      const profile: FinnhubProfile = await res.json();

      if (!profile.finnhubIndustry) { skipped++; await new Promise((r) => setTimeout(r, 200)); continue; }

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
