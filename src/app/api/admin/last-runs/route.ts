import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// 각 job_type의 가장 최근 실행 결과를 반환
export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("collect_runs")
    .select("id, job_type, status, result, error_msg, started_at, finished_at")
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // job_type별 최신 1건만 추출
  const latest = new Map<string, (typeof data)[number]>();
  for (const row of data ?? []) {
    if (!latest.has(row.job_type)) latest.set(row.job_type, row);
  }

  return NextResponse.json({ ok: true, runs: Object.fromEntries(latest) });
}
