-- ============================================================
-- TickerFlow — Database Schema
-- 2026-06-25
-- ============================================================
-- Supabase SQL Editor에서 전체 실행
-- profiles 테이블은 건드리지 않음
-- ============================================================


-- ============================================================
-- 1. tickers — 종목 기본 정보
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickers (
  ticker               TEXT PRIMARY KEY,
  name_en              TEXT NOT NULL,
  name_kr              TEXT,
  sector               TEXT,
  industry             TEXT,
  exchange             TEXT,
  description          TEXT,
  description_kr       TEXT,
  ceo                  TEXT,
  full_time_employees  INTEGER,
  website              TEXT,
  image                TEXT,
  ipo_date             DATE,
  headquarters         TEXT,
  market_cap           BIGINT
);


-- ============================================================
-- 2. stock_prices — 일별 종가 (yfinance)
-- ============================================================
-- PK를 (ticker, date) 복합키로 사용 → 중복 삽입 방지 + 별도 UUID 불필요
CREATE TABLE IF NOT EXISTS public.stock_prices (
  ticker      TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  close       NUMERIC(12, 4) NOT NULL,
  volume      BIGINT,
  change_pct  NUMERIC(8, 4),
  PRIMARY KEY (ticker, date)
);


-- ============================================================
-- 3. filings — SEC 공시
-- ============================================================
CREATE TABLE IF NOT EXISTS public.filings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker      TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  form_type   TEXT        NOT NULL,
  filed_at    TIMESTAMPTZ NOT NULL,
  title       TEXT,
  url         TEXT,
  summary_kr  TEXT,
  -- 주요 변화 분류 (랜딩/대시보드 핵심 기능)
  event_type  TEXT        CHECK (event_type IN ('ceo_change','cfo_change','buyback','ma','guidance','contract','dividend','offering','lawsuit','earnings','fda_approval','dividend_increase','sec_investigation','bankruptcy','other')),
  -- 동일 공시 중복 삽입 방지 (SEC URL은 공시별 고유)
  UNIQUE (url)
);


-- ============================================================
-- 4. news — 뉴스 (Finnhub)
-- ============================================================
-- ticker: nullable — 시장 전반 뉴스는 특정 종목 없음
CREATE TABLE IF NOT EXISTS public.news (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker       TEXT        REFERENCES public.tickers(ticker) ON DELETE SET NULL,
  headline     TEXT        NOT NULL,
  source       TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  url          TEXT,
  summary_kr   TEXT,
  UNIQUE (url)
);


-- ============================================================
-- 5. earnings — 실적 캘린더 (Finnhub)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.earnings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker           TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  report_date      DATE        NOT NULL,
  -- bmo: Before Market Open / amc: After Market Close
  time_of_day      TEXT        CHECK (time_of_day IN ('bmo', 'amc')),
  eps_estimate     NUMERIC(10, 4),
  revenue_estimate NUMERIC(20, 2),   -- 단위: 백만 달러
  actual_eps       NUMERIC(10, 4),   -- 실적 발표 후 채움
  actual_revenue   NUMERIC(20, 2),   -- 실적 발표 후 채움
  UNIQUE (ticker, report_date)
);


-- ============================================================
-- 6. earnings_calls — 어닝콜 요약 (Pro, Claude Sonnet)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.earnings_calls (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker         TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  fiscal_quarter SMALLINT    NOT NULL CHECK (fiscal_quarter BETWEEN 1 AND 4),
  fiscal_year    SMALLINT    NOT NULL,
  summary_kr     TEXT,
  key_points     JSONB,      -- 구조화 요약: 가이던스, CEO 키워드, Q&A 등
  tone_change    TEXT,       -- 전분기 대비 발언 변화 서술 (중립 표현)
  source_url     TEXT,
  processed_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ticker, fiscal_quarter, fiscal_year)
);


-- ============================================================
-- 7. insider_trades — 내부자 거래 (Finnhub Premium)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insider_trades (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker           TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  name             TEXT,       -- 내부자 이름
  title            TEXT,       -- 직함 (CEO, CFO 등)
  transaction_type TEXT        NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  shares           BIGINT,
  price            NUMERIC(12, 4),
  value            NUMERIC(20, 2),   -- shares × price
  transaction_date DATE,
  filed_at         TIMESTAMPTZ,
  -- 동일 거래 중복 삽입 방지
  UNIQUE (ticker, name, transaction_date, shares, transaction_type)
);


-- ============================================================
-- 8. macro_indicators — 경제지표 (Finnhub)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.macro_indicators (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_name TEXT        NOT NULL,   -- "CPI", "Fed Rate", "NFP" 등
  value          NUMERIC,
  previous_value NUMERIC,
  released_at    TIMESTAMPTZ NOT NULL,
  source         TEXT,                   -- "Fed", "BLS", "Census" 등
  UNIQUE (indicator_name, released_at)
);


-- ============================================================
-- 9. watchlist — 와치리스트 (유저 데이터)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watchlist (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker   TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker)
);


-- ============================================================
-- 10. alerts — 알림 설정 (유저 데이터, Pro)
-- ============================================================
-- alert_type: '8k' | '10k' | '10q' | 'form4' | 'other'
CREATE TABLE IF NOT EXISTS public.alerts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker     TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  alert_type TEXT        NOT NULL CHECK (alert_type IN ('8k', '10k', '10q', 'form4', 'other')),
  enabled    BOOLEAN     NOT NULL DEFAULT true,
  UNIQUE (user_id, ticker, alert_type)
);


-- ============================================================
-- 11. analysis_reports — 공시 인사이트 캐시 (Pro, Claude Sonnet)
-- ============================================================
-- 공시 1건당 리포트 1개 → UNIQUE(filing_id)로 중복 생성 방지
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id    UUID        NOT NULL REFERENCES public.filings(id) ON DELETE CASCADE,
  report_kr    TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (filing_id)
);


