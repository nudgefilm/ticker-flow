-- 주간/월간 BRIEF 캐시 테이블
-- 매주 월요일 / 매월 1일 Cron이 계산 결과를 저장하고, 페이지는 이 테이블만 읽는다.
-- Supabase SQL Editor에서 실행

CREATE TABLE weekly_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start date NOT NULL UNIQUE,
  data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now()
);

CREATE TABLE monthly_briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month_start date NOT NULL UNIQUE,
  data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now()
);

-- RLS 활성화 + 로그인 사용자 전체 SELECT 허용
-- (다른 공개 데이터 테이블과 동일한 패턴 — top30_daily/institutional_holdings 등)
ALTER TABLE public.weekly_briefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can select weekly_briefs"
  ON public.weekly_briefs FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select monthly_briefs"
  ON public.monthly_briefs FOR SELECT TO authenticated USING (true);
