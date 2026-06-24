import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface FinnhubNewsItem {
  category: string;
  datetime: number; // Unix timestamp (초)
  headline: string;
  id: number;
  related: string;  // ticker or ""
  source: string;
  summary: string;
  url: string;
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
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub news: HTTP ${res.status}`);
    const items: FinnhubNewsItem[] = await res.json();

    const adminClient = createAdminClient();

    // ticker FK 검증용 — news는 ticker nullable이지만
    // related 값이 있을 때 DB에 존재하는 ticker만 연결
    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    let skipped = 0;
    let firstError: string | undefined;

    for (const item of items) {
      if (!item.url || !item.headline) { skipped++; continue; }

      // related가 DB에 없는 티커이면 null로 저장 (FK 위반 방지)
      const ticker =
        item.related && tickerSet.has(item.related) ? item.related : null;

      const { error } = await adminClient.from("news").upsert(
        {
          ticker,
          headline: item.headline,
          source: item.source || null,
          published_at: new Date(item.datetime * 1000).toISOString(),
          url: item.url,
        },
        { onConflict: "url", ignoreDuplicates: true }
      );

      if (error) {
        firstError ??= error.message;
        console.error("[collect/news] upsert:", error.message);
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
      ...(firstError && { firstError }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/news]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
