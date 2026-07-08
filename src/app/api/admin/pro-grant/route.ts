import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isProGrantPeriod, computeProExpiresAt } from "@/lib/collect/pro-expiry";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const period = typeof body?.period === "string" ? body.period : "";

  if (!email) {
    return NextResponse.json({ error: "이메일을 입력하세요." }, { status: 400 });
  }
  if (!isProGrantPeriod(period)) {
    return NextResponse.json({ error: "유효하지 않은 기간입니다." }, { status: 400 });
  }

  const expiresAt = computeProExpiresAt(period);

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .update({ plan: "pro", pro_expires_at: expiresAt })
    .eq("email", email)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "DB 업데이트 실패" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "해당 이메일의 유저를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, email, expiresAt });
}
