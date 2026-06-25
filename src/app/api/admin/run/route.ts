import { NextRequest, NextResponse, after } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // 실행 기록 생성 (status: running)
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

  // 응답 반환 후 서버 독립 실행
  after(async () => {
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      const result: Record<string, unknown> = res.ok
        ? await res.json().catch(() => ({}))
        : { ok: false, error: `HTTP ${res.status}` };

      await (adminClient as any)
        .from("collect_runs")
        .update({
          status: result.ok ? "done" : "error",
          result,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    } catch (err) {
      await (adminClient as any)
        .from("collect_runs")
        .update({
          status: "error",
          error_msg: err instanceof Error ? err.message : "Unknown error",
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
  });

  return NextResponse.json({ ok: true, runId, status: "running" });
}
