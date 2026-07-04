import { createAdminClient } from "@/lib/supabase/admin";

export type TickerBadgeReason = "top30" | "volume" | "sector";

export interface TargetTickerSets {
  watchlist: Set<string>;
  top30: Set<string>;
  volume: Set<string>;
  sector: Set<string>;
}

const VOLUME_TOP_N = 20;
const SECTOR_TOP_N = 3;
const TICKER_PAGE = 1000;

/** sector·market_cap이 모두 있는 tickers 전체를 페이지네이션으로 조회한다 (PostgREST 1000행 제한 우회). */
async function fetchTickersWithMarketCap(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ ticker: string; sector: string | null; market_cap: number | null }[]> {
  const rows: { ticker: string; sector: string | null; market_cap: number | null }[] = [];
  let from = 0;
  while (true) {
    const { data } = await adminClient
      .from("tickers")
      .select("ticker, sector, market_cap")
      .not("sector", "is", null)
      .not("market_cap", "is", null)
      .order("sector", { ascending: true })
      .order("market_cap", { ascending: false })
      .range(from, from + TICKER_PAGE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < TICKER_PAGE) break;
    from += TICKER_PAGE;
  }
  return rows;
}

/**
 * 종목 풀 산정에 쓰이는 4가지 소스를 각각 Set으로 반환한다.
 * 수집 대상 확장(getCollectTargetTickers)과 뱃지 표시(getBadgeReasons) 양쪽에서 공용으로 사용한다.
 */
export async function getTargetTickerSets(): Promise<TargetTickerSets> {
  const adminClient = createAdminClient();

  const [watchlistRes, top30LatestRes, priceLatestRes, sectorRows] = await Promise.all([
    adminClient.from("watchlist").select("ticker"),
    adminClient
      .from("top30_daily")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from("stock_prices")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchTickersWithMarketCap(adminClient),
  ]);

  const watchlist = new Set<string>();
  for (const r of watchlistRes.data ?? []) watchlist.add(r.ticker);

  const top30 = new Set<string>();
  const top30Date = top30LatestRes.data?.date;
  if (top30Date) {
    const { data: top30Rows } = await adminClient
      .from("top30_daily")
      .select("ticker")
      .eq("date", top30Date);
    for (const r of top30Rows ?? []) top30.add(r.ticker);
  }

  const volume = new Set<string>();
  const priceDate = priceLatestRes.data?.date;
  if (priceDate) {
    const { data: volumeRows } = await adminClient
      .from("stock_prices")
      .select("ticker, volume")
      .eq("date", priceDate)
      .not("volume", "is", null)
      .order("volume", { ascending: false })
      .limit(VOLUME_TOP_N);
    for (const r of volumeRows ?? []) volume.add(r.ticker);
  }

  // sectorRows는 sector 오름차순 → market_cap 내림차순 정렬 상태 — 섹터가 바뀔 때마다 카운터 리셋
  const sector = new Set<string>();
  let currentSector: string | null = null;
  let countInSector = 0;
  for (const row of sectorRows) {
    if (row.sector !== currentSector) {
      currentSector = row.sector;
      countInSector = 0;
    }
    if (countInSector < SECTOR_TOP_N) {
      sector.add(row.ticker);
      countInSector++;
    }
  }

  return { watchlist, top30, volume, sector };
}

/**
 * 와치리스트 + top30_daily 최근 TOP30 + 거래량 상위 + 섹터별 시가총액 상위 종목을
 * 합산한(중복 제거) 티커 풀. 공시/뉴스/내부자거래 등 수집 대상 확장에 공통으로 사용한다.
 */
export async function getCollectTargetTickers(): Promise<string[]> {
  const sets = await getTargetTickerSets();
  return [...new Set([...sets.watchlist, ...sets.top30, ...sets.volume, ...sets.sector])];
}

/** 특정 티커가 어떤 뱃지(TOP30 선정/거래량 상위/섹터 주목)에 해당하는지 판정한다. */
export function getBadgeReasons(
  ticker: string,
  sets: Pick<TargetTickerSets, "top30" | "volume" | "sector">
): TickerBadgeReason[] {
  const reasons: TickerBadgeReason[] = [];
  if (sets.top30.has(ticker)) reasons.push("top30");
  if (sets.volume.has(ticker)) reasons.push("volume");
  if (sets.sector.has(ticker)) reasons.push("sector");
  return reasons;
}