-- ============================================================
-- 인덱스
-- ============================================================

-- stock_prices
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker        ON public.stock_prices(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_prices_date          ON public.stock_prices(date DESC);

-- filings
CREATE INDEX IF NOT EXISTS idx_filings_ticker             ON public.filings(ticker);
CREATE INDEX IF NOT EXISTS idx_filings_filed_at           ON public.filings(filed_at DESC);
CREATE INDEX IF NOT EXISTS idx_filings_event_type         ON public.filings(event_type) WHERE event_type IS NOT NULL;

-- news
CREATE INDEX IF NOT EXISTS idx_news_ticker                ON public.news(ticker);
CREATE INDEX IF NOT EXISTS idx_news_published_at          ON public.news(published_at DESC);

-- earnings
CREATE INDEX IF NOT EXISTS idx_earnings_ticker            ON public.earnings(ticker);
CREATE INDEX IF NOT EXISTS idx_earnings_report_date       ON public.earnings(report_date);

-- earnings_calls
CREATE INDEX IF NOT EXISTS idx_earnings_calls_ticker      ON public.earnings_calls(ticker);

-- insider_trades
CREATE INDEX IF NOT EXISTS idx_insider_trades_ticker      ON public.insider_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_insider_trades_date        ON public.insider_trades(transaction_date DESC);

-- macro_indicators
CREATE INDEX IF NOT EXISTS idx_macro_indicators_released  ON public.macro_indicators(released_at DESC);

-- watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id          ON public.watchlist(user_id);

-- alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user_id             ON public.alerts(user_id);

-- analysis_reports
CREATE INDEX IF NOT EXISTS idx_analysis_reports_filing_id ON public.analysis_reports(filing_id);


-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE public.tickers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_prices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_calls   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insider_trades   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.macro_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts           ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS 정책 — 공개 데이터 (authenticated SELECT)
-- ============================================================
CREATE POLICY "authenticated can select tickers"
  ON public.tickers FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select stock_prices"
  ON public.stock_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select filings"
  ON public.filings FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select news"
  ON public.news FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select earnings"
  ON public.earnings FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select earnings_calls"
  ON public.earnings_calls FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select insider_trades"
  ON public.insider_trades FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select macro_indicators"
  ON public.macro_indicators FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can select analysis_reports"
  ON public.analysis_reports FOR SELECT TO authenticated USING (true);


-- ============================================================
-- RLS 정책 — 유저 데이터 (본인 데이터만)
-- ============================================================

-- watchlist
CREATE POLICY "users can select own watchlist"
  ON public.watchlist FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users can insert own watchlist"
  ON public.watchlist FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can delete own watchlist"
  ON public.watchlist FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- alerts
CREATE POLICY "users can select own alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users can insert own alerts"
  ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can update own alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can delete own alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (user_id = auth.uid());


-- ============================================================
-- GRANT
-- ============================================================

-- 공개 데이터 — SELECT만
GRANT SELECT ON public.tickers          TO authenticated;
GRANT SELECT ON public.stock_prices     TO authenticated;
GRANT SELECT ON public.filings          TO authenticated;
GRANT SELECT ON public.news             TO authenticated;
GRANT SELECT ON public.earnings         TO authenticated;
GRANT SELECT ON public.earnings_calls   TO authenticated;
GRANT SELECT ON public.insider_trades   TO authenticated;
GRANT SELECT ON public.macro_indicators TO authenticated;
GRANT SELECT ON public.analysis_reports TO authenticated;

-- 유저 데이터 — 전체 권한
GRANT SELECT, INSERT, DELETE           ON public.watchlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.alerts    TO authenticated;


-- ============================================================
-- 12. youtube_channels — 유튜브 채널 협업 후보 관리 (어드민 전용)
-- ============================================================
-- 실행용 SQL은 supabase/youtube_channels.sql 참고 (RLS 정책 admin 이메일: nudgefilm@gmail.com)
CREATE TABLE IF NOT EXISTS public.youtube_channels (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        TEXT        NOT NULL UNIQUE,
  channel_name      TEXT        NOT NULL,
  channel_url       TEXT        NOT NULL,
  description       TEXT,
  subscriber_count  INTEGER,
  video_count       INTEGER,
  thumbnail_url     TEXT,
  email_sent        BOOLEAN     DEFAULT false,
  memo              TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.youtube_channels TO service_role;

-- authenticated는 어드민 계정만 접근 가능 (RLS로 이메일 제한, 정책은 youtube_channels.sql 참고)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.youtube_channels TO authenticated;


-- ============================================================
-- 13. page_visits — 일별 방문자 로그 (어드민 KPI 카드용)
-- ============================================================
-- 실행용 SQL은 supabase/page_visits.sql 참고
-- 원본 IP는 저장하지 않고 SHA-256 해시만 저장한다.
CREATE TABLE IF NOT EXISTS public.page_visits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_date  DATE        NOT NULL,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 로그인 유저: 같은 날 동일 user_id 재방문은 중복 집계하지 않음
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_visits_user_date
  ON public.page_visits (visited_date, user_id)
  WHERE user_id IS NOT NULL;

-- 비로그인: 같은 날 동일 IP 해시 재방문은 중복 집계하지 않음
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_visits_ip_date
  ON public.page_visits (visited_date, ip_hash)
  WHERE user_id IS NULL;

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- service_role만 접근. 다른 사용자의 ip_hash/user_id가 담긴 로그이므로
-- authenticated에는 GRANT하지 않음 (일반 유저 접근 불필요, service_role은 RLS 우회)
GRANT ALL ON TABLE public.page_visits TO service_role;
