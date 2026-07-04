import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

export type RunSource = "cron" | "admin" | "user";

// collect_runs는 생성된 Supabase 타입에 없는 테이블이라 any 캐스트 사용 (CLAUDE.md 16번 규칙)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adminAny(): any {
  return createAdminClient() as any;
}

/** collect_runs에 'running' 상태로 신규 행을 만들고 id를 반환한다. */
export async function createRunRecord(jobType: string, source: RunSource): Promise<string | null> {
  const { data, error } = await adminAny()
    .from("collect_runs")
    .insert({ job_type: jobType, status: "running", source })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** withinMs 이내에 시작된 동일 job_type의 가장 최근 실행을 찾는다 (중복 트리거 방지용). */
export async function findRecentRun(
  jobType: string,
  withinMs: number
): Promise<{ id: string; status: string } | null> {
  const since = new Date(Date.now() - withinMs).toISOString();
  const { data } = await adminAny()
    .from("collect_runs")
    .select("id, status")
    .eq("job_type", jobType)
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

/** collect_runs 행을 실행 결과로 마무리한다. */
export async function finishRunRecord(
  runId: string | null,
  result: CollectResult | null,
  errorMsg?: string
): Promise<void> {
  if (!runId) return;
  await adminAny()
    .from("collect_runs")
    .update({
      status: errorMsg ? "error" : result?.ok ? "done" : "error",
      result: result ?? undefined,
      error_msg: errorMsg,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

/**
 * job 실행을 collect_runs에 기록하며 감싼다. Cron 라우트처럼 완료까지 기다렸다가
 * 응답해도 되는 동기 흐름에서 사용한다. 어드민 트리거처럼 runId를 즉시 반환하고
 * 백그라운드에서 계속 실행해야 하는 경우는 createRunRecord/finishRunRecord를
 * 직접 사용한다 (src/app/api/admin/run/route.ts 참고).
 */
export async function withCollectRunLog(
  jobType: string,
  source: RunSource,
  fn: () => Promise<CollectResult>
): Promise<CollectResult> {
  const runId = await createRunRecord(jobType, source);
  try {
    const result = await fn();
    await finishRunRecord(runId, result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await finishRunRecord(runId, null, message);
    throw err;
  }
}
