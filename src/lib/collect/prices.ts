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
  // 티커당 실측 평균 826ms(FMP 3,000req/min 한도 대비 여유 큼) 기준,
  // Vercel maxDuration=300s 대비 약 31% 안전 마진을 두고 산정 (250 × 826ms ≈ 207s).
  const BATCH_SIZE = 250;
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

    // 우선순위 정렬 기준: tickers.prices_last_attempted_at ASC NULLS FIRST
    // (티커당 정확히 1행이라 PostgREST range()로 바로 페이지네이션 가능).
    // 예전엔 stock_prices row의 collected_at으로 정렬했는데, 한 티커가 수백 개의
    // 날짜별 row를 갖고 최근 35일치만 매일 갱신되다 보니 35일보다 오래된 과거
    // row의 collected_at이 영원히 안 바뀌어, 방금 정상 수집된 티커도 "가장
    // 오래된 티커"로 계속 오판되는 문제가 있었다(실제 백필 중 발견). 티커별
    // 단일 값인 이 컬럼으로 교체해 근본 해결한다.
    // prices_last_attempted_at은 생성 타입에 미반영 — as any 캐스트 사용
    const { data: tickerRows } = await adminAny
      .from("tickers")
      .select("ticker")
      .order("prices_last_attempted_at", { ascending: true, nullsFirst: true })
      .range(offset, offset + BATCH_SIZE - 1);

    tickers = ((tickerRows as { ticker: string }[] | null) ?? []).map((r) => r.ticker);
  }

  let processed = 0;
  let saved = 0;
  let skipped = 0;

  for (const ticker of tickers) {
    const result = await fetchDayPrices(ticker, apiKey);
    const nowIso = new Date().toISOString();

    if (!result || result.rows.length === 0) {
      if (result?.error && !firstError) firstError = `${ticker}: ${result.error}`;
      skipped++;
    } else {
      // collected_at은 생성 타입에 미반영 — as any 캐스트 사용
      const insertRows = result.rows.map((r) => ({ ticker, ...r, collected_at: nowIso }));
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

    // 큐 회전 — 성공/실패 무관하게 "시도는 했음"을 티커 단위로 기록한다.
    // 이렇게 해야 다음 실행 때 같은 티커가 다시 맨 앞에 오지 않고 다른
    // 티커에게 기회가 간다 (prices_last_attempted_at은 생성 타입에 미반영).
    await adminAny
      .from("tickers")
      .update({ prices_last_attempted_at: nowIso })
      .eq("ticker", ticker);

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
