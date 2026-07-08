-- profiles.pro_expires_at: 어드민 "Pro 수동 부여" 만료일 관리
-- Supabase SQL Editor에서 실행
--
-- null이면 무기한 부여. 값이 있으면 해당 시각 이후 pro-expiry 강등 잡(매일 1회)이
-- plan을 'free'로 되돌린다. Polar 정기결제로 부여되는 pro는 이 컬럼을 사용하지 않는다
-- (webhooks/polar/route.ts는 pro_expires_at을 건드리지 않고 plan만 갱신).
--
-- profiles 테이블 자체는 schema.sql에서 관리하지 않지만(코멘트 참고), 이미 존재하는
-- 테이블에 컬럼만 추가하는 것이므로 기존 GRANT(authenticated/service_role)와 RLS 정책은
-- 테이블 단위로 그대로 적용되어 별도 GRANT/RLS 작업이 필요하지 않다.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

COMMENT ON COLUMN public.profiles.pro_expires_at IS
  '어드민 "Pro 수동 부여"로 설정한 만료 시각. null=무기한. src/lib/collect/pro-expiry.ts의 매일 1회 강등 잡이 지난 시각의 pro 유저를 free로 되돌린다.';
