import { after, NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type CollectResult,
  type CollectJob,
  type CollectHandler,
  type FetchJob,
  isCollectJob,
  isFetchJob,
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
} from "@/lib/collect";

// collect job id → 서비스 계층 직접 호출
// Record<CollectJob, CollectHandler>: 누락·오타는 컴파일 오류로 즉시 검출
const COLLECT_MAP: Record<CollectJob, CollectHandler> = {
  "profile":         runProfileCollect,
  "filings":         runFilingsCollect,
  "news":            runNewsCollect,
  "earnings":        runEarningsCollect,
  "earnings-actual": runEarningsActualCollect,
  "prices":          runPricesCollect,
  "insider":         runInsiderCollect,
  "analyst":         runAnalystCollect,
  "13f":                run13fCollect,
  "macro":              runMacroCollect,
  "watchlist-tickers":  runWatchlistTickersCollect,
};

// collect 외 job — fetch 방식 유지
// Record<FetchJob, string>: 누락·오타는 컴파일 오류로 즉시 검출
const FETCH_JOB_MAP: Record<FetchJob, string> = {
  "seed-tickers": "/api/seed/tickers",
  "translate":    "/api/translate",
  "digest":       "/api/email/digest",
};

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const job = req.nextUrl.searchParams.get("job") ?? "";

  if (!isCollectJob(job) && !isFetchJob(job)) {
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
      let result: CollectResult;

      if (isCollectJob(job)) {
        result = await COLLECT_MAP[job]();
      } else if (isFetchJob(job)) {
        const host = req.headers.get("host") ?? "localhost:3000";
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL ??
          (host.includes("localhost") ? `http://${host}` : `https://${host}`);
        const cronSecret = process.env.CRON_SECRET ?? "";
        const cookieHeader = req.headers.get("cookie") ?? "";

        const res = await fetch(`${baseUrl}${FETCH_JOB_MAP[job]}`, {
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            ...(cookieHeader && { Cookie: cookieHeader }),
          },
        });
        result = res.ok
          ? await res.json().catch(() => ({ ok: false }))
          : { ok: false, error: `HTTP ${res.status}` };
      } else {
        result = { ok: false, error: `Unknown job: ${job}` };
      }

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
