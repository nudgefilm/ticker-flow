import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const admin = createAdminClient();

  const [totalRes, proRes, proUsersRes] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("plan", "pro"),
    admin
      .from("profiles")
      .select("id, email, plan, created_at")
      .eq("plan", "pro")
      .order("created_at", { ascending: false }),
  ]);

  const totalCount = totalRes.count ?? 0;
  const proCount = proRes.count ?? 0;
  const freeCount = totalCount - proCount;
  const conversionRate =
    totalCount > 0 ? ((proCount / totalCount) * 100).toFixed(1) : "0.0";
  const proUsers = proUsersRes.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">구독 현황</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">플랜별 가입자 현황</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Free 유저", value: freeCount.toLocaleString() + "명", highlight: false },
          { label: "Pro 유저", value: proCount.toLocaleString() + "명", highlight: true },
          { label: "전환율", value: conversionRate + "%", highlight: false },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/[0.08] bg-[#111111] p-5"
          >
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p
              className={`mt-1.5 text-2xl font-semibold ${
                card.highlight ? "text-green-400" : "text-white"
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">Pro 유저 목록</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">이메일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">플랜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">가입일</th>
            </tr>
          </thead>
          <tbody>
            {proUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[#a6a6a6] text-xs">
                  Pro 유저가 없습니다
                </td>
              </tr>
            ) : (
              proUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="px-4 py-3 text-white">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-[4px] bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
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

      <p className="text-xs text-[#a6a6a6]">
        결제 상세 정보(플랜 구분, 갱신일, 결제금액)는 Polar.sh 연동 후 표시됩니다.
      </p>
    </div>
  );
}
