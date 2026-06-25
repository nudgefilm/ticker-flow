export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { IconShieldStar } from "@tabler/icons-react";

type ProUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  plan: string;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ProGrantPage() {
  const adminClient = createAdminClient();

  const { data } = await adminClient
    .from("profiles")
    .select("id, email, created_at, plan")
    .eq("plan", "pro")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as unknown as ProUser[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Pro 수동 부여</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">특정 유저에게 Pro 플랜을 수동으로 부여합니다.</p>
      </div>

      {/* 요약 카드 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <p className="text-xs text-[#a6a6a6]">전체 Pro 유저</p>
        <p className="mt-1.5 text-2xl font-semibold text-white">{users.length}명</p>
      </div>

      {/* 부여 폼 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-6">
        <h2 className="mb-4 text-sm font-medium text-white">Pro 플랜 부여</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="mb-1.5 block text-xs text-[#a6a6a6]">이메일</label>
            <input
              type="email"
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
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            <IconShieldStar size={16} stroke={1.5} />
            Pro 부여
          </button>
        </div>
      </div>

      {/* Pro 유저 목록 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">Pro 유저 목록</h2>
        </div>
        {users.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#a6a6a6]">Pro 플랜 유저가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">부여일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">플랜</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3 text-white">{user.email ?? "-"}</td>
                  <td className="px-4 py-3 text-[#a6a6a6]">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-[4px] bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                      Pro
                    </span>
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
