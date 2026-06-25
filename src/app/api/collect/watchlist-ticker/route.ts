import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { collectTickerData } from "@/lib/collect/collect-ticker";

// 인증: CRON_SECRET 또는 로그인된 유저 세션
async function authorize(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) {
    return true;
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker 파라미터가 필요합니다" }, { status: 400 });
  }

  try {
    const result = await collectTickerData(ticker);
    return NextResponse.json({ ok: true, ticker, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/collect/watchlist-ticker]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
