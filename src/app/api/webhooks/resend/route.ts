import { NextRequest, NextResponse } from "next/server"
import { resend, FROM } from "@/lib/email/resend"
import { inboundForwardEmail } from "@/lib/email/templates"

// Resend 수신 이메일 웹훅 — 인증 없음 (공개 엔드포인트)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  const from: string = body.from ?? body.sender ?? ""
  const subject: string = body.subject ?? "(제목 없음)"
  const text: string = body.text ?? body.plain ?? body.html ?? ""

  const { error } = await resend.emails.send({
    from: FROM,
    to: "nudgefilm@gmail.com",
    subject: `[TickerFlow 문의] ${subject}`,
    html: inboundForwardEmail(from, subject, text),
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
