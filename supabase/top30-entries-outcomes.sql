-- top30_entries / top30_outcome_results: 티커플로우 스크리너 2.5단계 —
-- "배점 설계"가 아니라 "검증 인프라 구축". TOP30 선정 시점의 factor_log
-- 스냅샷을 불변 기록으로 남기고, 이후 가격 성과(30/60/90일)를 추적해
-- 2~3개월 운영 후 팩터별 예측력을 실측 데이터로 분석한다 (4단계 배점 설계의
-- 근거 자료). CLAUDE.md 18항 어드민 전용 규제 예외 구간 — 사용자 노출
-- 화면·API에는 절대 포함하지 않는다.
-- Supabase SQL Editor에서 실행

-- ============================================================
-- top30_entries — 선정 시점 스냅샷 (불변)
-- ============================================================
-- 불변 원칙: 생성 이후 절대 UPDATE하지 않는다(INSERT 전용 테이블). 이후
-- factor_log 계산 로직 변경, weights.ts 비중 변경, model_version 갱신이
-- 발생해도 이미 생성된 행은 그대로 유지한다. 운영 중 DELETE도 하지 않으며,
-- 데이터 수정이 필요해도 기존 행을 바꾸지 않고 새 Entry를 생성하는 방향을
-- 우선한다(명백한 수집 오류에 대한 관리자 수동 보정만 예외).
-- 좁은 예외 — 당일 재실행: 스크리너를 같은 날 여러 번 수동 재실행하면
-- (ticker, selected_date) UNIQUE 제약 위반이 발생해, upsert_top30_with_entries()
-- 함수가 INSERT 직전에 "오늘 날짜(selected_date)"에 해당하는 행만 먼저
-- DELETE한다(아래 함수 정의 참고). 이미 하루가 지나 확정된 과거 날짜의
-- entries는 이 DELETE 대상이 아니므로 "과거 기록은 절대 수정하지 않는다"는
-- 불변 원칙과는 충돌하지 않는다 — entry_price 백필과 마찬가지로 "확정된 과거
-- 값의 수정"이 아니라 "아직 하루가 끝나지 않은 오늘 스냅샷의 재계산"이다.
CREATE TABLE IF NOT EXISTS public.top30_entries (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker                TEXT        NOT NULL REFERENCES public.tickers(ticker) ON DELETE CASCADE,
  selected_date         DATE        NOT NULL,
  factor_log_snapshot   JSONB,      -- 선정 시점 factor_log 그대로 복사
  final_score_snapshot  NUMERIC(14, 4),  -- 선정 시점 Internal Score
  entry_price           NUMERIC(14, 4),  -- 선정일 종가 (stock_prices)
  rank_snapshot         INTEGER,    -- 선정 당시 TOP30 내 순위 (1~30)
  reason_tags_snapshot  JSONB,      -- 지금은 ["insider_buy_large", ...] 단순 배열,
                                    -- 향후 [{tag, score}] 구조로 발전 가능하도록 jsonb로 열어둠
  model_version         TEXT        NOT NULL,  -- src/lib/scoring/version.ts 스냅샷
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ticker, selected_date)
);

CREATE INDEX IF NOT EXISTS idx_top30_entries_selected_date
  ON public.top30_entries (selected_date DESC);
CREATE INDEX IF NOT EXISTS idx_top30_entries_model_version
  ON public.top30_entries (model_version);

ALTER TABLE public.top30_entries ENABLE ROW LEVEL SECURITY;
-- 어드민 전용 규제 예외 데이터 — authenticated에는 GRANT하지 않는다
-- (page_visits와 동일 패턴, 일반 유저 접근 불필요, service_role은 RLS 우회)
GRANT ALL ON public.top30_entries TO service_role;

