import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runMacroCollect } from "@/lib/collect/economic";
import { withCollectRunLog } from "@/lib/collect/log-run";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const result = await withCollectRunLog("macro", "cron", () => runMacroCollect());
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
