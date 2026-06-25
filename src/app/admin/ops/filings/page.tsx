export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function OpsFilingsPage() {
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [totalRes, todayRes, translatedRes, recentRes] = await Promise.all([
    adminClient.from("filings").select("*", { count: "exact", head: true }),
    adminClient.from("filings").select("*", { count: "exact", head: true }).gte("filed_at", today),
    adminClient.from("filings").select("*", { count: "exact", head: true }).not("summary_kr", "is", null),
    adminClient
      .from("filings")
      .select("id, ticker, form_type, title, filed_at, summary_kr, url")
      .order("filed_at", { ascending: false })
      .limit(20),
  ]);

  const totalCount = totalRes.count ?? 0;
  const todayCount = todayRes.count ?? 0;
  const translatedCount = translatedRes.count ?? 0;
  const recentFilings = recentRes.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">공시 관리</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">수집된 공시를 확인합니다.</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "전체 공시", value: totalCount.toLocaleString() + "건" },
          { label: "오늘 수집", value: todayCount.toLocaleString() + "건" },
          { label: "번역 완료", value: translatedCount.toLocaleString() + "건" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 최근 공시 목록 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">최근 공시 (최신순 20건)</h2>
        </div>
        {recentFilings.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#a6a6a6]">수집된 공시가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">날짜</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">티커</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">유형</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">제목</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">번역</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">원문</th>
              </tr>
            </thead>
            <tbody>
              {recentFilings.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3 text-[#a6a6a6] whitespace-nowrap">{formatDate(row.filed_at)}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white">{row.ticker}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-[4px] bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                      {row.form_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#a6a6a6] max-w-xs truncate">{row.title ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${row.summary_kr ? "text-green-400" : "text-[#a6a6a6]"}`}>
                      {row.summary_kr ? "O" : "X"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.url ? (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        링크
                      </a>
                    ) : (
                      <span className="text-xs text-[#a6a6a6]">-</span>
                    )}
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
