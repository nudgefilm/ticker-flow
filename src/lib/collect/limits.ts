// 종목별로 외부 API(Finnhub 등)를 순차 호출하는 collect job들의 공용 상한값.
// Vercel 함수 maxDuration(300초)을 넘기지 않도록 조회 기간·종목 수를 여기서
// 중앙 관리한다 — 운영 중 값을 조정할 때 이 파일만 고치면 되고, 개별 collect
// 함수를 수정할 필요가 없다.

// insider.ts가 Finnhub 응답(종목당 전체 Form 4 히스토리)에서 처리할 거래를
// 최근 며칠 이내로 제한한다. 오래된 거래는 이전 실행에서 이미 수집됐을
// 가능성이 높고, "최근 내부자 거래" 모니터링이라는 서비스 목적에도 맞지
// 않는다. 대형주(NVDA·TSLA 등)는 종목당 100건 이상의 히스토리를 반환해,
// 이 필터 없이는 종목별 SEC Form 4 직책 조회(insider-form4.ts) 횟수가
// 급증해 maxDuration을 초과했다(2026-07-08 insider_trades 12일 정체 원인).
export const INSIDER_LOOKBACK_DAYS = 30;

// insider.ts·news.ts(company-news)가 한 번의 실행에서 순차 처리하는 최대
// 종목 수. getCollectTargetTickers()가 와치리스트·TOP30·거래량·섹터 상위
// 종목까지 합산해 150개 이상을 반환할 수 있어, 종목당 호출(딜레이 포함)이
// 누적되어 maxDuration을 넘기지 않도록 상한을 둔다.
export const MAX_TICKERS_PER_RUN = 30;

// 단일 Form 4 거래(shares × price)의 달러 가치가 이 값을 넘으면 저장은 하되
// console.warn으로 남긴다(차단하지 않음 — 초대형 실제 거래일 가능성을 배제하지
// 않음). 실측 분포(2026-07-16, insider_trades 27,649건): 90th percentile
// $81M, 99th percentile부터 $12.86B로 급격히 뛰는 절벽이 있어 그 이전 구간인
// 10억 달러를 기준으로 둔다 — 단일 Form 4 공개시장 거래가 10억 달러를 넘는
// 경우는 극히 이례적이다(참고: 2026-07-16 발견된 사고는 Finnhub의 share
// 필드를 "이번 거래 주식수"로 오인해 "거래 후 총 보유 주식수"를 그대로
// 저장한 것 — insider.ts의 change 필드 사용으로 근본 수정, 이 임계값은
// 재발 방지용 2차 방어선).
export const INSIDER_VALUE_REVIEW_THRESHOLD = 1_000_000_000;

// ─── 화면·기능별 조회 기간(day-window) 상수 ──────────────────────────────────
//
// insider_trades를 비롯한 여러 화면·배치가 각자 "최근 N일" 매직넘버를 개별
// 하드코딩하고 있었다(2026-07-17 발견 — 같은 날 발견한 섹터 매핑 문제와 동일
// 유형의 구조적 위험: 같은 개념을 여러 파일이 각자 들고 있다가 한쪽만 갱신되며
// 어긋남). 값 자체는 바꾸지 않고 위치만 이 파일로 모은다 — 90일(전용 페이지)
// vs 180일(종합 페이지) 불일치도 조사 결과 각 화면의 UI 목적이 달라 생긴
// 차이라 그대로 유지한다(아래 각 상수 설명 참고). 대부분은 insider_trades
// 하나만 위한 창이 아니라 같은 화면의 filings/news 등과 공유하는 창이라,
// 상수 이름은 "그 화면·기능"을 기준으로 지었다.

// insider/page.tsx(내부자 거래 전용 페이지) — 서버에서 이 기간만큼 미리 가져와
// InsiderBoard 클라이언트 컴포넌트에 넘긴다. 컴포넌트 내부의 7/30/90일 필터
// 토글(가장 넓은 옵션이 90일)이 데이터를 가지려면 서버 fetch도 최소 90일이어야
// 해서, 이 값은 그 필터의 최대 옵션과 결합되어 있다 — 임의로 고른 값이 아니다.
export const INSIDER_BOARD_PAGE_WINDOW_DAYS = 90;

// analysis/page.tsx(공시 인사이트 종합 페이지)의 내부자거래 위젯 전용 창.
// 같은 파일의 filings(30일)·news(90일)와는 별개 상수 — 필터 UI가 없는 고정
// 요약 위젯이라 전용 페이지보다 넓은 기간을 보여준다.
export const ANALYSIS_INSIDER_WINDOW_DAYS = 180;

// stocks/[symbol]/page.tsx(종목 스냅샷)의 "최근 활동" 창 — 이 파일에서
// filings·news·insider_trades 세 테이블이 전부 이 값을 공유한다.
export const STOCK_SNAPSHOT_WINDOW_DAYS = 30;

// watchlist/page.tsx의 "급상승 종목(Trending)" 위젯 창 — filings·news로 순위를
// 매기고, 선정된 top30 종목의 insider_trades도 같은 창으로 함께 조회한다.
export const WATCHLIST_TRENDING_WINDOW_DAYS = 7;

// scoring.ts(TOP30 스크리너, 어드민 전용)의 insider_trades 매수 집계 등에 쓰는
// "최근 N일" 창. filings/news는 별도의 14일 창을 쓰므로 그건 그대로 둔다.
export const SCORING_RECENT_WINDOW_DAYS = 30;

// brief.ts(종목별 BRIEF 생성)의 "최근 30일" 창 — filings·news·insider_trades가
// 공유한다.
export const STOCK_BRIEF_WINDOW_DAYS = 30;

// watchlist-brief.ts의 computeRange(days)를 호출하는 세 브리프 주기(일간/주간/
// 월간) 각각의 조회 기간 — filings·news·insider_trades·institutional_holdings를
// 모두 이 값으로 함께 조회한다. watchlist-brief.ts 자체는 이미 days를 매개변수로
// 받는 공용 함수라 하드코딩이 아니다 — 실제 매직넘버는 호출부(daily/weekly/
// monthly-brief.ts)에 있다.
export const DAILY_DIGEST_WINDOW_DAYS = 1;
export const WEEKLY_BRIEF_WINDOW_DAYS = 7;
export const MONTHLY_BRIEF_WINDOW_DAYS = 30;
