-- tickers.prices_last_attempted_at: stock_prices 수집 큐 회전용 "티커별" 마지막
-- 시도 시각. 기존에는 stock_prices row의 collected_at으로 우선순위를 정했는데,
-- 한 티커가 수백 개의 날짜별 row를 가지고 있고 최근 35일치만 매일 갱신되다
-- 보니, 35일보다 오래된 과거 row의 collected_at이 영원히 갱신되지 않아 그
-- 티커가 실제로는 최근에 정상 수집됐는데도 "가장 오래된 티커"로 계속 오판되는
-- 문제가 있었다(실제 백필 테스트 중 발견). 티커 단위로 1개 값만 갖는 이 컬럼으로
-- 교체해 이 문제를 근본적으로 해결한다.
-- Supabase SQL Editor에서 실행

ALTER TABLE public.tickers
  ADD COLUMN IF NOT EXISTS prices_last_attempted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tickers_prices_last_attempted_at
  ON public.tickers (prices_last_attempted_at ASC NULLS FIRST);

COMMENT ON COLUMN public.tickers.prices_last_attempted_at IS
  'runPricesCollect()가 이 티커에 대해 마지막으로 수집을 "시도"한 시각(성공/실패 무관). stock_prices 수집 큐(collected_at ASC NULLS FIRST) 우선순위 산정에 사용 — 티커별 단일 값이라 row 단위 collected_at의 과거 데이터 오염 문제가 없다.';
