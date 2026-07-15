export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { collectTickerData } from "@/lib/collect/collect-ticker";
import { withCollectRunLog, type RunSource } from "@/lib/collect/log-run";

// 인증: CRON_SECRET 또는 로그인된 유저 세션
async function authorize(req: NextRequest): Promise<RunSource | null> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) {
    return "cron";
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? "user" : null;
}

export async function GET(req: NextRequest) {
  const source = await authorize(req);
  if (!source) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다" }, { status: 400 });
  }

  const result = await withCollectRunLog("watchlist-ticker", source, async () => {
    try {
      const data = await collectTickerData(ticker);
      return { ok: true, ticker, ...data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[api/collect/watchlist-ticker]", message);
      return { ok: false, error: message };
    }
  });

  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
