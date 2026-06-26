export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runFilingsCollect } from "@/lib/collect/filings";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const dateParam = req.nextUrl.searchParams.get("date");
  const result = await runFilingsCollect(dateParam);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
