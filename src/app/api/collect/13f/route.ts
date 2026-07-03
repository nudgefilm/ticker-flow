export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { run13fCollect } from "@/lib/collect/institutional";
import { withCollectRunLog } from "@/lib/collect/log-run";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const institution = req.nextUrl.searchParams.get("institution");
  const result = await withCollectRunLog("13f", "cron", () => run13fCollect(institution));
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
