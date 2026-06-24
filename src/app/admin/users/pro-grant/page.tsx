"use client";

import { useState } from "react";
import { IconShieldStar } from "@tabler/icons-react";

const grantHistory = [
  { email: "test***@gmail.com", grantedAt: "2026-06-20", grantedBy: "admin", note: "베타 테스터" },
  { email: "press***@naver.com", grantedAt: "2026-06-15", grantedBy: "admin", note: "미디어 제공" },
];

export default function ProGrantPage() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Pro 수동 부여</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">특정 유저에게 Pro 플랜을 수동으로 부여합니다.</p>
      </div>

      {/* 부여 폼 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-6">
        <h2 className="mb-4 text-sm font-medium text-white">Pro 플랜 부여</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#a6a6a6] outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">기간</label>
            <select className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-white/20">
              <option>1개월</option>
              <option>3개월</option>
              <option>6개월</option>
              <option>12개월</option>
              <option>무기한</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">사유 (선택)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="베타 테스터, 미디어 제공 등"
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#a6a6a6] outline-none focus:border-white/20"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <IconShieldStar size={16} stroke={1.5} />
            Pro 부여
          </button>
        </div>
      </div>

      {/* 부여 이력 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">수동 부여 이력</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">부여일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">사유</th>
            </tr>
          </thead>
          <tbody>
            {grantHistory.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{row.email}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.grantedAt}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
