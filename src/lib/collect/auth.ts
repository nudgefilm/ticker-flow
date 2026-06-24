import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Vercel Cron(Authorization: Bearer CRON_SECRET) 또는
 * 어드민 세션 쿠키 중 하나면 통과.
 * null 반환 시 인가 OK, NextResponse 반환 시 401 응답.
 */
export async function requireCollectAuth(
  req: NextRequest
): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email === process.env.ADMIN_EMAIL) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
