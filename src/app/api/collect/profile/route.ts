export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runProfileCollect } from "@/lib/collect/profile";
import { withCollectRunLog } from "@/lib/collect/log-run";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10);
  const result = await withCollectRunLog("profile", "cron", () => runProfileCollect(limit));
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
