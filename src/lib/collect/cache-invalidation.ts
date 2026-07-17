import { createAdminClient } from "@/lib/supabase/admin";
import { runStockBriefCollect } from "./brief";
import { summarizeFilingsForTicker } from "./summarize";

/**
 * insider_trades를 대량으로 보정(삭제 후 재수집 등)하는 스크립트는 끝에 반드시
 * 이 함수를 호출해야 한다 — 2026-07-18 NVDA 종목 스냅샷 사고 재발 방지용
 * (CLAUDE.md 5항 "insider_trades 캐시 무효화" 참고).
 *
 * 문제의 구조: stock_briefs(종목 BRIEF)와 filings.summary_kr(Form 4 요약
 * 문장)은 생성 시점에 insider_trades를 읽어 자연어로 캐싱한 뒤, 그 이후로는
 * insider_trades가 바뀌어도 저절로 재생성되지 않는다. 정기 크론(insider.ts의
 * runInsiderCollect)은 신규 삽입 시 BRIEF를 갱신하는 경로가 이미 있지만, 대량
 * 보정 스크립트는 collectForTicker()를 직접 호출해 그 경로를 타지 않는다 —
 * 그래서 대량 보정 후에는 이 함수로 명시적으로 무효화해야 한다.
 *
 * 대상 종목만 골라 처리한다(전체 스캔 아님) — 호출자가 "이번에 실제로
 * insider_trades를 건드린 종목 목록"을 넘겨야 한다.
 */
export async function invalidateInsiderDerivedCaches(tickers: string[]): Promise<{
  form4Reset: number;
  form4Regenerated: number;
  briefsRegenerated: number;
  briefsSkipped: number;
  briefsFailed: number;
}> {
  if (tickers.length === 0) {
    return { form4Reset: 0, form4Regenerated: 0, briefsRegenerated: 0, briefsSkipped: 0, briefsFailed: 0 };
  }

  const adminClient = createAdminClient();

  // 1. Form 4 filings.summary_kr 리셋 — LLM을 쓰지 않는 구조화 데이터 경로라
  //    (resolveFilingSummary의 form_type==="4" 분기) 리셋+재생성 비용이 DB
  //    쿼리뿐이다. 이미 일반 템플릿이었는지 구분할 필요 없이 대상 종목의 Form 4는
  //    전부 리셋한다. (2026-07-18: 같은 날 여러 명이 제출한 경우의 오귀속 버그는
  //    fetchMatchingInsiderTrades가 SEC 원문으로 제출자를 특정해 매칭하도록
  //    근본 수정됐으므로, 이제 전부 안전하게 재생성해도 된다 — 과거에는 이
  //    사고 때문에 멀티필자 날짜를 건너뛰는 방어 코드가 있었으나 근본 수정
  //    완료로 제거함.)
  const { error: resetErr, count: form4Reset } = await (adminClient as any)
    .from("filings")
    .update({ summary_kr: null }, { count: "exact" })
    .eq("form_type", "4")
    .in("ticker", tickers)
    .not("summary_kr", "is", null);
  if (resetErr) {
    console.error("[invalidateInsiderDerivedCaches] Form 4 summary_kr 리셋 실패:", resetErr.message);
  }

  let form4Regenerated = 0;
  for (const ticker of tickers) {
    const result = await summarizeFilingsForTicker(adminClient, ticker);
    form4Regenerated += result.done;
  }

  // 2. stock_briefs 재생성 — 이미 생성된 적 있는(캐시가 존재하는) 종목만 대상.
  //    없는 종목은 무효화할 캐시가 없다.
  const { data: existingBriefs } = await adminClient
    .from("stock_briefs")
    .select("ticker")
    .in("ticker", tickers);

  let briefsRegenerated = 0;
  let briefsSkipped = 0;
  let briefsFailed = 0;
  for (const row of existingBriefs ?? []) {
    // snapshot_view: 와치리스트 등록 여부와 무관하게 무조건 재생성한다 — 오염된
    // 캐시를 방치하는 것보다, 지금 와치리스트에 없는 종목이라도 고쳐두는 쪽이
    // 안전하다(나중에 다시 등록되거나 스냅샷 페이지로 직접 접근할 수 있음).
    const result = await runStockBriefCollect(row.ticker, "snapshot_view");
    if (!result.ok) briefsFailed++;
    else if (((result.generated as number | undefined) ?? 0) > 0) briefsRegenerated++;
    else briefsSkipped++;
  }

  return { form4Reset: form4Reset ?? 0, form4Regenerated, briefsRegenerated, briefsSkipped, briefsFailed };
}
