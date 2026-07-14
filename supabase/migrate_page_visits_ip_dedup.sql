-- 2026-07-14: 방문자 중복 집계 기준을 IP 하나로 통일한다.
-- 기존: 로그인은 (visited_date, user_id), 비로그인은 (visited_date, ip_hash)로 각각 dedup
--       → 같은 IP라도 로그인/비로그인 방문이 따로 카운트됨.
-- 변경: (visited_date, ip_hash) 전체 유니크 인덱스로 바꿔, 로그인 여부와 무관하게
--       같은 IP는 하루 1회만 카운트. user_id 인덱스는 유지(동일 유저 다중 IP 방지).
-- Supabase SQL Editor에서 실행.

-- 부분 인덱스(WHERE user_id IS NULL) 제거 후 전체 유니크 인덱스로 재생성.
DROP INDEX IF EXISTS public.idx_page_visits_ip_date;

CREATE UNIQUE INDEX idx_page_visits_ip_date
  ON public.page_visits (visited_date, ip_hash);

-- 참고: 과거 로그인 방문 행은 ip_hash가 NULL이며, PostgreSQL은 유니크 인덱스에서
-- NULL을 서로 다른 값으로 취급하므로 인덱스 생성이 실패하지 않는다. 기존 비로그인
-- 행은 이미 (visited_date, ip_hash)가 유일했으므로 중복 충돌도 없다.
-- 이 변경은 신규 방문부터 적용되며, 과거에 쌓인 오늘자 행은 재정리하지 않는다.