-- ============================================================
-- top30_outcome_results — 정규화된 성과 기록 (entry_id 기준)
-- ============================================================
-- entry_id가 모든 계산의 유일한 기준이다. ticker/selected_date는 조회
-- 최적화를 위한 비정규화 컬럼일 뿐이며, return_pct 계산 시 entry_price는
-- 반드시 top30_entries.entry_price(entry_id로 조인한 값)를 참조한다 — 이
-- 테이블의 ticker/selected_date로 별도 조회하여 entry_price를 구하지 않는다.
-- top30_entries와 마찬가지로 운영 중 DELETE하지 않으며, 명백한 수집 오류에
-- 대한 관리자 수동 보정 외에는 기존 행을 변경하지 않는다.
CREATE TABLE IF NOT EXISTS public.top30_outcome_results (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id              UUID        NOT NULL REFERENCES public.top30_entries(id) ON DELETE CASCADE,
  ticker                TEXT        NOT NULL,  -- 비정규화 (조회 성능용)
  selected_date         DATE        NOT NULL,  -- 비정규화 (조회 성능용)
  days_after            INTEGER     NOT NULL,
  close_price           NUMERIC(14, 4),
  return_pct            NUMERIC(10, 4),
  benchmark_return_pct  NUMERIC(10, 4),  -- 이번 단계에서는 항상 null, 3단계 이후 채움
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

-- ============================================================
-- RPC: top30_daily upsert + top30_entries/outcome_results 신규 행 생성을
-- 하나의 트랜잭션으로 묶는다 (PostgREST는 여러 요청에 걸친 클라이언트
-- 트랜잭션을 지원하지 않으므로, Postgres 함수 내부에서 원자적으로 처리).
-- 단일 함수 호출은 Postgres에서 이미 하나의 트랜잭션이므로 별도 BEGIN/COMMIT
-- 없이도 함수 내 어느 한 단계라도 실패하면 전체가 롤백된다.
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_top30_with_entries(
  p_rows jsonb,             -- top30_daily 전체 행 (배열)
  p_entries jsonb,          -- 오늘 신규 진입 종목의 top30_entries 스냅샷 (배열, 없으면 [])
  p_tracked_days integer[]  -- outcomes/config.ts TRACKED_DAYS
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
  v_today date;
BEGIN
  -- top30_daily는 (date, ticker) UNIQUE라 같은 날 재실행해도 UNIQUE 위반은
  -- 나지 않지만, ON CONFLICT DO UPDATE는 "이번 실행에 없는" 종목의 행을
  -- 지우지 않는다. 세션93 자격 필터 배포 직후에도 배포 이전 스케줄 실행의
  -- 잔존 행(CUEN 등 필터 대상 13개 포함)이 계속 남아 오늘자 행이 30개가
  -- 아니라 43개로 누적된 것을 실측 확인했다. top30_entries와 동일하게, 오늘
  -- 날짜(p_rows 첫 행의 date)에 해당하는 기존 행을 먼저 전체 DELETE한 뒤
  -- 이번 실행 결과(자격 필터 통과분, 30개 이하일 수 있음)만 다시 INSERT한다.
  IF jsonb_array_length(p_rows) > 0 THEN
    v_today := (p_rows->0->>'date')::date;
    DELETE FROM public.top30_daily WHERE date = v_today;
  END IF;

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

  -- 같은 날 스크리너를 재실행하면 이전 실행에서 이미 저장한 오늘자
  -- top30_entries 행이 그대로 남아있어 (ticker, selected_date) UNIQUE 제약을
  -- 위반한다("duplicate key value violates unique constraint
  -- top30_entries_ticker_selected_date_key"). v_today(위에서 계산한 오늘
  -- 날짜)에 해당하는 기존 entries만 delete-then-insert로 교체한다. 과거
  -- 날짜의 entries는 전혀 건드리지 않으므로 상단에 적어둔 top30_entries
  -- "불변(과거 기록은 절대 수정하지 않음)" 원칙과 충돌하지 않는다 — 이
  -- DELETE는 "아직 하루가 끝나지 않은 오늘 스냅샷"만을 대상으로 한다.
  -- entry_id를 FK로 참조하는 top30_outcome_results도 ON DELETE CASCADE로
  -- 함께 삭제되는데, 방금 생성된 당일 pending 행(실제 성과 데이터 없음)만
  -- 사라지므로 데이터 손실이 아니다. 함수 전체가 단일 트랜잭션이라 DELETE와
  -- 이후 INSERT 사이에 실패해도 부분 삭제 상태로 남지 않는다.
  IF v_today IS NOT NULL THEN
    DELETE FROM public.top30_entries WHERE selected_date = v_today;
  END IF;

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
