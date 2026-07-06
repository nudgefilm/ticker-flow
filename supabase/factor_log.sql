-- top30_daily.factor_log: 티커플로우 스크리너 팩터별 기여도 내부 로그 (사용자 비노출)
-- Supabase SQL Editor에서 실행

ALTER TABLE public.top30_daily
  ADD COLUMN IF NOT EXISTS factor_log jsonb;

COMMENT ON COLUMN public.top30_daily.factor_log IS
  '13개 팩터(src/lib/scoring/weights.ts ScreenerFactor)별 raw score 내부 로그. 비활성 항목 또는 데이터 미존재 시 null(계산 안 함), 활성 항목은 계산된 raw score(0 포함) 저장. 사용자 노출 API/화면에는 절대 포함하지 않는다.';
