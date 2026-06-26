import { NextRequest } from "next/server";

export async function requireCollectAuth(req: NextRequest | Request): Promise<Response | null> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // 디버그 로그
  console.log("=== requireCollectAuth ===");
  console.log("cronSecret length:", cronSecret?.length);
  console.log("cronSecret first 10 chars:", cronSecret?.substring(0, 10));
  console.log("authHeader:", authHeader?.substring(0, 20));
  console.log("match:", cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }

  if (!cronSecret) {
    return null;
  }

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
