"use client";

import { useState } from "react";
import { IconExternalLink, IconTrash, IconLoader2 } from "@tabler/icons-react";

export interface YoutubeChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_url: string;
  description: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  thumbnail_url: string | null;
  email_sent: boolean;
  memo: string | null;
  created_at: string;
}

function formatCount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  return n.toLocaleString("ko-KR");
}

async function patchChannel(id: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/youtube-channels/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteChannel(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/youtube-channels/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

function MemoCell({ id, initialMemo }: { id: string; initialMemo: string | null }) {
  const [value, setValue] = useState(initialMemo ?? "");
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (value === (initialMemo ?? "")) return;
    setSaving(true);
    await patchChannel(id, { memo: value });
    setSaving(false);
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="메모 입력"
      disabled={saving}
      className="w-full min-w-[10rem] rounded-md border border-white/[0.08] bg-[#0a0a0a] px-2 py-1.5 text-xs text-white placeholder-[#666] outline-none focus:border-white/20 disabled:opacity-50"
    />
  );
}

export function YoutubeChannelsTable({ channels }: { channels: YoutubeChannel[] }) {
  const [rows, setRows] = useState(channels);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleToggleEmailSent(id: string, current: boolean) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, email_sent: !current } : r)));
    const ok = await patchChannel(id, { email_sent: !current });
    if (!ok) {
      // 실패 시 롤백
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, email_sent: current } : r)));
    }
  }

  async function handleDelete(id: string, channelName: string) {
    if (!window.confirm(`"${channelName}" 채널을 목록에서 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    const ok = await deleteChannel(id);
    setDeletingId(null);
    if (ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] px-4 py-10 text-center text-sm text-[#a6a6a6]">
        수집된 채널이 없습니다. "시스템 &gt; 수동 재수집"에서 유튜브 채널 수집을 실행해주세요.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">채널명</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#a6a6a6]">구독자 수</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">채널 설명</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[#a6a6a6]">이메일 발송</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">메모</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">수집일</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className="border-b border-white/[0.04] last:border-0 hover:bg-[#1a1a1a] transition-colors"
              >
                <td className="px-4 py-3">
                  <a
                    href={c.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-medium text-white hover:text-blue-400"
                  >
                    {c.channel_name}
                    <IconExternalLink size={12} stroke={1.5} className="shrink-0 text-[#a6a6a6]" />
                  </a>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[#cccccc]">
                  {formatCount(c.subscriber_count)}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-[#a6a6a6]">
                  {c.description || "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={c.email_sent}
                    onChange={() => handleToggleEmailSent(c.id, c.email_sent)}
                    className="h-4 w-4 cursor-pointer accent-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <MemoCell id={c.id} initialMemo={c.memo} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[#a6a6a6]">
                  {new Date(c.created_at).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id, c.channel_name)}
                    disabled={deletingId === c.id}
                    className="text-[#a6a6a6] transition-colors hover:text-red-400 disabled:opacity-50"
                    aria-label="채널 삭제"
                  >
                    {deletingId === c.id ? (
                      <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
                    ) : (
                      <IconTrash size={16} stroke={1.5} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
