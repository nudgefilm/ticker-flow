import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

// FMP stable 엔드포인트(/stable/historical-price-eod/full)는 배열을 직접
// 반환한다 (v3의 { symbol, historical: [] } 구조가 아님). f0661a3 커밋(Yahoo→FMP
// 전환) 때 이 차이를 놓쳐 6/28부터 모든 티커가 "no data"로 스킵되던 회귀
// 버그가 있었다 — seed-prices.ts의 Array.isArray() 분기 패턴을 그대로 재사용한다.
interface FmpHistoricalItem {
  date: string;
  close: number | null;
  changePercent: number | null;
  volume: number | null;
}

type DayPrice = {
  date: string;
  close: number;
  change_pct: number | null;
  volume: number | null;
};

async function fetchDayPrices(
  ticker: string,
  apiKey: string
): Promise<{ rows: DayPrice[]; error?: string } | null> {
  const from = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const url =
    `https://financialmodelingprep.com/stable/historical-price-eod/full` +
    `?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}&apikey=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    return { rows: [], error: `fetch error: ${String(e)}` };
  }

  if (!res.ok) return { rows: [], error: `HTTP ${res.status}` };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: any;
  try {
    raw = await res.json();
  } catch {
    return { rows: [], error: "JSON parse error" };
  }

  // stable API: 배열 직접 반환 / v3 호환: { symbol, historical: [] } (혹시 모를 폴백)
  const items: FmpHistoricalItem[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.historical)
    ? raw.historical
    : [];

  if (items.length === 0) {
    return { rows: [], error: "no data" };
  }

  const rows: DayPrice[] = items
    .filter((item) => item.close != null)
    .map((item) => ({
      date: item.date,
      close: Math.round(item.close! * 100) / 100,
      change_pct: item.changePercent != null ? Math.round(item.changePercent * 100) / 100 : null,
      volume: item.volume ?? null,
    }));

  return { rows };
}

export async function runPricesCollect(
  tickerParam?: string | null,
  offsetParam?: number
): Promise<CollectResult> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { ok: false, error: "FMP_API_KEY not set", retryable: false };

  const adminClient = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = adminClient as any;
  const BATCH_SIZE = 50;
  const offset = offsetParam ?? 0;
  let firstError: string | undefined;
  let total = 0;
  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
    total = 1;
  } else {
    // 전체 티커 수
    const { count } = await adminClient
      .from("tickers")
      .select("*", { count: "exact", head: true });
    total = count ?? 0;

    // stock_prices에서 우선순위 정렬 (collected_at ASC NULLS FIRST)
    // collected_at은 생성 타입에 미반영 — as any 캐스트 사용
    const { data: priceRows } = await adminAny
      .from("stock_prices")
      .select("ticker")
      .order("collected_at", { ascending: true, nullsFirst: true })
      .limit(5000);

    // 티커 중복 제거 (우선순위 순서 유지)
    const seen = new Set<string>();
    const prioritized: string[] = [];
    for (const row of (priceRows as { ticker: string }[] | null) ?? []) {
      if (!seen.has(row.ticker)) {
        seen.add(row.ticker);
        prioritized.push(row.ticker);
      }
    }

    // stock_prices 행이 없는 티커 추가 — PostgREST 1000행 제한 우회: range 페이지네이션
    {
      const TICKER_PAGE = 1000;
      let from = 0;
      while (true) {
        const { data } = await adminClient
          .from("tickers")
          .select("ticker")
          .order("ticker", { ascending: true })
          .range(from, from + TICKER_PAGE - 1);
        if (!data || data.length === 0) break;
        for (const row of data) {
          if (!seen.has(row.ticker)) prioritized.push(row.ticker);
        }
        if (data.length < TICKER_PAGE) break;
        from += TICKER_PAGE;
      }
    }

    // offset + BATCH_SIZE 적용
    tickers = prioritized.slice(offset, offset + BATCH_SIZE);
  }

  let processed = 0;
  let saved = 0;
  let skipped = 0;

  for (const ticker of tickers) {
    const result = await fetchDayPrices(ticker, apiKey);
    const collectedAt = new Date().toISOString();

    if (!result || result.rows.length === 0) {
      if (result?.error && !firstError) firstError = `${ticker}: ${result.error}`;
      skipped++;
      // 큐 회전 — 실패도 "시도는 했음"으로 간주해 기존 행의 collected_at을
      // 갱신한다. 이렇게 안 하면 영구히 실패하는 티커가 collected_at ASC
      // 정렬 맨 앞에 고정되어 뒤쪽 티커에 기회가 영영 안 간다(6/28~7/6 회귀
      // 버그로 실제 발생했던 문제). 해당 티커의 stock_prices 행이 아예 없으면
      // 이 UPDATE는 0건에 영향을 주고 끝난다(신규 삽입 없음, 정상 동작).
      await adminAny.from("stock_prices").update({ collected_at: collectedAt }).eq("ticker", ticker);
    } else {
      // collected_at은 생성 타입에 미반영 — as any 캐스트 사용
      const insertRows = result.rows.map((r) => ({ ticker, ...r, collected_at: collectedAt }));
      const { error } = await adminAny
        .from("stock_prices")
        .upsert(insertRows, { onConflict: "ticker,date" });

      if (error) {
        console.error(`[collect/prices] upsert ${ticker}:`, error.message);
        if (!firstError) firstError = `${ticker}: ${error.message}`;
        skipped++;
      } else {
        saved += result.rows.length;
      }
    }

    processed++;
    if (tickers.length > 1) await new Promise((r) => setTimeout(r, 300));
  }

  const nextOffset = offset + processed < total ? offset + processed : 0;

  // "성공으로 위장된 실패" 방지 — 이번 실행에서 처리한 티커가 있는데 단 1건도
  // 저장하지 못했다면(전량 스킵) 파싱 오류·API 장애 등 명백한 이상 신호다.
  // ok:true 뒤에 숨지 않도록 실패로 반환한다 (f0661a3 회귀 버그 재발 방지).
  if (processed > 0 && saved === 0) {
    return {
      ok: false,
      error: `전량 실패 의심 — 처리한 ${processed}개 티커 중 저장 0건 (firstError: ${firstError ?? "unknown"})`,
      retryable: true,
      total,
      processed,
      saved,
      skipped,
      offset,
      nextOffset,
    };
  }

  return {
    ok: true,
    total,
    processed,
    saved,
    skipped,
    offset,
    nextOffset,
    ...(firstError ? { firstError } : {}),
  };
}
