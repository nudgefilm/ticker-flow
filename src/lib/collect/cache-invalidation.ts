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
  form4MultiFilerSkipped: number;
  briefsRegenerated: number;
  briefsSkipped: number;
  briefsFailed: number;
}> {
  if (tickers.length === 0) {
    return {
      form4Reset: 0, form4Regenerated: 0, form4MultiFilerSkipped: 0,
      briefsRegenerated: 0, briefsSkipped: 0, briefsFailed: 0,
    };
  }

  const adminClient = createAdminClient();

  // 1. Form 4 filings.summary_kr 리셋 — 단, 같은 (ticker, 날짜)에 필자가 2명
  //    이상인 그룹은 건드리지 않는다. resolveFilingSummary의 fetchMatchingInsiderTrades
  //    가 ticker+날짜로만 insider_trades를 매칭하고 filing 하나하나의 실제 제출자
  //    (accession/reporting person)는 구분하지 않아서, 같은 날 여러 명이 제출한
  //    경우 그중 1명이라도 insider_trades에 데이터가 있으면 "다른 필자들"의
  //    filing에도 그 사람의 거래 문장이 그대로 복제돼 잘못 귀속된다(2026-07-18
  //    실측 확인 — NVDA 6명 중 1명, MSFT 11명 중 1명, AMZN 6명 전원이 이런 식으로
  //    오귀속됨). 근본 수정(insider-form4.ts의 SEC 원문 조회로 필자별 매칭)은
  //    아직 없어서, 안전하게 "필자가 유일한 날"만 재생성한다.
  const { data: form4Rows } = await (adminClient as any)
    .from("filings")
    .select("id, filed_at")
    .eq("form_type", "4")
    .in("ticker", tickers)
    .not("summary_kr", "is", null);

  const dateGroupCounts = new Map<string, number>();
  for (const row of (form4Rows ?? []) as { id: string; filed_at: string }[]) {
    const key = row.filed_at.slice(0, 10);
    dateGroupCounts.set(key, (dateGroupCounts.get(key) ?? 0) + 1);
  }
  const safeIds = ((form4Rows ?? []) as { id: string; filed_at: string }[])
    .filter((row) => dateGroupCounts.get(row.filed_at.slice(0, 10)) === 1)
    .map((row) => row.id);
  const form4MultiFilerSkipped = (form4Rows?.length ?? 0) - safeIds.length;

  let form4Reset = 0;
  if (safeIds.length > 0) {
    const { error: resetErr, count } = await (adminClient as any)
      .from("filings")
      .update({ summary_kr: null }, { count: "exact" })
      .in("id", safeIds);
    if (resetErr) {
      console.error("[invalidateInsiderDerivedCaches] Form 4 summary_kr 리셋 실패:", resetErr.message);
    }
    form4Reset = count ?? 0;
  }

  // 남은 위험: summarizeFilingsForTicker는 "이 종목의 summary_kr NULL 전체"를
  // 대상으로 하므로, 오늘 리셋한 것과 무관하게 이미 null인 다른 Form 4(같은
  // 멀티필자 날짜에 속한)도 같이 처리될 수 있다 — 이건 이 함수가 새로 만든
  // 위험이 아니라 정기 크론에도 이미 있는 기존 위험이라 이번 범위에서는
  // 손대지 않는다(근본 수정은 insider-form4.ts의 필자별 매칭 도입 필요).
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

  return { form4Reset, form4Regenerated, form4MultiFilerSkipped, briefsRegenerated, briefsSkipped, briefsFailed };
}
