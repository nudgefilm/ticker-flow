import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, FROM } from "@/lib/email/resend";
import { contactAnswerEmail } from "@/lib/email/templates";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const answer = (body?.answer as string)?.trim();

  if (!answer) {
    return NextResponse.json({ error: "답변 내용을 입력해 주세요." }, { status: 400 });
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contact } = await (admin as any)
    .from("contacts")
    .select("email, subject")
    .eq("id", id)
    .maybeSingle();

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("contacts")
    .update({
      status:      "answered",
      answer,
      answered_at: new Date().toISOString(),
    })
    .eq("id", id);

  try {
    await resend.emails.send({
      from:    FROM,
      to:      contact.email,
      subject: `[TickerFlow] 문의 답변: ${contact.subject}`,
      html:    contactAnswerEmail(contact.email, contact.subject, answer),
    });
  } catch { /* 이메일 실패는 비차단 */ }

  return NextResponse.json({ success: true });
}
