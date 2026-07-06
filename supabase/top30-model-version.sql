-- top30_daily.model_version: 이 날짜의 TOP30이 어떤 스코어링 모델 버전으로
-- 계산됐는지 추적 (src/lib/scoring/version.ts SCORING_MODEL_VERSION 스냅샷)
-- Supabase SQL Editor에서 실행

ALTER TABLE public.top30_daily
  ADD COLUMN IF NOT EXISTS model_version text;

COMMENT ON COLUMN public.top30_daily.model_version IS
  'SCORING_MODEL_VERSION(src/lib/scoring/version.ts) 스냅샷. weights.ts의 SCREENER_WEIGHTS 변경 시 사람이 버전을 올리면, 이 컬럼으로 어느 날짜의 TOP30이 어떤 모델 버전으로 계산됐는지 즉시 알 수 있다.';
