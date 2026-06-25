-- collect_runs: 수동 수집 실행 이력
-- Supabase SQL Editor에서 실행

CREATE TABLE IF NOT EXISTS public.collect_runs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type     text        NOT NULL,
  status       text        NOT NULL DEFAULT 'running',  -- 'running' | 'done' | 'error'
  result       jsonb,
  error_msg    text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz
);

-- 최신순 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_collect_runs_job_type_started
  ON public.collect_runs (job_type, started_at DESC);

-- RLS 비활성화 (admin service role만 접근)
ALTER TABLE public.collect_runs DISABLE ROW LEVEL SECURITY;
