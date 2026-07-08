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
