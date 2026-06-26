import { NextRequest } from "next/server";

export async function requireCollectAuth(req: NextRequest | Request): Promise<Response | null> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // CRON_SECRET 설정됨 + 헤더 일치 → 통과
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return null;
  }

  // CRON_SECRET 미설정 → 개발 환경, 무조건 통과
  if (!cronSecret) {
    return null;
  }

  // CRON_SECRET 설정됐는데 헤더 불일치 → 401
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
