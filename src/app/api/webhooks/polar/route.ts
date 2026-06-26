import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type PolarEvent = {
  type: string
  data?: {
    status?: string
    user?: { email?: string }
    customer?: { email?: string }
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = req.headers.get("x-polar-signature") ?? ""
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }
    const { createHmac } = await import("crypto")
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex")
    if (signature !== expected) {
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
    event.data?.customer?.email ??
    event.data?.user?.email ??
    ""

  if (!email) {
    return NextResponse.json({ received: true })
  }

  const adminClient = createAdminClient()

  if (
    (event.type === "subscription.created" || event.type === "subscription.updated") &&
    event.data?.status === "active"
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
    event.type === "subscription.canceled" ||
    event.type === "subscription.revoked"
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
