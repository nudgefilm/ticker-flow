import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runTop30OutcomesUpdate } from "@/lib/collect/top30-outcomes";
import { withCollectRunLog } from "@/lib/collect/log-run";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const result = await withCollectRunLog("top30-outcomes", "cron", () => runTop30OutcomesUpdate());
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
