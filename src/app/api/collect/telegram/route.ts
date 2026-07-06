import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  return NextResponse.json({ ok: false, disabled: true, error: "텔레그램 발송이 중단되었습니다." });
}
