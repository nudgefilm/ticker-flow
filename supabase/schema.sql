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

-- 같은 날 동일 IP 해시 재방문은 로그인/비로그인 무관하게 중복 집계하지 않음
-- (ip_hash는 모든 방문에 기록 — 부분 인덱스가 아닌 전체 유니크 인덱스)
CREATE UNIQUE INDEX IF NOT EXISTS idx_page_visits_ip_date
  ON public.page_visits (visited_date, ip_hash);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- service_role만 접근. 다른 사용자의 ip_hash/user_id가 담긴 로그이므로
-- authenticated에는 GRANT하지 않음 (일반 유저 접근 불필요, service_role은 RLS 우회)
GRANT ALL ON TABLE public.page_visits TO service_role;

-- ============================================================
-- 14. top30_daily.factor_log — 스크리너 팩터별 기여도 내부 로그
-- ============================================================
-- 실행용 SQL은 supabase/factor_log.sql 참고
-- 주: top30_daily 본 테이블 정의는 이 schema.sql에 기록되어 있지 않음(기존 운영 중
-- 테이블에 컬럼만 추가하는 변경이라 본 섹션은 factor_log 컬럼 추가분만 문서화한다).
ALTER TABLE public.top30_daily
  ADD COLUMN IF NOT EXISTS factor_log jsonb;

-- ============================================================
-- 15. financial_metrics — 재무 품질 팩터 원시 데이터 (스크리너 2단계)
-- ============================================================
-- 실행용 SQL은 supabase/financial_metrics.sql 참고
-- revenueGrowth/epsGrowth/fcf/roic 스코어링 반영은 별도 단계 — 이 테이블은
-- 원시 데이터 수집용이며 CLAUDE.md 18항 active:false 팩터와는 아직 연결되지 않는다.
CREATE TABLE IF NOT EXISTS public.financial_metrics (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker               TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  period_type          TEXT        NOT NULL CHECK (period_type IN ('quarter', 'annual')),
  period_end           DATE        NOT NULL,
  fiscal_year          INTEGER,
  fiscal_period        TEXT,
  currency             TEXT,
  revenue              NUMERIC(20, 2),
  eps                  NUMERIC(12, 4),
  operating_cash_flow  NUMERIC(20, 2),
  capital_expenditure  NUMERIC(20, 2),
  revenue_growth_yoy   NUMERIC(10, 4),
  eps_growth_yoy       NUMERIC(10, 4),
  fcf                  NUMERIC(20, 2),
  roic                 NUMERIC(10, 6),
  roe                  NUMERIC(10, 6),
  raw_payload          JSONB,
  source_updated_at    TIMESTAMPTZ,
  collected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticker, period_type, period_end)
);

CREATE INDEX IF NOT EXISTS idx_financial_metrics_period_end
  ON public.financial_metrics (period_end DESC);

ALTER TABLE public.financial_metrics ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.financial_metrics TO authenticated;
GRANT ALL    ON public.financial_metrics TO service_role;

CREATE POLICY "authenticated can select financial_metrics"
  ON public.financial_metrics FOR SELECT TO authenticated USING (true);

COMMENT ON COLUMN public.top30_daily.factor_log IS
  '13개 팩터(src/lib/scoring/weights.ts ScreenerFactor)별 raw score 내부 로그. 비활성 항목 또는 데이터 미존재 시 null(계산 안 함), 활성 항목은 계산된 raw score(0 포함) 저장. 사용자 노출 API/화면에는 절대 포함하지 않는다.';

-- ============================================================
-- 16. top30_daily.model_version — 스코어링 모델 버전 스냅샷
-- ============================================================
-- 실행용 SQL은 supabase/top30-model-version.sql 참고
ALTER TABLE public.top30_daily
  ADD COLUMN IF NOT EXISTS model_version text;

COMMENT ON COLUMN public.top30_daily.model_version IS
  'SCORING_MODEL_VERSION(src/lib/scoring/version.ts) 스냅샷. weights.ts의 SCREENER_WEIGHTS 변경 시 사람이 버전을 올리면, 이 컬럼으로 어느 날짜의 TOP30이 어떤 모델 버전으로 계산됐는지 즉시 알 수 있다.';

