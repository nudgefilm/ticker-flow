import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeCompanyDescription } from "./summarize";
import type { CollectResult } from "./types";

const FMP_BASE = "https://financialmodelingprep.com";
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

interface FmpProfile {
  description?: string | null;
  ceo?: string | null;
  fullTimeEmployees?: string | null;
  website?: string | null;
  image?: string | null;
  ipoDate?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  marketCap?: number | null;
}

function buildHeadquarters(
  city?: string | null,
  state?: string | null,
  country?: string | null
): string | null {
  const parts = [city, state, country].filter((v): v is string => Boolean(v));
  return parts.length > 0 ? parts.join(", ") : null;
}

function parseEmployees(v?: string | null): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

interface TickerProfileUpdate {
  sector?: string;
  industry?: string;
  description?: string;
  ceo?: string;
  full_time_employees?: number;
  website?: string;
  image?: string;
  ipo_date?: string;
  headquarters?: string;
  market_cap?: number;
}

export async function runProfileCollect(limit = 20): Promise<CollectResult> {
  const finnhubKey = process.env.FINNHUB_API_KEY;
  const fmpKey = process.env.FMP_API_KEY;
  if (!finnhubKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

  const adminClient = createAdminClient();
  const clampedLimit = Math.min(Math.max(1, isNaN(limit) ? 20 : limit), 200);

  const { data: tickerRows, error: fetchErr } = await adminClient
    .from("tickers")
    .select("ticker, sector, description")
    .or("sector.is.null,description.is.null")
    .limit(clampedLimit);

  if (fetchErr) return { ok: false, error: fetchErr.message };

  const rows = tickerRows ?? [];
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let firstError: string | null = null;

  for (const row of rows) {
    const ticker = row.ticker;
    const update: TickerProfileUpdate = {};
    let newDescription: string | null = null;

    try {
      if (row.sector == null) {
        const res = await fetch(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${finnhubKey}`
        );
        if (res.ok) {
          const profile: FinnhubProfile = await res.json();
          if (profile.finnhubIndustry) {
            const industry = profile.finnhubIndustry;
            update.sector = INDUSTRY_TO_SECTOR[industry] ?? industry;
            update.industry = industry;
          }
        }
        await delay(200);
      }

      if (fmpKey && row.description == null) {
        const fmpRes = await fetch(
          `${FMP_BASE}/stable/profile?symbol=${ticker}&apikey=${fmpKey}`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (fmpRes.ok) {
          const raw = await fmpRes.json();
          const p: FmpProfile | undefined = Array.isArray(raw) ? raw[0] : raw;
          if (p) {
            if (p.description) {
              update.description = p.description;
              newDescription = p.description;
            }
            if (p.ceo) update.ceo = p.ceo;
            const employees = parseEmployees(p.fullTimeEmployees);
            if (employees != null) update.full_time_employees = employees;
            if (p.website) update.website = p.website;
            if (p.image) update.image = p.image;
            if (p.ipoDate) update.ipo_date = p.ipoDate;
            const headquarters = buildHeadquarters(p.city, p.state, p.country);
            if (headquarters) update.headquarters = headquarters;
            if (p.marketCap != null) update.market_cap = p.marketCap;
          }
        }
        await delay(300);
      }

      if (Object.keys(update).length === 0) {
        skipped++;
        continue;
      }

      const { error: updateErr } = await adminClient
        .from("tickers")
        .update(update)
        .eq("ticker", ticker);

      if (updateErr) {
        errors++;
        if (!firstError) firstError = updateErr.message;
        continue;
      }

      updated++;

      if (newDescription) {
        await summarizeCompanyDescription(ticker, newDescription).catch(() => {});
      }
    } catch (err) {
      errors++;
      if (!firstError) firstError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return { ok: true, total: rows.length, updated, skipped, errors, firstError };
}
