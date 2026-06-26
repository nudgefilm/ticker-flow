import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

const FRED_SERIES = [
  { id: "GDP",      name: "GDP",             source: "BEA" },
  { id: "CPIAUCSL", name: "CPI",             source: "BLS" },
  { id: "UNRATE",   name: "실업률",           source: "BLS" },
  { id: "FEDFUNDS", name: "기준금리",         source: "Fed" },
  { id: "DGS10",    name: "10년물 국채금리",  source: "Fed" },
  { id: "RSXFS",    name: "소매판매",         source: "Census" },
] as const;

export async function runMacroCollect(): Promise<CollectResult> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return { ok: false, error: "FRED_API_KEY not set" };

  const adminClient = createAdminClient();
  let inserted = 0;
  let skipped = 0;

  for (const series of FRED_SERIES) {
    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=${series.id}&api_key=${apiKey}&sort_order=desc&limit=2&file_type=json`;

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[collect/macro] FRED ${series.id}: HTTP ${res.status}`);
        skipped++;
        continue;
      }

      const data: FredResponse = await res.json();
      const obs = data.observations ?? [];
      const latest = obs[0];
      const prev = obs[1];

      if (!latest || latest.value === ".") { skipped++; continue; }

      const value = parseFloat(latest.value);
      const previousValue = prev && prev.value !== "." ? parseFloat(prev.value) : null;
      const releasedAt = new Date(latest.date).toISOString();

      const { error } = await adminClient.from("macro_indicators").upsert(
        {
          indicator_name: series.name,
          value,
          previous_value: previousValue,
          released_at: releasedAt,
          source: series.source,
        },
        { onConflict: "indicator_name,released_at" }
      );

      if (error) {
        console.error(`[collect/macro] upsert ${series.id}:`, error.message);
        skipped++;
      } else {
        inserted++;
      }
    } catch (err) {
      console.error(`[collect/macro] ${series.id}:`, err instanceof Error ? err.message : "Unknown");
      skipped++;
    }
  }

  return { ok: true, total: FRED_SERIES.length, inserted, skipped };
}
