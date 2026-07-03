-- dividends 테이블 권한·관계 설정 누락 대응
-- 증상: 실적 캘린더(/earnings) "배당 일정" 탭에서 데이터가 조회되지 않음
--   1) "permission denied for table dividends"
--      → scripts/seed-dividends.ts로 테이블을 임시 생성할 때 GRANT/RLS 설정이 누락됨
--        (supabase/schema.sql에도 dividends 테이블 정의가 없어 다른 테이블과 달리
--         권한 부여 스크립트가 한 번도 실행되지 않았음)
--   2) "Could not find a relationship between 'dividends' and 'tickers' in the schema cache"
--      → dividends.ticker에 tickers(ticker) 참조 외래키가 없어 PostgREST가
--        src/app/(dashboard)/earnings/page.tsx의 `tickers(name_kr, name_en)` 임베드 조인을
--        인식하지 못함
-- 확인 결과 dividends.ticker 값은 모두 tickers 테이블에 존재하여(고아 행 0건)
-- 아래 외래키 추가는 안전하게 적용 가능합니다. 재실행해도 안전합니다(idempotent).

-- 1. 외래키 관계 추가 (없을 때만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dividends_ticker_fkey'
  ) THEN
    ALTER TABLE public.dividends
      ADD CONSTRAINT dividends_ticker_fkey
      FOREIGN KEY (ticker) REFERENCES public.tickers(ticker) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. 권한 부여 (다른 시세/공시 테이블과 동일한 패턴)
GRANT ALL ON TABLE public.dividends TO service_role;
GRANT SELECT ON TABLE public.dividends TO authenticated;

-- 3. RLS 활성화 및 조회 정책
ALTER TABLE public.dividends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can select dividends" ON public.dividends;
CREATE POLICY "authenticated can select dividends"
  ON public.dividends FOR SELECT TO authenticated USING (true);

-- 4. PostgREST 스키마 캐시 강제 갱신 (관계 인식 안 되는 문제 해결)
NOTIFY pgrst, 'reload schema';
