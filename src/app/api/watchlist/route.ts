import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ticker = (body?.ticker as string | undefined)?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ error: "ticker 필드가 필요합니다" }, { status: 400 });
  }

  // tickers 테이블에 존재하는 종목인지 확인
  const { data: tickerRow } = await supabase
    .from("tickers")
    .select("ticker")
    .eq("ticker", ticker)
    .maybeSingle();

  if (!tickerRow) {
    return NextResponse.json({ error: `${ticker} 티커를 찾을 수 없습니다` }, { status: 404 });
  }

  const { error } = await supabase
    .from("watchlist")
    .insert({ user_id: user.id, ticker });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 등록된 종목입니다" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
