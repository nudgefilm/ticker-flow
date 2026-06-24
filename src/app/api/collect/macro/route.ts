import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface FinnhubEconomicEvent {
  actual: number | null;
  country: string;
  estimate: number | null;
  impact: string;
  prev: number | null;
  time: string;    // "2024-01-12T13:30:00" or "2024-01-12"
  unit: string;
  event: string;   // "US CPI", "Fed Rate Decision" 등
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not set" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub macro: HTTP ${res.status}`);
    const raw = await res.json();

    // Finnhub는 배열 또는 {economicCalendar: [...]} 형태로 반환
    const items: FinnhubEconomicEvent[] = Array.isArray(raw)
      ? raw
      : (raw.economicCalendar ?? []);

    const adminClient = createAdminClient();

    let inserted = 0;
    let skipped = 0;

    for (const item of items) {
      if (!item.event || !item.time) { skipped++; continue; }

      let releasedAt: string;
      try {
        releasedAt = new Date(item.time).toISOString();
      } catch {
        skipped++;
        continue;
      }

      // UNIQUE(indicator_name, released_at): actual 값 업데이트 허용
      const { error } = await adminClient.from("macro_indicators").upsert(
        {
          indicator_name: item.event,
          value: item.actual ?? null,
          previous_value: item.prev ?? null,
          released_at: releasedAt,
          source: item.country || "Finnhub",
        },
        { onConflict: "indicator_name,released_at" }
      );

      if (error) {
        console.error("[collect/macro] upsert:", error.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      total: items.length,
      inserted,
      skipped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/macro]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
