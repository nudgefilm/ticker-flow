import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function classifyFormType(formType: string): string {
  if (formType === "8-K") return "8-K";
  if (formType === "10-K") return "10-K";
  if (formType === "10-Q") return "10-Q";
  if (formType === "4") return "Form 4";
  return "기타";
}

export default async function FilingsDataPage() {
  const admin = createAdminClient();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayStart = `${todayStr}T00:00:00`;
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalRes, todayRes, detailRes] = await Promise.all([
    admin.from("filings").select("*", { count: "exact", head: true }),
    admin.from("filings").select("*", { count: "exact", head: true }).gte("filed_at", todayStart),
    admin.from("filings").select("filed_at, form_type").gte("filed_at", sevenDaysAgo).order("filed_at", { ascending: false }),
  ]);

  const totalCount = totalRes.count ?? 0;
  const todayCount = todayRes.count ?? 0;
  const rows = detailRes.data ?? [];

  const byDate: Record<string, number> = {};
  const byFormType: Record<string, number> = {};

  for (const row of rows) {
    const date = row.filed_at.slice(0, 10);
    byDate[date] = (byDate[date] ?? 0) + 1;

    const ft = classifyFormType(row.form_type);
    byFormType[ft] = (byFormType[ft] ?? 0) + 1;
  }

  const dailyRows = Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 7);

  const formTypeRows = Object.entries(byFormType).sort(([, a], [, b]) => b - a);
  const sevenDayTotal = rows.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">공시 수집 현황</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">SEC EDGAR 공시 수집 상태</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "총 수집 건수", value: totalCount.toLocaleString() + "건" },
          { label: "오늘 수집 건수", value: todayCount.toLocaleString() + "건" },
          { label: "최근 7일", value: sevenDayTotal.toLocaleString() + "건" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">공시 유형별 분류 (최근 7일)</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">공시 유형</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">건수</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">비율</th>
            </tr>
          </thead>
          <tbody>
            {formTypeRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-[#a6a6a6] text-xs">수집된 공시가 없습니다</td>
              </tr>
            ) : (
              formTypeRows.map(([ft, count]) => (
                <tr key={ft} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3 text-white">{ft}</td>
                  <td className="px-4 py-3 text-white">{count.toLocaleString()}건</td>
                  <td className="px-4 py-3 text-[#a6a6a6]">
                    {sevenDayTotal > 0 ? ((count / sevenDayTotal) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">날짜별 수집 건수 (최근 7일)</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">날짜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">수집 건수</th>
            </tr>
          </thead>
          <tbody>
            {dailyRows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-[#a6a6a6] text-xs">수집된 공시가 없습니다</td>
              </tr>
            ) : (
              dailyRows.map(([date, count]) => (
                <tr key={date} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3 text-white">{date}</td>
                  <td className="px-4 py-3 text-white">{count.toLocaleString()}건</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