-- ============================================================
-- 17. top30_entries / top30_outcome_results — 스크리너 2.5단계
-- (배점 설계가 아니라 검증 인프라 구축: TOP30 선정 시점 스냅샷 + 이후
-- 가격 성과 추적. 2~3개월 데이터 축적 후 4단계 배점 설계의 근거 자료로 사용)
-- ============================================================
-- 실행용 SQL은 supabase/top30-entries-outcomes.sql 참고 (RPC 함수 포함)
-- 어드민 전용 규제 예외 구간 — 사용자 노출 화면·API에는 절대 포함하지 않는다.
-- 불변 원칙: top30_entries는 생성 이후 UPDATE하지 않는 INSERT 전용 테이블이다.
-- 운영 중 DELETE도 하지 않으며, 명백한 수집 오류에 대한 관리자 수동 보정 외에는
-- 기존 행을 변경하지 않고 새 Entry/Event를 생성하는 방향을 우선한다.
CREATE TABLE IF NOT EXISTS public.top30_entries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker                TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  selected_date         DATE        NOT NULL,
  factor_log_snapshot   JSONB,
  final_score_snapshot  NUMERIC(14, 4),
  entry_price           NUMERIC(14, 4),
  rank_snapshot         INTEGER,
  reason_tags_snapshot  JSONB,
  model_version         TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticker, selected_date)
);

CREATE INDEX IF NOT EXISTS idx_top30_entries_selected_date
  ON public.top30_entries (selected_date DESC);
CREATE INDEX IF NOT EXISTS idx_top30_entries_model_version
  ON public.top30_entries (model_version);

ALTER TABLE public.top30_entries ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.top30_entries TO service_role;

-- entry_id가 모든 계산의 유일한 기준. ticker/selected_date는 조회용 비정규화 컬럼.
CREATE TABLE IF NOT EXISTS public.top30_outcome_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              UUID        NOT NULL REFERENCES public.top30_entries(id) ON DELETE CASCADE,
  ticker                TEXT        NOT NULL,
  selected_date         DATE        NOT NULL,
  days_after            INTEGER     NOT NULL,
  close_price           NUMERIC(14, 4),
  return_pct            NUMERIC(10, 4),
  benchmark_return_pct  NUMERIC(10, 4),
  status                TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entry_id, days_after)
);

CREATE INDEX IF NOT EXISTS idx_top30_outcome_results_ticker_date
  ON public.top30_outcome_results (ticker, selected_date);
CREATE INDEX IF NOT EXISTS idx_top30_outcome_results_status
  ON public.top30_outcome_results (status);
CREATE INDEX IF NOT EXISTS idx_top30_outcome_results_days_after
  ON public.top30_outcome_results (days_after);

ALTER TABLE public.top30_outcome_results ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.top30_outcome_results TO service_role;

