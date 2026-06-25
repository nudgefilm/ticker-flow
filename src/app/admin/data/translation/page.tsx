import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TranslationPage() {
  const admin = createAdminClient();

  const [
    filingsTotalRes,
    filingsTranslatedRes,
    newsTotalRes,
    newsTranslatedRes,
  ] = await Promise.all([
    admin.from("filings").select("*", { count: "exact", head: true }),
    admin.from("filings").select("*", { count: "exact", head: true }).not("summary_kr", "is", null),
    admin.from("news").select("*", { count: "exact", head: true }),
    admin.from("news").select("*", { count: "exact", head: true }).not("summary_kr", "is", null),
  ]);

  const filingsTotal = filingsTotalRes.count ?? 0;
  const filingsTranslated = filingsTranslatedRes.count ?? 0;
  const newsTotal = newsTotalRes.count ?? 0;
  const newsTranslated = newsTranslatedRes.count ?? 0;

  const filingsPct = filingsTotal > 0 ? (filingsTranslated / filingsTotal) * 100 : 0;
  const newsPct = newsTotal > 0 ? (newsTranslated / newsTotal) * 100 : 0;

  const totalItems = filingsTotal + newsTotal;
  const totalTranslated = filingsTranslated + newsTranslated;
  const totalPct = totalItems > 0 ? (totalTranslated / totalItems) * 100 : 0;

  const items = [
    { label: "공시 (filings)", translated: filingsTranslated, total: filingsTotal, pct: filingsPct },
    { label: "뉴스 (news)", translated: newsTranslated, total: newsTotal, pct: newsPct },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">번역 사용량</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">Claude Haiku 한국어 요약 완료 현황</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "전체 번역 완료율", value: totalPct.toFixed(1) + "%" },
          { label: "번역 완료", value: totalTranslated.toLocaleString() + "건" },
          { label: "번역 대기", value: (totalItems - totalTranslated).toLocaleString() + "건" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5 space-y-5">
        <h2 className="text-sm font-medium text-white">항목별 번역 현황</h2>
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-[#cccccc]">{item.label}</span>
              <span className="text-sm text-[#a6a6a6]">
                {item.translated.toLocaleString()} / {item.total.toLocaleString()}건 ({item.pct.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{ width: `${Math.min(item.pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">번역 상세</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">데이터 소스</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">전체</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">번역 완료</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">번역 대기</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">완료율</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.label} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{row.label}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.total.toLocaleString()}건</td>
                <td className="px-4 py-3 text-green-400">{row.translated.toLocaleString()}건</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{(row.total - row.translated).toLocaleString()}건</td>
                <td className="px-4 py-3 text-white">{row.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
