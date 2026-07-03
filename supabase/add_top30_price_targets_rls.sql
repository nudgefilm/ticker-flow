-- top30_daily / price_targets: 와치리스트 주간·월간 BRIEF 기능이 의존하는 테이블인데
-- 로그인 사용자(authenticated) 조회 시 데이터가 보이지 않는 문제를 수정한다.
-- Supabase SQL Editor에서 실행

-- top30_daily: RLS는 활성화돼 있지만 정책이 없어 에러 없이 0건이 반환되던 문제
-- (institutional_holdings와 동일한 패턴)
ALTER TABLE public.top30_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select top30_daily"
  ON public.top30_daily FOR SELECT TO authenticated USING (true);

-- price_targets: authenticated role에 테이블 자체 GRANT가 없어
-- "permission denied for table price_targets" 에러가 발생하던 문제
GRANT SELECT ON public.price_targets TO authenticated;

ALTER TABLE public.price_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select price_targets"
  ON public.price_targets FOR SELECT TO authenticated USING (true);
