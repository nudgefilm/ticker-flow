import { after, NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type CollectResult,
  type CollectJob,
  type CollectHandler,
  COLLECT_JOBS,
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
  "13f":             run13fCollect,
  "macro":           runMacroCollect,
};

// collect 외 job은 기존 fetch 방식 유지
const FETCH_JOB_MAP: Record<string, string> = {
  "watchlist-tickers": "/api/collect/watchlist-tickers",
  "seed-tickers":      "/api/seed/tickers",
  "translate":         "/api/translate",
  "digest":            "/api/email/digest",
  "debug-env":         "/api/debug/env",
};

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const job = req.nextUrl.searchParams.get("job") ?? "";
  const isCollectJob = (COLLECT_JOBS as readonly string[]).includes(job);
  const fetchEndpoint = FETCH_JOB_MAP[job];

  if (!isCollectJob && !fetchEndpoint) {
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

      if (isCollectJob) {
        result = await COLLECT_MAP[job as CollectJob]();
      } else {
        const host = req.headers.get("host") ?? "localhost:3000";
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL ??
          (host.includes("localhost") ? `http://${host}` : `https://${host}`);
        const cronSecret = process.env.CRON_SECRET ?? "";
        const cookieHeader = req.headers.get("cookie") ?? "";

        const res = await fetch(`${baseUrl}${fetchEndpoint}`, {
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            ...(cookieHeader && { Cookie: cookieHeader }),
          },
        });
        result = res.ok
          ? await res.json().catch(() => ({ ok: false }))
          : { ok: false, error: `HTTP ${res.status}` };
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
