import { NextRequest, NextResponse } from "next/server"
import { requireCollectAuth } from "@/lib/collect/auth"
import { resend, FROM } from "@/lib/email/resend"
import { proUpgradeEmail } from "@/lib/email/templates"

export async function POST(req: NextRequest) {
  const authError = await requireCollectAuth(req)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const email: string = body.email ?? ""
  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 })
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Pro 플랜이 시작되었습니다 ✨",
    html: proUpgradeEmail(email),
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
