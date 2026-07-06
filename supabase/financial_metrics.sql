-- financial_metrics: 재무 품질 팩터(매출성장률 YoY, EPS성장률 YoY, FCF, ROIC/ROE) 원시 데이터
-- Supabase SQL Editor에서 실행
-- 티커플로우 스크리너 2단계 — 이 테이블은 원시 데이터 수집용이며, 스코어링 반영은
-- 별도 단계에서 진행한다 (CLAUDE.md 18항 — revenueGrowth/epsGrowth/fcf/roic는 계속 active: false).

CREATE TABLE IF NOT EXISTS public.financial_metrics (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker               TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  period_type          TEXT        NOT NULL CHECK (period_type IN ('quarter', 'annual')),
  period_end           DATE        NOT NULL,
  fiscal_year          INTEGER,
  fiscal_period        TEXT,       -- "Q1"/"Q2"/"Q3"/"Q4"/"FY"
  currency             TEXT,       -- FMP profile.currency (예: "USD")
  revenue              NUMERIC(20, 2),   -- 원본 — income-statement.revenue
  eps                  NUMERIC(12, 4),   -- 원본 — income-statement.eps
  operating_cash_flow  NUMERIC(20, 2),   -- 원본 — cash-flow-statement.operatingCashFlow
  capital_expenditure  NUMERIC(20, 2),   -- 원본 — cash-flow-statement.capitalExpenditure (FMP 기준 음수)
  revenue_growth_yoy   NUMERIC(10, 4),   -- 계산값 — 전년 동기 대비 %, 예: 12.34 = +12.34%
  eps_growth_yoy       NUMERIC(10, 4),   -- 계산값 — 전년 동기 대비 %
  fcf                  NUMERIC(20, 2),   -- 계산값 — operating_cash_flow + capital_expenditure
  roic                 NUMERIC(10, 6),   -- key-metrics.returnOnInvestedCapital (소수, 예: 0.12 = 12%)
  roe                  NUMERIC(10, 6),   -- key-metrics.returnOnEquity (소수)
  raw_payload          JSONB,            -- 해당 period_end 단일 분기의 FMP 원본 응답만 저장 (배열 전체 금지)
  source_updated_at    TIMESTAMPTZ,      -- FMP 원본 기준 시점 (acceptedDate 우선, 없으면 filingDate)
  collected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 동일 (ticker, period_type, period_end) 재수집 시 INSERT가 아니라 UPSERT로 전체 컬럼 갱신
  UNIQUE (ticker, period_type, period_end)
);

CREATE INDEX IF NOT EXISTS idx_financial_metrics_period_end
  ON public.financial_metrics (period_end DESC);

ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.financial_metrics TO authenticated;
GRANT ALL    ON public.financial_metrics TO service_role;

CREATE POLICY "authenticated can select financial_metrics"
  ON public.financial_metrics FOR SELECT TO authenticated USING (true);
