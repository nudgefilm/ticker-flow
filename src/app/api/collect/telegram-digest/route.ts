export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runTelegramDigest } from "@/lib/notify/telegram-digest";

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const result = await runTelegramDigest();
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
