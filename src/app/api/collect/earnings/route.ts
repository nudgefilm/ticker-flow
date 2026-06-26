import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runEarningsCollect } from "@/lib/collect/earnings";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const result = await runEarningsCollect(from, to);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
