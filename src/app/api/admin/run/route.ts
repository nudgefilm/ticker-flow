import { after, NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
};

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const job = req.nextUrl.searchParams.get("job") ?? "";

  if (!isCollectJob(job)) {
    return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: run, error: insertErr } = await (adminClient as any)
    .from("collect_runs")
    .insert({ job_type: job, status: "running", source: "admin" })
    .select("id")
    .single();

  if (insertErr || !run) {
    return NextResponse.json({ error: "DB 기록 생성 실패" }, { status: 500 });
  }

  const runId = run.id as string;

  after(async () => {
    try {
      const result = await COLLECT_MAP[job]();

      await (adminClient as any)
        .from("collect_runs")
        .update({
          status: result.ok ? "done" : "error",
          result,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    } catch (err) {
      const error_msg = err instanceof Error ? err.message : "Unknown error";
      await (adminClient as any)
        .from("collect_runs")
        .update({
          status: "error",
          error_msg,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
  });

  return NextResponse.json({ ok: true, runId, started: true });
}
