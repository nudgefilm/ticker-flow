import { createAdminClient } from "@/lib/supabase/admin";
import { PALETTE, type DataSet, type Ticker } from "@/components/admin/top30-overlay-types";

// Top 30 Ticker Overlay 실데이터 연동 — top30_daily(오늘자 30 + 어제 대비 이탈
// 최대 5) + stock_prices(최근 52주 리샘플)를 서버 컴포넌트에서 조회해
// Top30TickerOverlay(클라이언트 컴포넌트)에 props로 내려준다.

const WEEKS = 52;
const TOP_COUNT = 30;
const DROPPED_COUNT = 5;

// 티커 심볼 해시 → 고정 색상. 순위 기반(index % PALETTE.length) 배정은 순위가
// 매일 바뀔 때마다 같은 종목의 색이 흔들려 관리자가 날짜 간 패턴을 추적하기
// 어려워지므로, 심볼에 고정적으로 매핑되는 해시 방식을 쓴다.
function hashColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

// anchorDate(오늘자 top30_daily.date)를 끝점으로 하는 52주 간격 날짜 그리드.
// mock buildDataset()과 동일한 로직 — 시작점만 실제 today로 바뀐다.
function buildWeeklyGrid(anchorDateStr: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${anchorDateStr}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (WEEKS - 1) * 7);
  for (let i = 0; i < WEEKS; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

type PriceRow = { date: string; close: number };

// 그리드 날짜 이하 최신 종가를 추출하는 as-of 조인. 신규 상장 등으로 그리드
// 시작점보다 이전 데이터가 없으면 가장 이른 종가로 채운다(전방 채움).
function resampleWeekly(sortedRows: PriceRow[], grid: string[]): number[] | null {
  if (sortedRows.length === 0) return null;
  const result: number[] = [];
  let ptr = 0;
  for (const gridDate of grid) {
    while (ptr + 1 < sortedRows.length && sortedRows[ptr + 1].date <= gridDate) ptr++;
    result.push(sortedRows[ptr].date <= gridDate ? sortedRows[ptr].close : sortedRows[0].close);
  }
  return result;
}

export async function getTop30OverlayData(): Promise<DataSet | null> {
  const admin = createAdminClient();
  // top30_daily.factor_log/model_version 등은 생성된 타입에 없어 any 캐스트 사용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const { data: latestRow } = await adminAny
    .from("top30_daily")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const todayStr: string | undefined = latestRow?.date;
  if (!todayStr) return null;

  const yesterdayStr = new Date(new Date(`${todayStr}T00:00:00Z`).getTime() - 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [todayRes, yesterdayRes] = await Promise.all([
    adminAny
      .from("top30_daily")
      .select("ticker, rank")
      .eq("date", todayStr)
      .order("rank", { ascending: true })
      .limit(TOP_COUNT),
    adminAny.from("top30_daily").select("ticker, rank").eq("date", yesterdayStr),
  ]);

  const todayRows = (todayRes.data ?? []) as { ticker: string; rank: number }[];
  if (todayRows.length === 0) return null;

  const todayTickers = new Set(todayRows.map((r) => r.ticker));
  const yesterdayRows = (yesterdayRes.data ?? []) as { ticker: string; rank: number }[];

  // 어제 대비 이탈 종목 — 어제는 있었는데 오늘 top30_daily에 없는 티커
  const dropped = yesterdayRows
    .filter((r) => !todayTickers.has(r.ticker))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, DROPPED_COUNT);

  const combined = [
    ...todayRows.map((r) => ({ ticker: r.ticker, status: "top30" as const, rank: r.rank })),
    ...dropped.map((r) => ({ ticker: r.ticker, status: "dropped" as const, rank: r.rank })),
  ];

  const grid = buildWeeklyGrid(todayStr);
  const cutoff = grid[0];

  // PostgREST 기본 응답 상한(1000행)을 넘을 수 있어 range() 페이지네이션 필수 —
  // 티커 최대 35개 × 최대 365일치 ≈ 12,000행까지 나올 수 있음. date 오름차순
  // 정렬 상태에서 그냥 잘리면 최근 데이터가 통째로 빠지는 심각한 문제가 된다.
  const pricesByTicker = new Map<string, PriceRow[]>();
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data } = await adminAny
        .from("stock_prices")
        .select("ticker, date, close")
        .in("ticker", combined.map((t) => t.ticker))
        .gte("date", cutoff)
        .order("date", { ascending: true })
        .range(from, from + PAGE - 1);

      if (!data || data.length === 0) break;
      for (const p of data as { ticker: string; date: string; close: number }[]) {
        const arr = pricesByTicker.get(p.ticker) ?? [];
        arr.push({ date: p.date, close: p.close });
        pricesByTicker.set(p.ticker, arr);
      }
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const tickers: Ticker[] = [];
  for (const t of combined) {
    const prices = resampleWeekly(pricesByTicker.get(t.ticker) ?? [], grid);
    if (!prices) continue; // 가격 데이터가 전혀 없는 종목은 라인을 그릴 수 없어 제외
    tickers.push({
      symbol: t.ticker,
      color: hashColor(t.ticker),
      status: t.status,
      rank: t.rank,
      prices,
    });
  }

  if (tickers.length === 0) return null;

  return { tickers, dates: grid };
}
