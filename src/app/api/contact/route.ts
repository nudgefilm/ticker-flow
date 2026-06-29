import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, FROM } from "@/lib/email/resend";
import { contactAdminNotifEmail } from "@/lib/email/templates";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subject = (body?.subject as string)?.trim();
  const message = (body?.message as string)?.trim();

  if (!subject || !message) {
    return NextResponse.json({ error: "제목과 내용을 모두 입력해 주세요." }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("contacts")
    .insert({
      user_id:  user.id,
      email:    user.email,
      subject,
      message,
      status:   "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from:    FROM,
      to:      "support@tickerflow.net",
      subject: `[문의] ${subject}`,
      html:    contactAdminNotifEmail(user.email ?? "", subject, message),
    });
  } catch { /* 알림 실패는 비차단 */ }

  return NextResponse.json({ id: (data as { id: string }).id });
}
