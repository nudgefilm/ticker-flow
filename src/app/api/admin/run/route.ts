import { after, NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runProfileCollect } from "@/app/api/collect/profile/route";

// trigger id → 실제 collection 엔드포인트 경로
const JOB_MAP: Record<string, string> = {
  "watchlist-tickers": "/api/collect/watchlist-tickers",
  "seed-tickers":      "/api/seed/tickers",
  "filings":           "/api/collect/filings",
  "news":              "/api/collect/news",
  "earnings":          "/api/collect/earnings",
  "macro":             "/api/collect/macro",
  "insider":           "/api/collect/insider",
  "prices":            "/api/collect/prices",
  "earnings-actual":   "/api/collect/earnings-actual",
  "translate":         "/api/translate",
  "analyst":           "/api/collect/analyst",
  "13f":               "/api/collect/13f",
  "profile":           "/api/collect/profile",
  "digest":            "/api/email/digest",
  "debug-env":         "/api/debug/env",
};

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const job = req.nextUrl.searchParams.get("job") ?? "";
  const endpoint = JOB_MAP[job];
  if (!endpoint) {
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
  const host = req.headers.get("host") ?? "localhost:3000";
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (host.includes("localhost") ? `http://${host}` : `https://${host}`);
  const cronSecret = process.env.CRON_SECRET ?? "";
  const cookieHeader = req.headers.get("cookie") ?? "";

  after(async () => {
    try {
      let result: Record<string, unknown>;

      if (job === "profile") {
        // HTTP fetch 없이 함수 직접 호출 (Authorization 헤더 전달 불필요)
        result = await runProfileCollect() as unknown as Record<string, unknown>;
      } else {
        const collectUrl = `${baseUrl}${endpoint}`;
        const res = await fetch(collectUrl, {
          headers: {
            Authorization: `Bearer ${cronSecret}`,
            ...(cookieHeader && { Cookie: cookieHeader }),
          },
        });
        result = res.ok
          ? await res.json().catch(() => ({}))
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
