import { after, NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createRunRecord, finishRunRecord } from "@/lib/collect/log-run";
import {
  type CollectJob,
  type CollectHandler,
  isCollectJob,
  runFilingsCollect,
  runNewsCollect,
  runEarningsCollect,
  runEarningsActualCollect,
  runPricesCollect,
  runInsiderCollect,
  runAnalystCollect,
  run13fCollect,
  runMacroCollect,
  runProfileCollect,
  runWatchlistTickersCollect,
  runCallsCollect,
  runSeedTickersCollect,
  runTranslateCollect,
  runDigestCollect,
  runClassifyFilings,
  runShortInterestCollect,
  runPriceTargetsCollect,
  runTop30Select,
  runBriefBackfill,
  runWeeklyBriefCollect,
  runMonthlyBriefCollect,
  runYoutubeChannelsCollect,
  runFinancialsCollect,
  runTop30OutcomesUpdate,
  runProExpiryDowngrade,
} from "@/lib/collect";

// collect job id → 서비스 계층 직접 호출
// Record<CollectJob, CollectHandler>: 누락·오타는 컴파일 오류로 즉시 검출
const COLLECT_MAP: Record<CollectJob, CollectHandler> = {
  "profile":          runProfileCollect,
  "filings":          runFilingsCollect,
  "news":             runNewsCollect,
  "earnings":         runEarningsCollect,
  "earnings-actual":  runEarningsActualCollect,
  "prices":           runPricesCollect,
  "insider":          runInsiderCollect,
  "analyst":          runAnalystCollect,
  "13f":              run13fCollect,
  "macro":            runMacroCollect,
  "watchlist-tickers": runWatchlistTickersCollect,
  "calls":            runCallsCollect,
  "seed-tickers":     runSeedTickersCollect,
  "translate":         runTranslateCollect,
  "digest":            runDigestCollect,
  "classify-filings":  runClassifyFilings,
  "short-interest":    runShortInterestCollect,
  "price-targets":     runPriceTargetsCollect,
  "top30":             runTop30Select,
  "brief-backfill":    runBriefBackfill,
  "weekly-brief":      runWeeklyBriefCollect,
  "monthly-brief":     runMonthlyBriefCollect,
  "youtube-channels":  runYoutubeChannelsCollect,
  "financials":        runFinancialsCollect,
  "top30-outcomes":    runTop30OutcomesUpdate,
  "pro-expiry":        runProExpiryDowngrade,
};

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const job = req.nextUrl.searchParams.get("job") ?? "";

  if (!isCollectJob(job)) {
    return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 });
  }

  const runId = await createRunRecord(job, "admin");

  if (!runId) {
    return NextResponse.json({ error: "DB 기록 생성 실패" }, { status: 500 });
  }

  after(async () => {
    try {
      const result = await COLLECT_MAP[job]();
      await finishRunRecord(runId, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await finishRunRecord(runId, null, message);
    }
  });

  return NextResponse.json({ ok: true, runId, started: true });
}
