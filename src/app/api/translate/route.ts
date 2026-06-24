import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeFilings, summarizeNews } from "@/lib/collect/summarize";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY not set" },
      { status: 500 }
    );
  }

  try {
    const adminClient = createAdminClient();

    // 와치리스트 등록 종목 우선 번역
    const { data: watchlistRows } = await adminClient
      .from("watchlist")
      .select("ticker");
    const priorityTickers = [
      ...new Set(watchlistRows?.map((r: { ticker: string }) => r.ticker) ?? []),
    ];

    const [filings, news] = await Promise.all([
      summarizeFilings(adminClient, { priorityTickers }),
      summarizeNews(adminClient, { priorityTickers }),
    ]);

    const totalFailed = filings.failed + news.failed;

    return NextResponse.json({
      ok: true,
      summarized: filings.done + news.done,
      ...(totalFailed > 0 && {
        firstError: `번역 실패 — 공시 ${filings.failed}건, 뉴스 ${news.failed}건`,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[translate]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
