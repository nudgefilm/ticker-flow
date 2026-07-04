import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 와치리스트 전체 종목 + top30_daily 최근 날짜 TOP30 종목을 합산한(중복 제거) 티커 풀.
 * 공시/뉴스/내부자거래 등 수집 대상 확장에 공통으로 사용한다.
 */
export async function getCollectTargetTickers(): Promise<string[]> {
  const adminClient = createAdminClient();

  const [watchlistRes, latestDateRes] = await Promise.all([
    adminClient.from("watchlist").select("ticker"),
    adminClient
      .from("top30_daily")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const tickerSet = new Set<string>();
  for (const r of watchlistRes.data ?? []) tickerSet.add(r.ticker);

  const latestDate = latestDateRes.data?.date;
  if (latestDate) {
    const { data: top30Rows } = await adminClient
      .from("top30_daily")
      .select("ticker")
      .eq("date", latestDate);
    for (const r of top30Rows ?? []) tickerSet.add(r.ticker);
  }

  return [...tickerSet];
}
