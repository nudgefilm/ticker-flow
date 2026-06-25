import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import SectorTreemap, { type SectorStat } from "@/components/dashboard/sector-treemap";

export const dynamic = "force-dynamic";

const SECTOR_KR: Record<string, string> = {
  "Technology": "기술",
  "Healthcare": "헬스케어",
  "Financials": "금융",
  "Consumer Discretionary": "경기소비재",
  "Industrials": "산업재",
  "Communication Services": "커뮤니케이션",
  "Consumer Staples": "필수소비재",
  "Energy": "에너지",
  "Utilities": "유틸리티",
  "Real Estate": "부동산",
  "Materials": "소재",
};

export default async function SectorsPage() {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tickerRes, filingRes, newsRes] = await Promise.all([
    supabase.from("tickers").select("ticker, sector").not("sector", "is", null),
    supabase.from("filings").select("ticker").gte("filed_at", thirtyDaysAgo),
    supabase
      .from("news")
      .select("ticker")
      .gte("published_at", sevenDaysAgo)
      .not("ticker", "is", null),
  ]);

  const tickerRows = tickerRes.data ?? [];
  const filingRows = filingRes.data ?? [];
  const newsRows = newsRes.data ?? [];

  // ticker → sector 매핑
  const tickerSectorMap: Record<string, string> = {};
  tickerRows.forEach((r) => {
    if (r.sector) tickerSectorMap[r.ticker] = r.sector;
  });

  // 섹터별 종목 수
  const sectorTickerCount: Record<string, number> = {};
  tickerRows.forEach((r) => {
    if (!r.sector) return;
    sectorTickerCount[r.sector] = (sectorTickerCount[r.sector] ?? 0) + 1;
  });

  // 섹터별 공시 건수 (30일)
  const sectorFilingCount: Record<string, number> = {};
  filingRows.forEach((r) => {
    const sector = tickerSectorMap[r.ticker];
    if (!sector) return;
    sectorFilingCount[sector] = (sectorFilingCount[sector] ?? 0) + 1;
  });

  // 섹터별 뉴스 건수 (7일)
  const sectorNewsCount: Record<string, number> = {};
  newsRows.forEach((r) => {
    if (!r.ticker) return;
    const sector = tickerSectorMap[r.ticker];
    if (!sector) return;
    sectorNewsCount[sector] = (sectorNewsCount[sector] ?? 0) + 1;
  });

  // 섹터별 집계
  const sectors: SectorStat[] = Object.keys(sectorTickerCount)
    .map((sector) => {
      const filingCount = sectorFilingCount[sector] ?? 0;
      const newsCount = sectorNewsCount[sector] ?? 0;
      return {
        sector,
        sectorKr: SECTOR_KR[sector] ?? sector,
        tickerCount: sectorTickerCount[sector],
        filingCount,
        newsCount,
        activityScore: filingCount * 2 + newsCount,
      };
    })
    .sort((a, b) => b.activityScore - a.activityScore);

  return (
    <div className="flex h-full flex-col gap-6">
      <DashboardHeader title="섹터 히트맵" badge />

      {/* 부제 */}
      <p className="text-sm text-[#a6a6a6]">
        공시 활동량(30일)과 뉴스 활동량(7일) 기준으로 섹터 크기를 표시합니다.
      </p>

      {/* 트리맵 카드 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-6">
        {/* 범례 */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-[2px]"
                style={{ background: "rgba(96,165,250,0.35)" }}
              />
              <span className="text-xs text-[#cccccc]">활동 활발</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-[2px]"
                style={{ background: "rgba(96,165,250,0.18)" }}
              />
              <span className="text-xs text-[#cccccc]">활동 보통</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-[2px]"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <span className="text-xs text-[#cccccc]">활동 적음</span>
            </div>
          </div>
          <p className="text-xs text-[#a6a6a6]">활동 점수 = 공시(30일) × 2 + 뉴스(7일)</p>
        </div>

        <SectorTreemap sectors={sectors} />
      </div>

      {/* 섹터 요약 테이블 */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                섹터
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                종목 수
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                공시 (30일)
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                뉴스 (7일)
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                활동 점수
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#a6a6a6]">
                  섹터 데이터를 수집 중입니다.
                </td>
              </tr>
            ) : (
              sectors.map((s) => (
                <tr
                  key={s.sector}
                  className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.04]"
                >
                  <td className="px-5 py-3 font-medium text-white">{s.sectorKr}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-[#a6a6a6]">
                    {s.tickerCount}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-[#a6a6a6]">
                    {s.filingCount}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-[#a6a6a6]">
                    {s.newsCount}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums font-medium text-[#cccccc]">
                    {s.activityScore}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 면책 문구 */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
