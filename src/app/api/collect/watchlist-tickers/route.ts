export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runWatchlistTickersCollect } from "@/lib/collect/watchlist";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const result = await runWatchlistTickersCollect();
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
