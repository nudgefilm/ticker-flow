import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { TRACKED_DAYS } from "@/lib/outcomes/config";

// 티커플로우 스크리너 2.5단계 — TOP30 선정 후 30/60/90일(TRACKED_DAYS) 시점의
// 실제 가격 성과를 채워 넣는다. 배점(가중치)에는 전혀 반영하지 않으며,
// 2~3개월 데이터 축적 후 4단계(배점 설계)의 근거 자료로만 사용한다.
// CLAUDE.md 18항 어드민 전용 규제 예외 구간 — 사용자 노출 API/화면에 절대 포함하지 않는다.
//
// status='pending'→'complete' 전환은 각 행에 대해 최초 1회만 수행한다.
// 이미 status='complete'인 행은 이 함수가 절대 다시 건드리지 않는다
// (top30_outcome_results도 top30_entries와 마찬가지로 완료된 기록은 사실상
// 불변으로 취급 — 명백한 수집 오류 보정은 관리자 수동 작업의 예외 영역).
//
// entry_price 백필 예외: TOP30 선정이 장중(13:35 UTC)에 실행되어 선정 시점에는
// 당일 종가가 존재할 수 없으므로 top30_entries.entry_price는 null로 생성될 수
// 있다. 이는 "이미 확정된 값의 수정"이 아니라 "아직 확정되지 않은 null을 최초
// 1회 채우는 것"이므로 top30_entries 불변 원칙의 예외로 취급한다 — 이미
// entry_price가 채워진 행은 이 함수가 절대 다시 덮어쓰지 않는다(.is("entry_price", null) 가드).

type PendingOutcomeRow = {
  id: string;
  entry_id: string;
  ticker: string;
  selected_date: string;
  days_after: number;
};

type EntryRow = { id: string; entry_price: number | null };
type MissingEntryRow = { id: string; ticker: string; selected_date: string };
type PriceRow = { ticker: string; date: string; close: number };

const MAX_ROWS = 500;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 목표일 "이후 종가" = 목표일 이상인 첫 거래일 종가 (주말·휴장일 대응)
function findCloseOnOrAfter(rows: PriceRow[], targetDate: string): number | null {
  for (const r of rows) {
    if (r.date >= targetDate) return r.close;
  }
  return null;
}

async function fetchPricesByTicker(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminAny: any,
  tickers: string[],
  fromDate: string
): Promise<{ map: Map<string, PriceRow[]>; error: string | null }> {
  if (tickers.length === 0) return { map: new Map(), error: null };

  const { data, error } = await adminAny
    .from("stock_prices")
    .select("ticker, date, close")
    .in("ticker", tickers)
    .gte("date", fromDate)
    .order("date", { ascending: true });

  if (error) return { map: new Map(), error: error.message };

  const map = new Map<string, PriceRow[]>();
  for (const p of (data ?? []) as PriceRow[]) {
    const arr = map.get(p.ticker) ?? [];
    arr.push(p);
    map.set(p.ticker, arr);
  }
  return { map, error: null };
}

async function backfillMissingEntryPrices(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminAny: any
): Promise<{ filled: number; stillMissing: number; error?: string }> {
  const { data: missingRaw, error: missingErr } = await adminAny
    .from("top30_entries")
    .select("id, ticker, selected_date")
    .is("entry_price", null)
    .limit(MAX_ROWS);

  if (missingErr) return { filled: 0, stillMissing: 0, error: missingErr.message };

  const missing = (missingRaw ?? []) as MissingEntryRow[];
  if (missing.length === 0) return { filled: 0, stillMissing: 0 };

  const tickers = Array.from(new Set(missing.map((m) => m.ticker)));
  const minDate = missing.reduce((min, m) => (m.selected_date < min ? m.selected_date : min), missing[0].selected_date);

  const { map: pricesByTicker, error: priceErr } = await fetchPricesByTicker(adminAny, tickers, minDate);
  if (priceErr) return { filled: 0, stillMissing: 0, error: priceErr };

  let filled = 0;
  let stillMissing = 0;

  for (const m of missing) {
    const price = findCloseOnOrAfter(pricesByTicker.get(m.ticker) ?? [], m.selected_date);
    if (price == null) {
      stillMissing++;
      continue;
    }

    // 최초 1회만 채운다 — 이미 값이 있으면 절대 덮어쓰지 않음
    const { error: updateErr } = await adminAny
      .from("top30_entries")
      .update({ entry_price: price })
      .eq("id", m.id)
      .is("entry_price", null);

    if (updateErr) {
      console.error(`[collect/top30-outcomes] entry_price backfill ${m.ticker}:`, updateErr.message);
      stillMissing++;
    } else {
      filled++;
    }
  }

  return { filled, stillMissing };
}

