export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runDigestCollect } from "@/lib/collect/digest";
import { withCollectRunLog } from "@/lib/collect/log-run";

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

async function handler(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const result = await withCollectRunLog("digest", "cron", () => runDigestCollect());
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
