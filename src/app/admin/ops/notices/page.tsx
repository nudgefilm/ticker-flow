"use client";

import { useState } from "react";
import { IconEdit, IconTrash } from "@tabler/icons-react";

const notices = [
  { id: 1, title: "서비스 정식 오픈 안내", publishedAt: "2026-06-01", status: "게시중" },
  { id: 2, title: "Pro 플랜 출시 안내", publishedAt: "2026-06-10", status: "게시중" },
];

export default function NoticesPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">공지사항 관리</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">유저에게 전달할 공지사항을 작성하고 관리합니다.</p>
      </div>

      {/* 작성 폼 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-6">
        <h2 className="mb-4 text-sm font-medium text-white">새 공지사항 작성</h2>
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목"
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#a6a6a6] outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">내용</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="공지사항 내용을 입력하세요."
              rows={5}
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#a6a6a6] outline-none focus:border-white/20 resize-none"
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-white/90"
          >
            게시
          </button>
        </div>
      </div>

      {/* 공지 목록 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">게시된 공지사항</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">제목</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">게시일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">관리</th>
            </tr>
          </thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{n.title}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{n.publishedAt}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-green-400">{n.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-[#a6a6a6] hover:text-white transition-colors">
                      <IconEdit size={15} stroke={1.5} />
                    </button>
                    <button type="button" className="text-[#a6a6a6] hover:text-red-400 transition-colors">
                      <IconTrash size={15} stroke={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
