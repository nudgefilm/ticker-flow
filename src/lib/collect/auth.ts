import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireCollectAuth(req: NextRequest | Request): Promise<Response | null> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // 1. 서버 간 호출: Authorization: Bearer CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return null;

  // 2. 브라우저 호출: Supabase 세션 + ADMIN_EMAIL 확인
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.email && user.email === process.env.ADMIN_EMAIL) return null;

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
