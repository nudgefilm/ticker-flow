export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runPricesCollect } from "@/lib/collect/prices";
import { withCollectRunLog } from "@/lib/collect/log-run";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const ticker = req.nextUrl.searchParams.get("ticker");
  const offsetRaw = req.nextUrl.searchParams.get("offset");
  const offset = offsetRaw !== null ? parseInt(offsetRaw, 10) : 0;

  const result = await withCollectRunLog("prices", "cron", () => runPricesCollect(ticker, isNaN(offset) ? 0 : offset));
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
