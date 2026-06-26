import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";

interface FredObservation {
  date: string;   // "2024-01-01"
  value: string;  // "25000.0" or "." for missing
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

      if (!latest || latest.value === ".") {
        skipped++;
        continue;
      }

      const value = parseFloat(latest.value);
      const previousValue =
        prev && prev.value !== "." ? parseFloat(prev.value) : null;
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
      const message = err instanceof Error ? err.message : "Unknown";
      console.error(`[collect/macro] ${series.id}:`, message);
      skipped++;
    }
  }

  return { ok: true, total: FRED_SERIES.length, inserted, skipped };
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const result = await runMacroCollect();
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
