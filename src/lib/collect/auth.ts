import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireCollectAuth(req: NextRequest | Request): Promise<Response | null> {
  console.log("[COLLECT RAW AUTH]", req.headers.get("authorization"));
  console.log("[COLLECT RAW COOKIE]", !!req.headers.get("cookie"));

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // 1. 서버 간 호출: Authorization: Bearer CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return null;

  // 2. 브라우저 호출: Supabase 세션 + ADMIN_EMAIL 확인
  console.log("[AUTH] cookie", !!req.headers.get("cookie"));

  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();

  console.log("[AUTH] user", data.user);
  console.log("[AUTH] email", data.user?.email);
  console.log("[AUTH] error", error);
  console.log("[AUTH] ADMIN", process.env.ADMIN_EMAIL);

  if (data.user?.email && data.user.email === process.env.ADMIN_EMAIL) return null;

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
