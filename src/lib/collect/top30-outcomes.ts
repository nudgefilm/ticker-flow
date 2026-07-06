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

type PendingRow = {
  id: string;
  entry_id: string;
  ticker: string;
  selected_date: string;
  days_after: number;
};

type EntryRow = { id: string; entry_price: number | null };
type PriceRow = { ticker: string; date: string; close: number };

const MAX_PENDING = 500;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runTop30OutcomesUpdate(): Promise<CollectResult> {
  const admin = createAdminClient();
  // top30_entries/top30_outcome_results는 생성된 Supabase 타입에 없는 신규 테이블
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;

  const todayStr = new Date().toISOString().slice(0, 10);
  const trackedSet = new Set<number>(TRACKED_DAYS);

  const { data: pendingRaw, error: pendingErr } = await adminAny
    .from("top30_outcome_results")
    .select("id, entry_id, ticker, selected_date, days_after")
    .eq("status", "pending")
    .order("selected_date", { ascending: true })
    .limit(MAX_PENDING);

  if (pendingErr) {
    return { ok: false, error: pendingErr.message, retryable: true };
  }

  const pending = ((pendingRaw ?? []) as PendingRow[]).filter(
    // TRACKED_DAYS(하드코딩 금지)에 없는 days_after 값은 방어적으로 스킵
    (row) => trackedSet.has(row.days_after) && addDays(row.selected_date, row.days_after) <= todayStr
  );

  if (pending.length === 0) {
    return { ok: true, total: 0, updated: 0, skipped: 0 };
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

  const { data: pricesRaw, error: pricesErr } = await adminAny
    .from("stock_prices")
    .select("ticker, date, close")
    .in("ticker", tickers)
    .gte("date", globalMinDate)
    .order("date", { ascending: true });

  if (pricesErr) {
    return { ok: false, error: pricesErr.message, retryable: true };
  }

  const pricesByTicker = new Map<string, PriceRow[]>();
  for (const p of (pricesRaw ?? []) as PriceRow[]) {
    const arr = pricesByTicker.get(p.ticker) ?? [];
    arr.push(p);
    pricesByTicker.set(p.ticker, arr);
  }

  // 목표일 "이후 종가" = 목표일 이상인 첫 거래일 종가 (주말·휴장일 대응)
  function findCloseOnOrAfter(ticker: string, targetDate: string): number | null {
    const rows = pricesByTicker.get(ticker) ?? [];
    for (const r of rows) {
      if (r.date >= targetDate) return r.close;
    }
    return null;
  }

  let updated = 0;
  let skipped = 0;

  for (const row of pending) {
    const entryPrice = entryPriceById.get(row.entry_id) ?? null;
    const targetDate = targetDateByRowId.get(row.id)!;
    const closePrice = findCloseOnOrAfter(row.ticker, targetDate);

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

  return { ok: true, total: pending.length, updated, skipped };
}
