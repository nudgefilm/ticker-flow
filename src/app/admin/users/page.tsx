import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = createAdminClient();

  const [totalRes, usersRes] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id, email, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const totalCount = totalRes.count ?? 0;
  const users = usersRes.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">유저 목록</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">
          총 {totalCount.toLocaleString()}명 가입 · 최신 가입순
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">플랜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">가입일</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[#a6a6a6] text-xs">
                  유저가 없습니다
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="px-4 py-3 text-white">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${
                        user.plan === "pro"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-white/[0.06] text-[#a6a6a6]"
                      }`}
                    >
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#a6a6a6]">
                    {user.created_at ? user.created_at.slice(0, 10) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 100 && (
        <p className="text-xs text-[#a6a6a6]">
          최신 100명 표시 중 (전체 {totalCount.toLocaleString()}명)
        </p>
      )}
    </div>
  );
}
