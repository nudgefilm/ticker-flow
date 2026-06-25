import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FILING_UNIT_COST = 0.0002;
const NEWS_UNIT_COST = 0.0001;

export default async function CostsPage() {
  const admin = createAdminClient();

  const [filingsRes, newsRes] = await Promise.all([
    admin
      .from("filings")
      .select("*", { count: "exact", head: true })
      .not("summary_kr", "is", null),
    admin
      .from("news")
      .select("*", { count: "exact", head: true })
      .not("summary_kr", "is", null),
  ]);

  const filingsTranslated = filingsRes.count ?? 0;
  const newsTranslated = newsRes.count ?? 0;

  const filingsCost = filingsTranslated * FILING_UNIT_COST;
  const newsCost = newsTranslated * NEWS_UNIT_COST;
  const totalCost = filingsCost + newsCost;

  const fmt = (n: number) => "$" + n.toFixed(2);

  const pending = [
    { label: "Anthropic API 직접 연동", note: "Usage API 연동 필요" },
    { label: "Vercel", note: "Vercel API 연동 필요" },
    { label: "Supabase", note: "Supabase 청구 API 연동 필요" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">비용 모니터링</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">번역 사용량 기반 예상 비용 (누계)</p>
      </div>

      {/* 예상 비용 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "공시 번역 예상 누계", value: fmt(filingsCost) },
          { label: "뉴스 번역 예상 누계", value: fmt(newsCost) },
          { label: "번역 총 예상 비용", value: fmt(totalCost) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/[0.08] bg-[#111111] p-5"
          >
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 비용 내역 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">번역 비용 내역</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">항목</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">번역 건수</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">건당 단가</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">예상 비용</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-white">공시 번역 (Haiku)</td>
              <td className="px-4 py-3 text-[#a6a6a6]">{filingsTranslated.toLocaleString()}건</td>
              <td className="px-4 py-3 text-[#a6a6a6] font-mono text-xs">${FILING_UNIT_COST}</td>
              <td className="px-4 py-3 text-white font-medium">{fmt(filingsCost)}</td>
            </tr>
            <tr className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-white">뉴스 번역 (Haiku)</td>
              <td className="px-4 py-3 text-[#a6a6a6]">{newsTranslated.toLocaleString()}건</td>
              <td className="px-4 py-3 text-[#a6a6a6] font-mono text-xs">${NEWS_UNIT_COST}</td>
              <td className="px-4 py-3 text-white font-medium">{fmt(newsCost)}</td>
            </tr>
            <tr className="hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-[#cccccc] font-medium" colSpan={3}>합계</td>
              <td className="px-4 py-3 text-white font-semibold">{fmt(totalCost)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 준비 중 항목 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">연동 준비 중</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {pending.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-[#a6a6a6]">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">{item.note}</span>
                <span className="rounded-[3px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[#a6a6a6]">
                  준비 중
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-[#a6a6a6]">
        단가는 Claude Haiku 평균 사용량 기준 추정값입니다. 실제 비용은 토큰 수에 따라 달라집니다.
      </p>
    </div>
  );
}
