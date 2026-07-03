-- weekly_briefs / monthly_briefs 캐시 테이블 점검 및 권한 수정
-- 증상:
--   1) 주간 BRIEF 생성 실행 시 "permission denied for table weekly_briefs"
--      → 테이블은 존재하지만 service_role(관리자 클라이언트)에 GRANT가 누락된 상태
--   2) 월간 BRIEF 생성 실행 시 "Could not find the table 'public.monthly_briefs' in the schema cache"
--      → 테이블 미생성 또는 PostgREST 스키마 캐시 미갱신
-- 아래 SQL은 두 테이블 모두에 대해 안전하게(이미 존재해도 에러 없이) 재실행 가능합니다.

CREATE TABLE IF NOT EXISTS public.weekly_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start date NOT NULL UNIQUE,
  data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.monthly_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month_start date NOT NULL UNIQUE,
  data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now()
);

-- service_role(collect 함수가 사용하는 관리자 클라이언트)에 전체 권한 부여
GRANT ALL ON TABLE public.weekly_briefs TO service_role;
GRANT ALL ON TABLE public.monthly_briefs TO service_role;

-- authenticated(대시보드 조회용 세션 클라이언트)에 조회 권한 부여
GRANT SELECT ON TABLE public.weekly_briefs TO authenticated;
GRANT SELECT ON TABLE public.monthly_briefs TO authenticated;

-- RLS 활성화
ALTER TABLE public.weekly_briefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_briefs ENABLE ROW LEVEL SECURITY;

-- RLS 정책 재생성 (이미 있으면 삭제 후 재생성)
DROP POLICY IF EXISTS "authenticated can select weekly_briefs" ON public.weekly_briefs;
CREATE POLICY "authenticated can select weekly_briefs"
  ON public.weekly_briefs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated can select monthly_briefs" ON public.monthly_briefs;
CREATE POLICY "authenticated can select monthly_briefs"
  ON public.monthly_briefs FOR SELECT TO authenticated USING (true);

-- PostgREST 스키마 캐시 강제 갱신 (monthly_briefs 인식 안 되는 문제 해결)
NOTIFY pgrst, 'reload schema';
