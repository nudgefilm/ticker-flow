export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, FROM } from "@/lib/email/resend";
import { contactAnswerEmail } from "@/lib/email/templates";
import { IconMessage } from "@tabler/icons-react";

interface Contact {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

async function answerContact(formData: FormData) {
  "use server";
  const id     = formData.get("id") as string;
  const answer = (formData.get("answer") as string)?.trim();
  if (!id || !answer) return;

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contact } = await (admin as any)
    .from("contacts")
    .select("email, subject")
    .eq("id", id)
    .maybeSingle();

  if (!contact) return;

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

  revalidatePath("/admin/ops/reports");
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year:   "numeric",
    month:  "2-digit",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export default async function ReportsPage() {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("contacts")
    .select("id, email, subject, message, status, answer, answered_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const contacts = (data ?? []) as Contact[];
  const pending  = contacts.filter((c) => c.status === "pending");
  const answered = contacts.filter((c) => c.status === "answered");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">문의·신고 목록</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          유저 문의 접수 현황 · 최근 50건
        </p>
      </div>

      {/* ── 요약 카드 ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "전체",        value: contacts.length, color: "#ffffff" },
          { label: "답변 대기",   value: pending.length,  color: "#f59e0b" },
          { label: "답변 완료",   value: answered.length, color: "#34d399" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/[0.08] bg-[#111111] p-5"
          >
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p
              className="mt-1.5 text-3xl font-semibold"
              style={{ color: card.color }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── 답변 대기 ─────────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-amber-400">
            답변 대기 ({pending.length}건)
          </h2>
          {pending.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-amber-500/20 bg-[#111111] p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-white">{c.subject}</p>
                  <p className="text-xs text-[#a6a6a6]">
                    {c.email} · {fmt(c.created_at)}
                  </p>
                </div>
                <span className="shrink-0 rounded-[3px] bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  대기
                </span>
              </div>

              <div className="mb-4 rounded-lg bg-[#0a0a0a] px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#cccccc]">
                  {c.message}
                </p>
              </div>

              <form action={answerContact} className="space-y-3">
                <input type="hidden" name="id" value={c.id} />
                <textarea
                  name="answer"
                  required
                  rows={4}
                  placeholder="답변 내용을 입력하세요. 제출 시 유저 이메일로 자동 발송됩니다."
                  className="w-full resize-none rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-[#555] outline-none focus:border-white/20"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
                  >
                    답변 제출 · 이메일 발송
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* ── 전체 목록 ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-medium text-white">전체 문의 내역</h2>
        </div>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IconMessage size={32} stroke={1.5} className="text-[#a6a6a6]" />
            <p className="mt-3 text-sm text-[#a6a6a6]">접수된 문의가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">제목</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">접수일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">답변일</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="px-4 py-3">
                    {c.status === "answered" ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        대기
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#a6a6a6]">{c.email}</td>
                  <td className="max-w-xs px-4 py-3 text-[#cccccc]">
                    <p className="truncate">{c.subject}</p>
                    {c.answer && (
                      <p className="mt-0.5 truncate text-xs text-[#666]">
                        답변: {c.answer}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#a6a6a6] whitespace-nowrap">
                    {fmt(c.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#a6a6a6] whitespace-nowrap">
                    {c.answered_at ? fmt(c.answered_at) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
