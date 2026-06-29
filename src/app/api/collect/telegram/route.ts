import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runTelegramNotify } from "@/lib/notify/telegram";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const result = await runTelegramNotify();
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
