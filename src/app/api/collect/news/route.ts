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

    // FK 검증용 티커 목록 (루프 안에서 신규 추가 시 tickerSet도 갱신)
    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    let skipped = 0;
    let firstError: string | undefined;

    for (const item of items) {
      if (!item.url || !item.headline) { skipped++; continue; }

      // related 티커가 DB에 없으면 자동 upsert (이름 정보가 없으므로 ticker를 placeholder로 사용,
      // ignoreDuplicates: true로 시드된 실제 이름은 덮어쓰지 않음)
      let ticker: string | null = null;
      if (item.related) {
        if (!tickerSet.has(item.related)) {
          const { error: tickerErr } = await adminClient.from("tickers").upsert(
            { ticker: item.related, name_en: item.related },
            { onConflict: "ticker", ignoreDuplicates: true }
          );
          if (!tickerErr) tickerSet.add(item.related);
        }
        if (tickerSet.has(item.related)) ticker = item.related;
      }

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
