import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FREE_LIMIT = 5;
const PRO_LIMIT = 30;

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

  // 플랜 + 현재 등록 수 확인
  const [profileRes, countRes] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
    supabase.from("watchlist").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const isPro = profileRes.data?.plan === "pro";
  const limit = isPro ? PRO_LIMIT : FREE_LIMIT;
  const current = countRes.count ?? 0;

  if (current >= limit) {
    const message = isPro
      ? "현재 와치리스트는 최대 30개까지 등록할 수 있습니다. 새 종목을 추가하려면 기존 종목을 삭제해 주세요."
      : `Free 플랜은 최대 ${FREE_LIMIT}개까지 등록 가능합니다. Pro로 업그레이드하면 최대 ${PRO_LIMIT}개까지 등록할 수 있습니다.`;
    return NextResponse.json({ error: message }, { status: 403 });
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
