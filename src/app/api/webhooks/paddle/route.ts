import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type PaddleEvent = {
  event_type: string
  data?: {
    status?: string
    custom_data?: { email?: string } | null
  }
}

// Paddle-Signature 헤더 형식: "ts=<유닉스초>;h1=<hex HMAC-SHA256>"
// 서명 대상 문자열은 반드시 "{ts}:{원문 raw body}" (가공 금지)
// https://developer.paddle.com/webhooks/signature-verification
const TIMESTAMP_TOLERANCE_SECONDS = 300

async function isValidSignature(rawBody: string, signatureHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((pair) => pair.split("=") as [string, string])
  )
  const ts = parts.ts
  const h1 = parts.h1
  if (!ts || !h1) return false

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > TIMESTAMP_TOLERANCE_SECONDS) {
    return false
  }

  const { createHmac, timingSafeEqual } = await import("crypto")
  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex")

  const expectedBuf = Buffer.from(expected, "hex")
  const receivedBuf = Buffer.from(h1, "hex")
  if (expectedBuf.length !== receivedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = req.headers.get("paddle-signature") ?? ""
    if (!signature || !(await isValidSignature(rawBody, signature, webhookSecret))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let event: PaddleEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // customer_id만으로는 이메일을 알 수 없어(구독 웹훅에 email 필드 없음),
  // 체크아웃 시 실어 보낸 custom_data.email로 유저를 식별한다.
  const email = event.data?.custom_data?.email ?? ""
  if (!email) {
    return NextResponse.json({ received: true })
  }

  const adminClient = createAdminClient()
  const status = event.data?.status

  if (
    (event.event_type === "subscription.created" || event.event_type === "subscription.updated") &&
    status === "active"
  ) {
    const { error } = await adminClient
      .from("profiles")
      .update({ plan: "pro" })
      .eq("email", email)
    if (error) {
      return NextResponse.json({ error: "DB update failed" }, { status: 500 })
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tickerflow.net"
    const cronSecret = process.env.CRON_SECRET ?? ""
    await fetch(`${baseUrl}/api/email/pro-upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ email }),
    }).catch(() => {})
  } else if (
    event.event_type === "subscription.canceled" ||
    (event.event_type === "subscription.updated" && status === "canceled")
  ) {
    const { error } = await adminClient
      .from("profiles")
      .update({ plan: "free" })
      .eq("email", email)
    if (error) {
      return NextResponse.json({ error: "DB update failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
