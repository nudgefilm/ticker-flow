export const maxDuration = 300;

import { after, NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { runPricesCollect, PRICES_BATCH_SIZE } from "@/lib/collect/prices";
import { withCollectRunLog } from "@/lib/collect/log-run";

// 자기연쇄(self-chain) 안전 상한 — 정상적으로는 ceil(전체 종목수 / 배치) ≈ 35회면
// 완주한다. 예상치 못한 로직 오류로 체인이 무한 반복되는 것을 막는 백스톱.
const MAX_CHAIN = 50;

// ── 자기연쇄 방식 ────────────────────────────────────────────────────────────
// 병목은 FMP 한도가 아니라 Vercel 함수 실행시간(maxDuration=300s)이라, 한 번에
// 8,611개를 못 돈다. 그래서 배치(PRICES_BATCH_SIZE개)를 처리한 뒤 다음 배치를
// "새 함수 호출"로 이어붙인다. 다음 링크를 동기로 await하면 체인 전체가 한 함수
// 수명 안에 누적돼 maxDuration을 넘기므로, 각 링크는 응답을 먼저 반환하고 배치
// 처리·다음 링크 트리거를 after()에서 수행한다(= 트리거 fetch는 다음 링크의 즉시
// 응답만 기다리므로 빠르게 끝난다).
//
// 커서는 URL offset이 아니라 DB의 tickers.prices_last_attempted_at 컬럼이다.
// runPricesCollect()는 항상 "가장 오래 갱신 안 된 순" 상위 배치를 집어 처리 후
// now로 갱신하므로, 매 링크가 offset=0(기본)으로 호출돼도 자연히 다음 배치로
// 넘어간다. (offset 페이지네이션은 정렬 기준이 실행 중 바뀌어 어긋나므로 쓰지
// 않는다.) 이 구조 덕분에 체인이 중간에 끊겨도 — 배포 재시작·일시 오류 등 —
// 남은 종목은 다음 정기 크론(00:30 UTC)이 offset=0으로 시작할 때 prices_last_
// attempted_at 커서를 그대로 이어받아 자연스럽게 처리된다. 별도 offset 저장 불필요.

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const ticker = req.nextUrl.searchParams.get("ticker");

  // 단일 티커 온디맨드(관리자/개별 갱신): 기존 동기 동작 유지 — 체인 없음.
  if (ticker) {
    const result = await withCollectRunLog("prices", "cron", () => runPricesCollect(ticker));
    if (!result.ok) return NextResponse.json(result, { status: 500 });
    return NextResponse.json(result);
  }

  const chainRaw = req.nextUrl.searchParams.get("chain");
  const chain = chainRaw !== null ? Math.max(0, parseInt(chainRaw, 10) || 0) : 0;

  // 응답을 먼저 반환하고, 배치 처리 + 다음 링크 트리거는 after()에서.
  after(async () => {
    let result;
    try {
      result = await withCollectRunLog("prices", "cron", () => runPricesCollect());
    } catch (err) {
      // withCollectRunLog가 collect_runs에 error로 기록함. 체인은 여기서 끊기고,
      // 남은 종목은 다음 정기 크론이 prices_last_attempted_at 커서로 이어받는다.
      console.error(`[collect/prices] chain ${chain} 배치 실패:`, err);
      return;
    }

    const total = Number(result.total ?? 0);
    const processed = Number(result.processed ?? 0);
    const batchesNeeded = total > 0 ? Math.ceil(total / PRICES_BATCH_SIZE) : 0;
    const nextChain = chain + 1;

    // 종료 조건: 전 종목 완주 / 처리 0건 / 안전 상한 도달 / 배치 실패
    const shouldContinue =
      result.ok && processed > 0 && nextChain < batchesNeeded && nextChain < MAX_CHAIN;

    if (nextChain >= MAX_CHAIN) {
      console.warn(`[collect/prices] MAX_CHAIN(${MAX_CHAIN}) 도달 — 체인 강제 종료 (chain=${chain})`);
    }
    if (!shouldContinue) return;

    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin).replace(/\/$/, "");
    try {
      await fetch(`${base}/api/collect/prices?chain=${nextChain}`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // 트리거 실패 시 체인 중단 — 남은 종목은 다음 정기 크론이 이어받음.
      console.error(`[collect/prices] chain ${nextChain} 트리거 실패:`, err);
    }
  });

  return NextResponse.json({ ok: true, chained: true, chain });
}
