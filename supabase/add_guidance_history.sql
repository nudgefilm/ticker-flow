-- earnings_calls.guidance_history: 분기별 가이던스 방향(up/maintain/down) 이력 누적
-- Supabase SQL Editor에서 실행

ALTER TABLE public.earnings_calls
  ADD COLUMN IF NOT EXISTS guidance_history jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.earnings_calls.guidance_history IS
  '이전 분기들의 가이던스 방향 이력. [{"quarter":"Q1 FY2026","direction":"up","call_date":"2026-02-15"}, ...] 형태로 신규 어닝콜 수집 시 자동 누적됨 (src/lib/collect/calls.ts).';
