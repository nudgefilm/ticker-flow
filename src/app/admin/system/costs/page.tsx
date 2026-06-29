import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ── 고정 비용 상수 (플랜 변경 시 여기만 수정) ─────────────────────────────
const FMP_MONTHLY       = 139.00; // Ultimate 플랜
const FINNHUB_MONTHLY   =  49.00; // Growth 플랜 (내부자 거래 포함)
const SUPABASE_MONTHLY  =  25.00; // Pro 플랜
const VERCEL_MONTHLY    =  20.00; // Pro 플랜

// ── Claude Haiku 단가 ─────────────────────────────────────────────────────
const FILING_UNIT_COST = 0.0002;
const NEWS_UNIT_COST   = 0.0001;

const FIXED_ITEMS = [
  { label: "FMP API",    plan: "Ultimate", monthly: FMP_MONTHLY },
  { label: "Finnhub API", plan: "Growth",  monthly: FINNHUB_MONTHLY },
  { label: "Supabase",  plan: "Pro",       monthly: SUPABASE_MONTHLY },
  { label: "Vercel",    plan: "Pro",       monthly: VERCEL_MONTHLY },
] as const;

const FIXED_TOTAL = FIXED_ITEMS.reduce((s, i) => s + i.monthly, 0);

export default async function CostsPage() {
  const admin = createAdminClient();

  const [filingsRes, newsRes] = await Promise.all([
    admin.from("filings").select("*", { count: "exact", head: true }).not("summary_kr", "is", null),
    admin.from("news").select("*", { count: "exact", head: true }).not("summary_kr", "is", null),
  ]);

  const filingsTranslated = filingsRes.count ?? 0;
  const newsTranslated    = newsRes.count ?? 0;

  const filingsCost = filingsTranslated * FILING_UNIT_COST;
  const newsCost    = newsTranslated    * NEWS_UNIT_COST;
  const haikuTotal  = filingsCost + newsCost;

  const grandTotal  = FIXED_TOTAL + haikuTotal;

  const usd = (n: number) => "$" + n.toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">비용 모니터링</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">월간 고정 비용 + 사용량 기반 변동 비용</p>
      </div>

      {/* ── 상단: 요약 카드 3개 ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "월간 고정 비용 합계",   value: usd(FIXED_TOTAL), sub: "FMP · Finnhub · Supabase · Vercel" },
          { label: "Claude Haiku 번역 누계", value: usd(haikuTotal),  sub: `공시 ${filingsTranslated.toLocaleString()}건 + 뉴스 ${newsTranslated.toLocaleString()}건` },
          { label: "월간 총 예상 비용",      value: usd(grandTotal),  sub: "고정 + 변동 합산" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-[#666]">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 중단: 항목별 비용 테이블 ──────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">항목별 비용 내역</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">항목</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">플랜 / 기준</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">구분</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#a6a6a6]">월 비용</th>
            </tr>
          </thead>
          <tbody>
            {/* 고정 비용 */}
            {FIXED_ITEMS.map((item) => (
              <tr key={item.label} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{item.label}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{item.plan}</td>
                <td className="px-4 py-3">
                  <span className="rounded-[3px] bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                    고정
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-white">{usd(item.monthly)}</td>
              </tr>
            ))}
            {/* 고정 소계 */}
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <td className="px-4 py-2.5 text-xs text-[#a6a6a6]" colSpan={3}>고정 소계</td>
              <td className="px-4 py-2.5 text-right text-xs font-semibold text-[#cccccc]">{usd(FIXED_TOTAL)}</td>
            </tr>

            {/* 변동 비용: Haiku 공시 */}
            <tr className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-white">Claude Haiku — 공시 번역</td>
              <td className="px-4 py-3 text-[#a6a6a6] font-mono text-xs">
                {filingsTranslated.toLocaleString()}건 × ${FILING_UNIT_COST}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-[3px] bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  변동
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-white">{usd(filingsCost)}</td>
            </tr>
            {/* 변동 비용: Haiku 뉴스 */}
            <tr className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-white">Claude Haiku — 뉴스 번역</td>
              <td className="px-4 py-3 text-[#a6a6a6] font-mono text-xs">
                {newsTranslated.toLocaleString()}건 × ${NEWS_UNIT_COST}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-[3px] bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  변동
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-white">{usd(newsCost)}</td>
            </tr>
            {/* 변동 소계 */}
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <td className="px-4 py-2.5 text-xs text-[#a6a6a6]" colSpan={3}>Anthropic API 변동 소계</td>
              <td className="px-4 py-2.5 text-right text-xs font-semibold text-[#cccccc]">{usd(haikuTotal)}</td>
            </tr>

            {/* 합계 */}
            <tr className="hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-[#cccccc] font-semibold" colSpan={3}>월간 총합</td>
              <td className="px-4 py-3 text-right text-white font-semibold">{usd(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 하단: 번역 상세 내역 (기존 유지) ─────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">번역 상세 내역</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">항목</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">번역 건수</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">건당 단가</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#a6a6a6]">예상 누계</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-white">공시 번역 (Haiku)</td>
              <td className="px-4 py-3 text-[#a6a6a6]">{filingsTranslated.toLocaleString()}건</td>
              <td className="px-4 py-3 text-[#a6a6a6] font-mono text-xs">${FILING_UNIT_COST}</td>
              <td className="px-4 py-3 text-right text-white font-medium">{usd(filingsCost)}</td>
            </tr>
            <tr className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-white">뉴스 번역 (Haiku)</td>
              <td className="px-4 py-3 text-[#a6a6a6]">{newsTranslated.toLocaleString()}건</td>
              <td className="px-4 py-3 text-[#a6a6a6] font-mono text-xs">${NEWS_UNIT_COST}</td>
              <td className="px-4 py-3 text-right text-white font-medium">{usd(newsCost)}</td>
            </tr>
            <tr className="hover:bg-[#1a1a1a] transition-colors">
              <td className="px-4 py-3 text-[#cccccc] font-medium" colSpan={3}>합계</td>
              <td className="px-4 py-3 text-right text-white font-semibold">{usd(haikuTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#666]">
        고정 비용은 플랜 변경 시 page.tsx 상단 상수를 수정하세요. Haiku 단가는 평균 토큰 수 기준 추정값입니다.
      </p>
    </div>
  );
}
