import { after, NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";
import { runFilingsCollect } from "@/app/api/collect/filings/route";
import { runNewsCollect } from "@/app/api/collect/news/route";
import { runEarningsCollect } from "@/app/api/collect/earnings/route";
import { runEarningsActualCollect } from "@/app/api/collect/earnings-actual/route";
import { runPricesCollect } from "@/app/api/collect/prices/route";
import { runInsiderCollect } from "@/app/api/collect/insider/route";
import { runAnalystCollect } from "@/app/api/collect/analyst/route";
import { run13fCollect } from "@/app/api/collect/13f/route";
import { runMacroCollect } from "@/app/api/collect/macro/route";
import { runProfileCollect } from "@/app/api/collect/profile/route";

// collect job id → 직접 호출 함수 (HTTP fetch 없음)
const COLLECT_MAP: Record<string, () => Promise<CollectResult>> = {
  "filings":         runFilingsCollect,
  "news":            runNewsCollect,
  "earnings":        runEarningsCollect,
  "earnings-actual": runEarningsActualCollect,
  "prices":          runPricesCollect,
  "insider":         runInsiderCollect,
  "analyst":         runAnalystCollect,
  "13f":             run13fCollect,
  "macro":           runMacroCollect,
  "profile":         runProfileCollect,
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
  const isCollectJob = job in COLLECT_MAP;
  const fetchEndpoint = FETCH_JOB_MAP[job];

  if (!isCollectJob && !fetchEndpoint) {
    return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: run, error: insertErr } = await (adminClient as any)
    .from("collect_runs")
    .insert({ job_type: job, status: "running" })
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
        result = await COLLECT_MAP[job]();
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
