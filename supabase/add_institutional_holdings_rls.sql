-- institutional_holdings: 다른 공개 데이터 테이블(filings, news, macro_indicators 등)과
-- 동일하게 RLS 활성화 + 로그인 사용자 전체 SELECT 허용 정책을 추가한다.
-- 이 테이블은 schema.sql 작성 이후 별도로 생성되어 정책이 누락되어 있었다
-- (authenticated role로 조회 시 에러 없이 0건이 반환되는 현상의 원인).
-- Supabase SQL Editor에서 실행

ALTER TABLE public.institutional_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select institutional_holdings"
  ON public.institutional_holdings FOR SELECT TO authenticated USING (true);
