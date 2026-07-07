import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type TickerBadgeReason = "top30" | "volume" | "sector";

export interface TargetTickerSets {
  watchlist: Set<string>;
  top30: Set<string>;
  volume: Set<string>;
  sector: Set<string>;
}

// 페이지네이션 이동마다 8천여 개 tickers를 다시 긁는 게 낭비라 결과를 캐싱한다.
// watchlist/top30/거래량/섹터 상위 종목은 크론(하루 1~2회) 단위로만 바뀌므로
// 5분 TTL이면 신선도 손실 없이 페이지 이동 시 재계산을 사실상 없앨 수 있다.
const TARGET_TICKER_SETS_TTL_SECONDS = 300;

const VOLUME_TOP_N = 20;
const SECTOR_TOP_N = 3;
const TICKER_PAGE = 1000;

/**
 * sector·market_cap이 모두 있는 tickers 전체를 페이지네이션으로 조회한다 (PostgREST
 * 1000행 제한 우회). tickers 테이블이 8천 행을 넘어가면서 순차 페이지네이션이
 * 페이지당 왕복을 하나씩 기다려 5초 이상 걸렸음 — 먼저 count만 가져와 페이지 수를
 * 구한 뒤 나머지 요청을 Promise.all로 동시에 쏴서 왕복 1회 시간으로 단축한다.
 * .range()의 정렬된 슬라이스이므로 순서대로 이어붙이면 결과는 이전과 동일하다.
 */
async function fetchTickersWithMarketCap(
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ ticker: string; sector: string | null; market_cap: number | null }[]> {
  const { count } = await adminClient
    .from("tickers")
    .select("ticker", { count: "exact", head: true })
    .not("sector", "is", null)
    .not("market_cap", "is", null);

  if (!count || count === 0) return [];

  const pageCount = Math.ceil(count / TICKER_PAGE);
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => {
      const from = i * TICKER_PAGE;
      return adminClient
        .from("tickers")
        .select("ticker, sector, market_cap")
        .not("sector", "is", null)
        .not("market_cap", "is", null)
        .order("sector", { ascending: true })
        .order("market_cap", { ascending: false })
        .range(from, from + TICKER_PAGE - 1);
    })
  );

  return pages.flatMap((page) => page.data ?? []);
}

type TargetTickerArrays = {
  watchlist: string[];
  top30: string[];
  volume: string[];
  sector: string[];
};

/**
 * 종목 풀 산정에 쓰이는 4가지 소스를 각각 배열로 조회한다 (실제 쿼리 수행부).
 * unstable_cache는 결과를 JSON으로 직렬화하므로 Set이 아닌 배열을 반환한다.
 */
async function fetchTargetTickerArrays(): Promise<TargetTickerArrays> {
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

  return {
    watchlist: [...watchlist],
    top30: [...top30],
    volume: [...volume],
    sector: [...sector],
  };
}

const getCachedTargetTickerArrays = unstable_cache(
  fetchTargetTickerArrays,
  ["target-ticker-sets"],
  { revalidate: TARGET_TICKER_SETS_TTL_SECONDS }
);

/**
 * 종목 풀 산정에 쓰이는 4가지 소스를 각각 Set으로 반환한다.
 * 수집 대상 확장(getCollectTargetTickers)과 뱃지 표시(getBadgeReasons) 양쪽에서 공용으로 사용한다.
 * 내부적으로 5분 TTL 캐시(getCachedTargetTickerArrays)를 거치므로, 같은 TTL 창 안의
 * 반복 호출(페이지네이션 등)은 DB를 다시 조회하지 않는다.
 */
export async function getTargetTickerSets(): Promise<TargetTickerSets> {
  const arrays = await getCachedTargetTickerArrays();
  return {
    watchlist: new Set(arrays.watchlist),
    top30: new Set(arrays.top30),
    volume: new Set(arrays.volume),
    sector: new Set(arrays.sector),
  };
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
