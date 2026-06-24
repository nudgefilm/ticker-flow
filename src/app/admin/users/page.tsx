import { IconSearch } from "@tabler/icons-react";

const users = [
  { email: "kim***@gmail.com", plan: "Pro", joinedAt: "2026-05-12", status: "활성" },
  { email: "lee***@naver.com", plan: "Free", joinedAt: "2026-06-01", status: "활성" },
  { email: "par***@kakao.com", plan: "Free", joinedAt: "2026-06-10", status: "활성" },
  { email: "cho***@gmail.com", plan: "Pro", joinedAt: "2026-04-22", status: "활성" },
  { email: "yoo***@outlook.com", plan: "Free", joinedAt: "2026-06-18", status: "활성" },
  { email: "shin***@gmail.com", plan: "Pro", joinedAt: "2026-03-14", status: "활성" },
  { email: "jung***@naver.com", plan: "Free", joinedAt: "2026-06-20", status: "활성" },
  { email: "oh***@kakao.com", plan: "Free", joinedAt: "2026-06-22", status: "활성" },
  { email: "han***@gmail.com", plan: "Free", joinedAt: "2026-06-23", status: "활성" },
  { email: "kwon***@naver.com", plan: "Free", joinedAt: "2026-06-24", status: "활성" },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">유저 목록</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">총 127명 가입</p>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch size={14} stroke={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a6a6a6]" />
          <input
            type="text"
            placeholder="이메일 검색..."
            className="w-full rounded-lg border border-white/[0.08] bg-[#111111] py-2 pl-8 pr-3 text-sm text-white placeholder:text-[#a6a6a6] outline-none focus:border-white/20"
          />
        </div>
        <select className="rounded-lg border border-white/[0.08] bg-[#111111] px-3 py-2 text-sm text-[#a6a6a6] outline-none">
          <option>전체 플랜</option>
          <option>Free</option>
          <option>Pro</option>
        </select>
      </div>

      {/* 테이블 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">플랜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">가입일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">상태</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${user.plan === "Pro" ? "bg-green-500/10 text-green-400" : "bg-white/[0.06] text-[#a6a6a6]"}`}>
                    {user.plan}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#a6a6a6]">{user.joinedAt}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-green-400">{user.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#a6a6a6]">10개 표시 중 127개 — 실제 데이터는 Supabase 연동 후 표시됩니다.</p>
    </div>
  );
}