-- top30_daily upsert + top30_entries/outcome_results 신규 행 생성을 하나의
-- 트랜잭션으로 묶는 RPC. 단일 함수 호출은 Postgres에서 이미 하나의
-- 트랜잭션이므로 어느 한 단계라도 실패하면 전체가 롤백된다.
CREATE OR REPLACE FUNCTION public.upsert_top30_with_entries(
  p_rows jsonb,
  p_entries jsonb,
  p_tracked_days integer[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  e jsonb;
  new_entry_id uuid;
  d integer;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO public.top30_daily (
      date, ticker, rank, event_score, smart_score, earnings_score, market_score,
      final_score, reason_tags, metadata, factor_log, model_version, updated_at
    )
    VALUES (
      (r->>'date')::date,
      r->>'ticker',
      (r->>'rank')::integer,
      (r->>'event_score')::numeric,
      (r->>'smart_score')::numeric,
      (r->>'earnings_score')::numeric,
      (r->>'market_score')::numeric,
      (r->>'final_score')::numeric,
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(r->'reason_tags', '[]'::jsonb))),
      r->'metadata',
      r->'factor_log',
      r->>'model_version',
      (r->>'updated_at')::timestamptz
    )
    ON CONFLICT (date, ticker) DO UPDATE SET
      rank           = EXCLUDED.rank,
      event_score    = EXCLUDED.event_score,
      smart_score    = EXCLUDED.smart_score,
      earnings_score = EXCLUDED.earnings_score,
      market_score   = EXCLUDED.market_score,
      final_score    = EXCLUDED.final_score,
      reason_tags    = EXCLUDED.reason_tags,
      metadata       = EXCLUDED.metadata,
      factor_log     = EXCLUDED.factor_log,
      model_version  = EXCLUDED.model_version,
      updated_at     = EXCLUDED.updated_at;
  END LOOP;

  FOR e IN SELECT * FROM jsonb_array_elements(p_entries) LOOP
    INSERT INTO public.top30_entries (
      ticker, selected_date, factor_log_snapshot, final_score_snapshot,
      entry_price, rank_snapshot, reason_tags_snapshot, model_version
    )
    VALUES (
      e->>'ticker',
      (e->>'selected_date')::date,
      e->'factor_log_snapshot',
      (e->>'final_score_snapshot')::numeric,
      (e->>'entry_price')::numeric,
      (e->>'rank_snapshot')::integer,
      e->'reason_tags_snapshot',
      e->>'model_version'
    )
    RETURNING id INTO new_entry_id;

    FOREACH d IN ARRAY p_tracked_days LOOP
      INSERT INTO public.top30_outcome_results (entry_id, ticker, selected_date, days_after, status)
      VALUES (new_entry_id, e->>'ticker', (e->>'selected_date')::date, d, 'pending');
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_top30_with_entries(jsonb, jsonb, integer[]) TO service_role;

-- ============================================================
-- 18. tickers.prices_last_attempted_at — stock_prices 수집 큐 회전용
-- ============================================================
-- 실행용 SQL은 supabase/tickers-prices-last-attempted.sql 참고
ALTER TABLE public.tickers
  ADD COLUMN IF NOT EXISTS prices_last_attempted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tickers_prices_last_attempted_at
  ON public.tickers (prices_last_attempted_at ASC NULLS FIRST);

COMMENT ON COLUMN public.tickers.prices_last_attempted_at IS
  'runPricesCollect()가 이 티커에 대해 마지막으로 수집을 "시도"한 시각(성공/실패 무관). stock_prices 수집 큐(collected_at ASC NULLS FIRST) 우선순위 산정에 사용 — 티커별 단일 값이라 row 단위 collected_at의 과거 데이터 오염 문제가 없다.';


-- ============================================================
-- 19. profiles.pro_expires_at — 어드민 Pro 수동 부여 만료일 관리
-- ============================================================
-- 실행용 SQL은 supabase/pro-expires-at.sql 참고
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

COMMENT ON COLUMN public.profiles.pro_expires_at IS
  '어드민 "Pro 수동 부여"로 설정한 만료 시각. null=무기한. src/lib/collect/pro-expiry.ts의 매일 1회 강등 잡이 지난 시각의 pro 유저를 free로 되돌린다.';

-- ============================================================
-- 20. digest_featured_log — 데일리 다이제스트 "이번 주 활동이 많은 기업 소개"
--     섹션의 주간 로테이션 이력
-- ============================================================
-- 실행용 SQL은 supabase/digest-featured-log.sql 참고
-- 같은 종목이 매일 반복 노출되는 문제(활동 1위가 매번 descMap 조건에서 스킵되며
-- 2위가 고정적으로 뽑히던 사례)를 막기 위해, 이번 주(월요일 00:00 UTC~) 안에
-- 이미 소개된 ticker를 이 테이블로 추적하고 digest.ts가 제외 대상으로 조회한다.
CREATE TABLE IF NOT EXISTS public.digest_featured_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker        TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  featured_date DATE        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digest_featured_log_featured_date
  ON public.digest_featured_log (featured_date DESC);

ALTER TABLE public.digest_featured_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.digest_featured_log TO authenticated;
GRANT ALL    ON public.digest_featured_log TO service_role;

CREATE POLICY "authenticated can select digest_featured_log"
  ON public.digest_featured_log FOR SELECT TO authenticated USING (true);
