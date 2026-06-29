export const dynamic = "force-dynamic";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { IconBell, IconCheck, IconX } from "@tabler/icons-react";

interface Notice {
  id: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  type: string;
  is_active: boolean;
  created_at: string;
}

async function createNotice(formData: FormData) {
  "use server";
  const message = (formData.get("message") as string)?.trim();
  if (!message) return;

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("notices").insert({
    message,
    link_text: (formData.get("link_text") as string) || null,
    link_url:  (formData.get("link_url")  as string) || null,
    type:      (formData.get("type")      as string) || "info",
    is_active: true,
  });

  revalidatePath("/admin/ops/notices");
}

async function toggleNotice(formData: FormData) {
  "use server";
  const id        = formData.get("id") as string;
  const isActive  = formData.get("is_active") === "true";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from("notices")
    .update({ is_active: !isActive })
    .eq("id", id);

  revalidatePath("/admin/ops/notices");
}

const TYPE_LABELS: Record<string, { label: string; cls: string }> = {
  info:    { label: "정보",   cls: "bg-blue-500/10 text-blue-400" },
  warning: { label: "주의",   cls: "bg-amber-500/10 text-amber-400" },
  success: { label: "성공",   cls: "bg-green-500/10 text-green-400" },
};

export default async function NoticesPage() {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("notices")
    .select("id, message, link_text, link_url, type, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const notices = (data ?? []) as Notice[];
  const active  = notices.filter((n) => n.is_active);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">공지사항 관리</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          배너 공지를 생성·관리합니다. 활성 공지는 랜딩·대시보드 상단에 표시됩니다.
        </p>
      </div>

      {/* ── 현재 활성 공지 ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
          <IconBell size={15} stroke={2} />
          현재 활성 공지
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-[#a6a6a6]">활성 공지 없음</p>
        ) : (
          <div className="space-y-3">
            {active.map((n) => {
              const t = TYPE_LABELS[n.type] ?? TYPE_LABELS.info;
              return (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-[#1a1a1a] p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium ${t.cls}`}>
                        {t.label}
                      </span>
                      <span className="text-[11px] text-[#666]">
                        {new Date(n.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm text-[#cccccc]">{n.message}</p>
                    {n.link_url && (
                      <p className="text-xs text-[#a6a6a6]">
                        링크: {n.link_text ?? n.link_url} → {n.link_url}
                      </p>
                    )}
                  </div>
                  <form action={toggleNotice}>
                    <input type="hidden" name="id" value={n.id} />
                    <input type="hidden" name="is_active" value={String(n.is_active)} />
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-md bg-white/[0.06] px-3 py-1.5 text-xs text-[#a6a6a6] transition-colors hover:bg-white/[0.1] hover:text-white"
                    >
                      <IconX size={12} stroke={2} />
                      비활성화
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 공지 생성 폼 ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">새 공지 등록</h2>
        <form action={createNotice} className="space-y-4">
          {/* 메시지 */}
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">공지 메시지 *</label>
            <textarea
              name="message"
              required
              rows={2}
              placeholder="유저에게 표시될 공지 내용을 입력하세요."
              className="w-full resize-none rounded-md border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-[#666] outline-none focus:border-white/20"
            />
          </div>

          {/* 타입 */}
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">유형</label>
            <select
              name="type"
              defaultValue="info"
              className="w-40 rounded-md border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-white/20"
            >
              <option value="info">정보 (파랑)</option>
              <option value="warning">주의 (노랑)</option>
              <option value="success">성공 (초록)</option>
            </select>
          </div>

          {/* 링크 (선택) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-[#a6a6a6]">링크 텍스트 (선택)</label>
              <input
                name="link_text"
                type="text"
                placeholder="자세히 보기"
                className="w-full rounded-md border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-[#666] outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#a6a6a6]">링크 URL (선택)</label>
              <input
                name="link_url"
                type="url"
                placeholder="https://..."
                className="w-full rounded-md border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder-[#666] outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              <IconCheck size={14} stroke={2.5} />
              공지 등록
            </button>
          </div>
        </form>
      </div>

      {/* ── 전체 공지 목록 ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-medium text-white">전체 공지 내역 (최근 30건)</h2>
        </div>
        {notices.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#a6a6a6]">공지 없음</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">유형</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">메시지</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">등록일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {notices.map((n) => {
                const t = TYPE_LABELS[n.type] ?? TYPE_LABELS.info;
                return (
                  <tr
                    key={n.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium ${t.cls}`}>
                        {t.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs text-[#cccccc] truncate">{n.message}</td>
                    <td className="px-4 py-3 text-xs text-[#a6a6a6] whitespace-nowrap">
                      {new Date(n.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {n.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          활성
                        </span>
                      ) : (
                        <span className="text-xs text-[#666]">비활성</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={toggleNotice}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="is_active" value={String(n.is_active)} />
                        <button
                          type="submit"
                          className="text-xs text-[#666] transition-colors hover:text-[#a6a6a6]"
                        >
                          {n.is_active ? "비활성화" : "활성화"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