export async function runTop30OutcomesUpdate(): Promise<CollectResult> {
  const admin = createAdminClient();
  // top30_entries/top30_outcome_results는 생성된 Supabase 타입에 없는 신규 테이블
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const todayStr = new Date().toISOString().slice(0, 10);
  const trackedSet = new Set<number>(TRACKED_DAYS);

  const entryPriceBackfill = await backfillMissingEntryPrices(adminAny);
  if (entryPriceBackfill.error) {
    return { ok: false, error: entryPriceBackfill.error, retryable: true };
  }

  const { data: pendingRaw, error: pendingErr } = await adminAny
    .from("top30_outcome_results")
    .select("id, entry_id, ticker, selected_date, days_after")
    .eq("status", "pending")
    .order("selected_date", { ascending: true })
    .limit(MAX_ROWS);

  if (pendingErr) {
    return { ok: false, error: pendingErr.message, retryable: true };
  }

  const pending = ((pendingRaw ?? []) as PendingOutcomeRow[]).filter(
    // TRACKED_DAYS(하드코딩 금지)에 없는 days_after 값은 방어적으로 스킵
    (row) => trackedSet.has(row.days_after) && addDays(row.selected_date, row.days_after) <= todayStr
  );

  if (pending.length === 0) {
    return {
      ok: true,
      total: 0,
      updated: 0,
      skipped: 0,
      entryPriceFilled: entryPriceBackfill.filled,
      entryPriceStillMissing: entryPriceBackfill.stillMissing,
    };
  }

  // entry_id 기준 유일한 기준 — entry_price는 반드시 top30_entries에서 entry_id로 조회한다.
  // (이 테이블의 ticker/selected_date로 별도 조회해 entry_price를 구하지 않는다)
  const entryIds = Array.from(new Set(pending.map((row) => row.entry_id)));
  const { data: entriesRaw, error: entriesErr } = await adminAny
    .from("top30_entries")
    .select("id, entry_price")
    .in("id", entryIds);

  if (entriesErr) {
    return { ok: false, error: entriesErr.message, retryable: true };
  }

  const entryPriceById = new Map<string, number | null>(
    ((entriesRaw ?? []) as EntryRow[]).map((e) => [e.id, e.entry_price])
  );

  // 티커별로 필요한 최소 목표일 이후 가격을 한 번에 조회 (개별 조회 대신 배치)
  const targetDateByRowId = new Map<string, string>();
  const minTargetDateByTicker = new Map<string, string>();
  for (const row of pending) {
    const target = addDays(row.selected_date, row.days_after);
    targetDateByRowId.set(row.id, target);
    const cur = minTargetDateByTicker.get(row.ticker);
    if (!cur || target < cur) minTargetDateByTicker.set(row.ticker, target);
  }

  const tickers = Array.from(minTargetDateByTicker.keys());
  const globalMinDate = tickers.reduce(
    (min, t) => (minTargetDateByTicker.get(t)! < min ? minTargetDateByTicker.get(t)! : min),
    todayStr
  );

  const { map: pricesByTicker, error: pricesErr } = await fetchPricesByTicker(adminAny, tickers, globalMinDate);
  if (pricesErr) {
    return { ok: false, error: pricesErr, retryable: true };
  }

  let updated = 0;
  let skipped = 0;

  for (const row of pending) {
    const entryPrice = entryPriceById.get(row.entry_id) ?? null;
    const targetDate = targetDateByRowId.get(row.id)!;
    const closePrice = findCloseOnOrAfter(pricesByTicker.get(row.ticker) ?? [], targetDate);

    if (closePrice == null) {
      // 아직 해당 시점 가격 데이터가 수집되지 않음 — 다음 실행에서 재시도
      skipped++;
      continue;
    }

    const returnPct =
      entryPrice != null && entryPrice !== 0 ? ((closePrice - entryPrice) / entryPrice) * 100 : null;

    const { error: updateErr } = await adminAny
      .from("top30_outcome_results")
      .update({ close_price: closePrice, return_pct: returnPct, status: "complete" })
      .eq("id", row.id)
      .eq("status", "pending"); // 이미 complete로 전환된 행은 절대 재수정하지 않음

    if (updateErr) {
      console.error(`[collect/top30-outcomes] ${row.ticker}:`, updateErr.message);
      skipped++;
    } else {
      updated++;
    }
  }

  return {
    ok: true,
    total: pending.length,
    updated,
    skipped,
    entryPriceFilled: entryPriceBackfill.filled,
    entryPriceStillMissing: entryPriceBackfill.stillMissing,
  };
}
