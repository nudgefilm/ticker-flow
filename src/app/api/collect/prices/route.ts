export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runPricesCollect } from "@/lib/collect/prices";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const ticker = req.nextUrl.searchParams.get("ticker");
  const result = await runPricesCollect(ticker);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
