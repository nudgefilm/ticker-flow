import { NextRequest, NextResponse } from "next/server"
import { resend, FROM } from "@/lib/email/resend"
import { inboundForwardEmail } from "@/lib/email/templates"

// Resend "email.received" 웹훅 payload — 메타데이터만 포함하고 본문(text/html)은
// 없다. Resend SDK 타입 정의(ReceivedEmailEventData, node_modules/resend/dist/
// index.d.mts) 기준으로 확인한 실제 구조. from/subject/email_id는 최상위가
// 아니라 data 아래에 중첩되어 있다.
type ResendInboundEvent = {
  type?: string
  data?: {
    email_id?: string
    from?: string
    subject?: string
  }
}

const BODY_FETCH_FAILED_NOTICE = "본문 조회 실패, 원본은 Resend 대시보드에서 확인 바랍니다."

// Resend 수신 이메일 웹훅 — 인증 없음 (공개 엔드포인트)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ResendInboundEvent

  // 이 엔드포인트에는 email.received 외에 email.delivered/bounced/
  // delivery_delayed 등 다른 이벤트도 함께 들어온다. 그런 이벤트는 payload에
  // data.from/data.subject가 아예 없어서, type 필터링 없이 처리하면 매번
  // "발신자 없음 · (제목 없음)" 문의 알림이 잘못 발송된다(2026-07-09, 발송
  // 지연 재시도 등으로 5분 간격 반복 발송되는 것까지 확인).
  if (body.type !== "email.received") {
    return NextResponse.json({ ok: true, skipped: body.type ?? "unknown" })
  }

  const data = body.data ?? {}

  const from: string = data.from ?? ""
  const subject: string = data.subject ?? "(제목 없음)"
  const emailId = data.email_id

  // 본문은 웹훅 payload에 포함되지 않으므로, GET /emails/receiving/{id}
  // (resend.emails.receiving.get)로 별도 조회한다. 조회에 실패해도 발신자·
  // 제목은 이미 확보했으니 포워딩 자체는 계속 진행한다.
  let text = BODY_FETCH_FAILED_NOTICE
  if (emailId) {
    try {
      const { data: email, error: fetchError } = await resend.emails.receiving.get(emailId)
      if (email) {
        text = email.text ?? email.html ?? "(본문 없음)"
      } else if (fetchError) {
        console.error("[webhooks/resend] receiving.get 실패:", fetchError.message)
      }
    } catch (err) {
      console.error("[webhooks/resend] receiving.get 예외:", err instanceof Error ? err.message : err)
    }
  }

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
