import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { computeScores } from "./scoring";
import { SCORING_MODEL_VERSION } from "@/lib/scoring/version";
import { TRACKED_DAYS } from "@/lib/outcomes/config";

export async function runTop30Select(): Promise<CollectResult> {
  const scored = await computeScores();

  if (scored.length === 0) {
    return { ok: true, total: 0, upserted: 0, newEntries: 0 };
  }

  const top30 = scored.slice(0, 30);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const rows = top30.map((item, idx) => ({
    date:           todayStr,
    ticker:         item.ticker,
    rank:           idx + 1,
    event_score:    item.eventsScore,
    smart_score:    item.smartScore,
    earnings_score: item.earningsScore,
    market_score:   item.marketScore,
    final_score:    item.finalScore,
    reason_tags:    item.reasonTags,
    // news_score/discoveryBonus는 top30_daily에 전용 컬럼이 없어 metadata JSON에 보존
    metadata:       item.metadata,
    // 팩터별 기여도 내부 로그 — 사용자 비노출, supabase/factor_log.sql로 컬럼 추가 필요
    factor_log:     item.factorLog,
    // 이 날짜의 TOP30이 어떤 모델 버전으로 계산됐는지 추적 (CLAUDE.md 18항)
    model_version:  SCORING_MODEL_VERSION,
    // updated_at은 신규 컬럼 — upsert 시마다 재계산 시각으로 명시 갱신 (DEFAULT는 INSERT에만 적용됨)
    updated_at:     nowIso,
  }));

  // ── 2.5단계: Entry 이벤트 판정 — 어제 top30_daily에 없었던(연속성 끊김) 종목만
  // 신규 Entry로 판정한다. 어제도 연속으로 있었던 종목은 새 행을 만들지 않는다.
  const { data: yesterdayRows, error: yesterdayErr } = await admin
    .from("top30_daily")
    .select("ticker")
    .eq("date", yesterdayStr);

  if (yesterdayErr) {
    console.error("[collect/top30] yesterday lookup failed", yesterdayErr.message);
    return { ok: false, error: yesterdayErr.message, retryable: true };
  }

  const yesterdayTickers = new Set<string>((yesterdayRows ?? []).map((r: { ticker: string }) => r.ticker));
  const newEntryItems = top30.filter((item) => !yesterdayTickers.has(item.ticker));

  let entryPriceByTicker = new Map<string, number>();
  if (newEntryItems.length > 0) {
    const { data: priceRows, error: priceErr } = await admin
      .from("stock_prices")
      .select("ticker, close")
      .eq("date", todayStr)
      .in("ticker", newEntryItems.map((item) => item.ticker));

    if (priceErr) {
      console.error("[collect/top30] entry price lookup failed", priceErr.message);
      return { ok: false, error: priceErr.message, retryable: true };
    }

    entryPriceByTicker = new Map(
      (priceRows ?? []).map((p: { ticker: string; close: number }) => [p.ticker, p.close])
    );
  }

  const entries = newEntryItems.map((item) => {
    const rank = top30.findIndex((t) => t.ticker === item.ticker) + 1;
    return {
      ticker:                item.ticker,
      selected_date:         todayStr,
      factor_log_snapshot:   item.factorLog,
      final_score_snapshot:  item.finalScore,
      // 선정일 종가가 아직 수집되지 않았다면 null — outcomes 계산 시 이미 null인
      // entry_price는 return_pct 계산에서 자연스럽게 제외된다
      entry_price:           entryPriceByTicker.get(item.ticker) ?? null,
      rank_snapshot:         rank,
      reason_tags_snapshot:  item.reasonTags,
      model_version:         SCORING_MODEL_VERSION,
    };
  });

  // ── top30_daily upsert + top30_entries/outcome_results 신규 행 생성을 RPC로
  // 하나의 트랜잭션 묶어 처리한다 (PostgREST는 여러 요청에 걸친 클라이언트
  // 트랜잭션을 지원하지 않음). 어느 한쪽이라도 실패하면 전체가 롤백되므로
  // top30_entries만 빠지는 부분 성공 상태를 허용하지 않는다.
  const { error: rpcError } = await admin.rpc("upsert_top30_with_entries", {
    p_rows: rows,
    p_entries: entries,
    p_tracked_days: TRACKED_DAYS,
  });

  if (rpcError) {
    console.error("[collect/top30]", rpcError.message);
    return { ok: false, error: rpcError.message, retryable: true };
  }

  return { ok: true, total: scored.length, upserted: top30.length, newEntries: entries.length };
}
