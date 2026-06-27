import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECTOR_KR, SECTOR_KEYWORDS } from "@/lib/sectors";
import type { SectorStat, SectorPeriod } from "@/lib/sectors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") ?? "30d") as SectorPeriod;

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const adminClient = createAdminClient();

  const [tickerRes, filingRes, newsRes] = await Promise.all([
    adminClient.from("tickers").select("ticker, sector").not("sector", "is", null),
    adminClient.from("filings").select("ticker").gte("filed_at", cutoff),
    adminClient
      .from("news")
      .select("ticker")
      .gte("published_at", cutoff)
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

  // 섹터별 공시 건수
  const sectorFilingCount: Record<string, number> = {};
  filingRows.forEach((r) => {
    const sector = tickerSectorMap[r.ticker];
    if (!sector) return;
    sectorFilingCount[sector] = (sectorFilingCount[sector] ?? 0) + 1;
  });

  // 섹터별 뉴스 건수
  const sectorNewsCount: Record<string, number> = {};
  newsRows.forEach((r) => {
    if (!r.ticker) return;
    const sector = tickerSectorMap[r.ticker];
    if (!sector) return;
    sectorNewsCount[sector] = (sectorNewsCount[sector] ?? 0) + 1;
  });

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
        keywords: SECTOR_KEYWORDS[sector] ?? [],
      };
    })
    .sort((a, b) => b.activityScore - a.activityScore);

  return NextResponse.json(sectors);
}
