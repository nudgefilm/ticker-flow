import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Polar 웹훅 이벤트 타입
type PolarEvent = {
  type: string
  data?: {
    user?: { email?: string }
    customer?: { email?: string }
  }
}

// 구독 활성화 이벤트
const PRO_EVENTS = new Set(["subscription.active", "subscription.created"])
// 구독 해지 이벤트
const FREE_EVENTS = new Set(["subscription.canceled", "subscription.revoked"])

// Polar 웹훅 — 인증 없음 (공개 엔드포인트)
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // 서명 검증 (POLAR_WEBHOOK_SECRET 설정된 경우)
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = req.headers.get("webhook-signature") ?? req.headers.get("x-polar-signature") ?? ""
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    const { createHmac } = await import("crypto")
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
    if (signature !== expected && `sha256=${signature}` !== `sha256=${expected}`) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let event: PolarEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email =
    event.data?.user?.email ??
    event.data?.customer?.email ??
    ""

  if (PRO_EVENTS.has(event.type) && email) {
    const adminClient = createAdminClient()
    await adminClient.from("profiles").update({ plan: "pro" }).eq("email", email)

    // Pro 전환 이메일 발송
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://tickerflow.net"
    const cronSecret = process.env.CRON_SECRET ?? ""
    await fetch(`${baseUrl}/api/email/pro-upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ email }),
    }).catch(() => {})
  } else if (FREE_EVENTS.has(event.type) && email) {
    const adminClient = createAdminClient()
    await adminClient.from("profiles").update({ plan: "free" }).eq("email", email)
  }
  // order.paid — 로그만 (추가 처리 불필요)

  return NextResponse.json({ received: true })
}
