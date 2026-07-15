-- digest_featured_log — 데일리 다이제스트 "이번 주 활동이 많은 기업 소개" 섹션의
-- 주간 로테이션 이력. Supabase SQL Editor에서 1회 실행.
-- (schema.sql 20번 섹션에도 동일 내용이 반영되어 있음 — 신규 환경 셋업용)

CREATE TABLE IF NOT EXISTS public.digest_featured_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker        TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  featured_date DATE        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digest_featured_log_featured_date
  ON public.digest_featured_log (featured_date DESC);

ALTER TABLE public.digest_featured_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.digest_featured_log TO authenticated;
GRANT ALL    ON public.digest_featured_log TO service_role;

CREATE POLICY "authenticated can select digest_featured_log"
  ON public.digest_featured_log FOR SELECT TO authenticated USING (true);
