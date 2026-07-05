-- page_visits: 일별 방문자 로그 (로그인 유저 / 비로그인 IP 해시, 하루 1회 집계)
-- Supabase SQL Editor에서 실행
--
-- 어드민 KPI 카드("일별 방문자")용 원본 로그 테이블.
-- 원본 IP는 저장하지 않고 SHA-256 해시만 저장한다.

CREATE TABLE public.page_visits (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_date  date        NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 로그인 유저: 같은 날 동일 user_id 재방문은 중복 집계하지 않음
CREATE UNIQUE INDEX idx_page_visits_user_date
  ON public.page_visits (visited_date, user_id)
  WHERE user_id IS NOT NULL;

-- 비로그인: 같은 날 동일 IP 해시 재방문은 중복 집계하지 않음
CREATE UNIQUE INDEX idx_page_visits_ip_date
  ON public.page_visits (visited_date, ip_hash)
  WHERE user_id IS NULL;

-- RLS 활성화
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- service_role(관리자 클라이언트)만 접근. 다른 사용자의 ip_hash/user_id가 담긴 로그이므로
-- authenticated에는 GRANT하지 않음 — 일반 유저 접근 불필요. service_role은 RLS를 우회하므로
-- 별도 정책(CREATE POLICY) 없이도 서비스 role 클라이언트만 읽고 쓸 수 있다.
GRANT ALL ON TABLE public.page_visits TO service_role;
