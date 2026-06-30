# TickerFlow — 개발 작업 기록

---

## 2026-06-30 · 세션 65

### 텔레그램 채널 연동 + EPS 차트 버그 수정

**텔레그램 플로팅 버튼 신규 (`src/components/telegram-float-button.tsx`)**
- 우측 하단 `bottom-[4.5rem] right-6` 상시 노출, 위로가기 버튼 바로 위 세로 배치
- `src/app/layout.tsx` 에 삽입 → 랜딩·대시보드 전체 페이지 공통 적용

**사이드바 텔레그램 채널 링크 추가 (`src/components/dashboard/sidebar.tsx`)**
- 네비게이션 하단, 사용자 섹션 위에 텔레그램 채널 링크 추가
- 알림 설정 항목 Pro 라벨 제거 (무료 공개 채널로 전환)

**랜딩 features.tsx 문구 수정**
- "기업의 중요한 변화, 15분 안에 확인" → "기업의 중요한 변화, 매일 확인"

**`/alerts` 페이지 재구성 (`src/app/(dashboard)/alerts/page.tsx`)**
- ProGate + 정적 mock UI 전면 제거
- 텔레그램 채널 안내 카드(상단), 알림 내용 안내 카드, 이메일 다이제스트 카드(Pro 배지) 3카드 구조

**텔레그램 일간 공시 알림 발송 로직 신규 구현**
- `src/lib/notify/telegram-digest.ts`: event_type 기반 주요 공시 필터 + 발송 후 notified_telegram=true 업데이트
- `src/app/api/collect/telegram-digest/route.ts`: API route (maxDuration 60)
- `vercel.json`: Cron 추가 `30 2 * * *` (02:30 UTC = 11:30 KST, classify-filings 02:00 이후)
- 대상 event_type: ceo_change, cfo_change, buyback, ma, guidance, contract, offering, dividend

**Supabase 마이그레이션**
- `filings` 테이블에 `notified_telegram boolean NOT NULL DEFAULT false` 컬럼 추가
- `pnpm gen:types` 재생성 및 `src/types/supabase.ts` 반영

**EPS 차트 실제값 표시 버그 수정 (`src/app/(dashboard)/stocks/[symbol]/page.tsx`)**
- 원인: earnings 쿼리에 날짜 필터 없어 미래 분기(actual_eps=null)가 최신 4건에 포함
  → estimatePts 4점(전체 폭) vs actualPts 3점(75% 폭)으로 실제값 라인이 짧게 끊김
- 해결: `.lte("report_date", today)` 추가 — 과거 발표 분기만 조회. nextEarnings 미래 쿼리는 별도 유지

---

## 2026-06-30 · 세션 64

### 랜딩 통계 섹션 / 대시보드 레이아웃 / 섹터 버그 수정

**랜딩 '매일 수집하고 정리합니다' 통계 항목 확장 (`src/app/page.tsx`)**
- 원인: `stats.tsx` 컴포넌트는 랜딩 페이지에 마운트되지 않음. `page.tsx` 내 인라인 STATS 배열이 독립적으로 4항목만 유지하고 있었음
- 해결: `page.tsx` 직접 수정 — 쿼리 4개→7개, STATS 7항목, grid `lg:grid-cols-7`
- 추가 항목: 경제지표(macro_indicators), 내부자 거래(insider_trades), 실적 발표(earnings)

**대시보드/뉴스 피드 레이아웃 재배치 (`dashboard/page.tsx`, `news/page.tsx`)**
- 최근 7일 트렌드 카드를 우측에서 좌측(도넛 하단)으로 이동, 섹터 차트 단독 우측 배치

**차트 기간 레이블 추가**
- `disclosure-type-chart.tsx`, `news-source-chart.tsx`: "최근 30일"
- `sector-activity-chart.tsx`, `news-sector-chart.tsx`: "최근 7일"

**좌우 컬럼 높이 동기화**
- `items-stretch` + `flex flex-col` 래퍼(h-full 없음) 패턴 적용
- `h-full` on grid children → CSS Grid 순환 참조 버그 확인, 제거

**섹터 이름 중복 버그 수정 (`src/lib/sectors.ts`)**
- 원인: Finnhub("Consumer Discretionary")와 FMP("Consumer Cyclical") 둘 다 DB에 기록되어 동일 한글 섹터가 2행으로 분리
- 해결: `normalizeSector()` 추가, dashboard/news page 및 sectors API에 적용

**수집 범위 확장**
- `runProfileCollect` 한도 50→200 (`src/lib/collect/profile.ts`)
- 섹터 백필 스크립트 신규 생성 (`scripts/backfill-sector.ts`, Finnhub 기반, npx tsx)

---

## 2026-06-29 · 세션 63

### 사이트 표기 불일치 수정

**랜딩 페이지 FEATURES 섹션 (`src/app/page.tsx`)**
- 와치리스트 `pro: true` → `pro: false` (실제 Free 기능)
- 섹터 히트맵 `pro: false` → `pro: true` (실제 Pro 기능, ProGate 적용 중)

**FAQ PlanBreakdown + 텍스트 (`src/components/landing/faq-accordion.tsx`)**
- Free 목록: 섹터 히트맵 제거, 실적 캘린더 추가
- Pro 목록: 와치리스트 제거, 섹터 히트맵·알림 설정 추가 ("Free의 모든 기능" 표현 통일)
- FAQ 설명 텍스트: 실제 플랜 구분에 맞게 수정

**마이페이지 데이터 출처 (`src/app/(dashboard)/mypage/page.tsx`)**
- 어닝콜 항목 추가: "기업 공식 실적 발표 컨퍼런스콜 기반 한국어 요약"
- FMP 항목 미표기 (중간 공급자, 공개 불필요)

**사이드바 그룹명**: 변경 없음 (사용자 요청으로 "인사이트"/"매크로" 유지)

**기준:** `billing-plans-client.tsx` 및 실제 ProGate 구현 상태

---

## 2026-06-29 · 세션 62

### 전체 페이지 전수조사 — 버그 4건 수정

**조사 대상:** /dashboard, /news, /earnings, /watchlist, /stocks/[symbol], /analysis, /calls, /insider, /sectors, /macro, /alerts, /billing, /mypage (13개)

**발견 및 수정:**

1. `news/page.tsx`: `searchParams: { page?: string }` → `Promise<{ page?: string }>` + `await searchParams` (다른 모든 페이지와 불일치)
2. `mypage/page.tsx` L197: `#555555` → `#a6a6a6` (CLAUDE.md: #666666 이하 금지)
3. `mypage/page.tsx`: CSV 다운로드가 헤더만 출력하던 버그 수정 — Supabase에서 실제 와치리스트 데이터 조회 후 생성, 로딩 상태 추가
4. `analysis/page.tsx`: `insider_trades` 쿼리 `.limit(200)` 누락 → 추가; `filings` 쿼리 `.limit(100)` 추가

**이상 없음:**
- `force-dynamic`: /news, /dashboard, /earnings, /watchlist, /stocks/[symbol], /analysis, /calls, /insider, /sectors, /macro, /billing 모두 설정됨
  - /alerts, /mypage 은 클라이언트 컴포넌트 기반이라 불필요
- 면책 문구 (`DashboardDisclaimer`): 전 페이지 포함 확인
- Pro 게이팅 (`ProGate`): /analysis, /calls, /insider, /sectors, /alerts 정상 적용
- PostgREST 1000행 제한: 피드 페이지 모두 `.range()` 페이지네이션 적용됨

---

## 2026-06-29 · 세션 61

### 기업동향 TOP30 자동 선정 + 텔레그램 발송 + 랜딩 TOP10

- `src/lib/collect/scoring.ts` 신규 — `computeScores(): Promise<ScoredTicker[]>` 공통 함수
  - 어드민 스코어링 로직 전면 분리 (Phase 1 병렬 쿼리 9개, Phase 2 주가 페이지네이션, 섹터 다양성 포함)
  - `ScoredTicker`, `ScoredMetadata`, `TAG_LABELS_KR` export
- `src/app/admin/page.tsx` 리팩토링
  - 스코어링 인라인 로직 제거, `computeScores()` import 사용으로 대폭 간소화
  - 표시용 `TAG_LABELS`, `tagStyle` 유지 (어드민 배지용 축약형)
- `src/lib/collect/top30.ts` 신규 — `runTop30Select()`
  - `computeScores()` 호출 → 상위 30개 → `top30_daily` upsert
- `src/lib/notify/telegram.ts` 신규 — `sendTelegramTop10()` + `runTelegramNotify()`
  - top30_daily 오늘 rank 1~10 조회 → 회사명 조회 → TAG_LABELS_KR 변환 → 텔레그램 발송
  - 면책 문구 포함
- `src/app/api/collect/top30/route.ts` 신규 — thin wrapper (maxDuration 300)
- `src/app/api/collect/telegram/route.ts` 신규 — thin wrapper (maxDuration 60)
- `src/components/landing-top10.tsx` 신규 — 서버 컴포넌트
  - top30_daily 오늘 rank 1~10 조회 → TAG_LABELS_KR 변환 → 랜딩 페이지 표시
  - 데이터 없으면 null 반환 (graceful fallback)
  - 면책 문구 포함, HSL 토큰 사용
- `src/app/page.tsx`: HERO 섹션 다음에 `<LandingTop10 />` 삽입
- COLLECT_JOBS에 "top30", "telegram" 추가
- COLLECT_MAP에 "top30": runTop30Select, "telegram": runTelegramNotify 추가
- vercel.json: "0 21 * * *" → /api/collect/top30, "10 21 * * *" → /api/collect/telegram 추가
- 트리거 페이지: "TOP30 선정", "텔레그램 발송" 버튼 + 크론 테이블 항목 추가

환경변수 추가 필요 (.env.local + Vercel):
- TELEGRAM_BOT_TOKEN=
- TELEGRAM_CHAT_ID=

---

## 2026-06-29 · 세션 60

### Price Target 수집 파이프라인

- `src/lib/collect/price-targets.ts` 신규 — `runPriceTargetsCollect()` 구현
  - FMP `/stable/price-target?symbol={ticker}` 호출 (AbortSignal.timeout 8초)
  - 와치리스트 + 최근 7일 공시 종목 합집합, 최대 30종목, 300ms 딜레이
  - 최근 90일 이내 데이터만 저장, `price_targets` upsert (onConflict: ticker, analyst_company, published_date)
  - 반환: `{ ok, total, updated, skipped, errors }`
- `src/lib/collect/types.ts`: COLLECT_JOBS에 "price-targets" 추가
- `src/lib/collect/index.ts`: `runPriceTargetsCollect` export 추가
- `src/app/api/collect/price-targets/route.ts` 신규 — thin wrapper (GET, requireCollectAuth, maxDuration 300)
- `src/app/api/admin/run/route.ts`: import + COLLECT_MAP에 "price-targets" 추가
- `vercel.json`: cron "55 1 * * 1" → /api/collect/price-targets (매주 월요일) 추가
- `src/app/admin/system/trigger/page.tsx`: "Price Target 수집 (FMP)" 트리거 버튼 + 크론 테이블 항목 추가
- `src/app/admin/page.tsx` Smart Money Score 개선:
  - Phase 1 병렬 쿼리에 `price_targets` 추가 (`(admin as any).from(...)`, 최근 30일)
  - `priceTargetsByTicker` Map 전처리 (ticker별 최신 2개 records, published_date DESC)
  - 최신 price_target > 직전 시: smartRaw +5, "target_up" 태그, meta.targetUp = true
  - ReasonTag에 "target_up" 추가 · TAG_LABELS: "목표가↑" · tagStyle: teal

---

## 2026-06-29 · 세션 59

### Short Interest 수집 파이프라인

- `src/lib/collect/short-interest.ts` 신규 — `runShortInterestCollect()` 구현
  - FMP `/stable/short-float?symbol={ticker}` 호출 (AbortSignal.timeout 8초)
  - 와치리스트 + 최근 7일 공시 종목 합집합, 최대 30종목, 300ms 딜레이
  - `short_interest` 테이블 upsert (onConflict: "ticker,collected_at")
  - 반환: `{ ok, total, updated, skipped, errors }`
- `src/lib/collect/types.ts`: COLLECT_JOBS에 "short-interest" 추가
- `src/lib/collect/index.ts`: `runShortInterestCollect` export 추가
- `src/app/api/collect/short-interest/route.ts` 신규 — thin wrapper (GET, requireCollectAuth, maxDuration 300)
- `src/app/api/admin/run/route.ts`: import + COLLECT_MAP에 "short-interest" 추가
- `vercel.json`: cron "50 1 * * 1" → /api/collect/short-interest (매주 월요일) 추가
- `src/app/admin/system/trigger/page.tsx`: "Short Interest 수집 (FMP)" 트리거 버튼 + 크론 테이블 항목 추가
- `src/app/admin/page.tsx` Smart Money Score 개선:
  - Phase 1 병렬 쿼리에 `short_interest` 추가 (`(admin as any).from(...)`)
  - `shortInterestByTicker` Map 전처리 (ticker별 최신 2개 records, collected_at DESC)
  - short_float 직전 대비 감소 시: smartRaw +4, "short_decrease" 태그, meta.shortDecrease = true
  - ReasonTag에 "short_decrease" 추가 · TAG_LABELS: "공매도↓" · tagStyle: cyan

---

## 2026-06-29 · 세션 58

### earnings_calls guidance_direction + management_tone 반영

- `src/lib/collect/calls.ts`:
  - `CallAnalysis` 인터페이스에 `management_tone?: "positive" | "neutral" | "negative"` 추가
  - Claude Sonnet 프롬프트 마지막 줄에 `{"guidance_direction":"...","management_tone":"..."}` JSON 출력 지시 추가
  - 응답 마지막 줄 JSON 파싱 로직 추가 (last-line extraction)
  - upsert payload에 `management_tone` 컬럼 추가
- `src/app/admin/page.tsx`:
  - `EarningsCallRow` 타입 선언 + `earningsCallsByTicker` Map 전처리 추가
  - 병렬 쿼리에 `earnings_calls` 추가 (`(admin as any).from(...)` 패턴)
  - `allCandidates`에 earningsCallsByTicker.keys() 포함
  - Earnings Score: guidance_direction="up" → +10 + "guidance_up" 태그, management_tone="positive" → +2

---

## 2026-06-29 · 세션 57

### filings.event_type 자동 분류 파이프라인

- `src/lib/collect/classify-filings.ts` 신규 — `runClassifyFilings()` 구현
  - event_type IS NULL인 8-K 공시 50건 조회
  - Claude Haiku로 11개 카테고리 분류 (ceo_change/buyback/ma/guidance/contract/dividend/offering/lawsuit/cfo_change/earnings/other)
  - 건당 200ms 딜레이, distribution 집계 + otherRate, other 40% 초과 시 warning
- `src/lib/collect/types.ts`: COLLECT_JOBS에 "classify-filings" 추가
- `src/lib/collect/index.ts`: `runClassifyFilings` export 추가
- `src/app/api/collect/classify-filings/route.ts` 신규 — thin wrapper (GET, requireCollectAuth)
- `src/app/api/admin/run/route.ts`: import + COLLECT_MAP에 classify-filings 추가
- `vercel.json`: cron "0 2 * * *" → /api/collect/classify-filings 추가
- `src/app/admin/system/trigger/page.tsx`:
  - "공시 이벤트 자동 분류 (Haiku)" 트리거 버튼 추가
  - TriggerResult에 `classified/otherRate/distribution/warning` 필드 추가
  - distribution 테이블 + warning 렌더링 추가
  - Cron 스케줄 안내 테이블에 항목 추가

---

## 2026-06-29 · 세션 56

### 어드민 기업동향 스코어링 엔진 전면 개편

- `src/app/admin/page.tsx`: `AdminWatchSection` 전면 재작성
- 4영역 가중치 스코어링: Event×0.4 + SmartMoney×0.3 + Earnings×0.2 + Market×0.1
- **쿼리**: filings(14일)·news(14일)·insider(7일)·institutional_holdings(2개분기)·earnings·stock_prices(30일)·tickers 병렬 조회
- **Decay**: 오늘1.0·1일전0.8·2일전0.6·3일전0.4·4일+0.2
- **Event Score**: event_type/form_type 가중치·decay·중복감산(1건100%·2건70%·3건+40%), 뉴스 중복제거+surge보너스
- **Smart Money**: 3일내 내부자취득+6(100만↑+3추가), 13F신규+5·기존증가+3
- **Earnings Score**: EPS+Revenue둘다+8·EPS만+5·Revenue만+4, 5일모멘텀+3
- **Market Score**: 30일수익률(20%+3·10%+2), 거래량급증+4, 변동성급증+2
- **섹터다양성**: 동일섹터 5개 초과 시 30% 감산 후 재정렬
- **reason_tags 18종**: 색상별 태그(보라·amber·초록·파랑·cyan)
- **metadata**: E/S/P/M 세부점수 카드 내 표시
- 기존 단순합산 스코어링(analyst_ratings 포함) 제거

---

## 2026-06-29 · 세션 55

### 어드민 기업 동향 (내부용) 섹션 시각적 구분

- `src/app/admin/page.tsx`: wrapper div 스타일 변경
  - `border-white/[0.08] bg-[#111111]` → `border-red-500/60 bg-red-500/[0.03] shadow-[0_0_20px_rgba(239,68,68,0.25)]`
  - 타이틀 `text-white` → `text-red-400`
- 작업 2(어드민 slice 30), 작업 3(와치리스트 slice 30)은 세션 53·54에서 기완료

---

## 2026-06-29 · 세션 54

### 와치리스트 TrendingCarousel 노출 종목 수 변경

- `src/app/(dashboard)/watchlist/page.tsx`: `top10` → `top30`, `.slice(0, 10)` → `.slice(0, 30)`
- 추가 조회(회사명·내부자거래·실적 일정) `.in("ticker", top30)` 일괄 반영
- 스코어링 로직·태그·카드 레이아웃 변경 없음

---

## 2026-06-29 · 세션 53

### 어드민 홈 기업 동향 노출 종목 수 변경

- `src/app/admin/page.tsx`: 기업 동향(내부용) 슬라이싱 `.slice(0, 10)` → `.slice(0, 30)`
- 스코어링 로직 및 태그 표시 변경 없음

---

## 2026-06-29 · 세션 52

### 규제 감사 — SnapshotAnalyst 제거, 내부자 표현 수정, 잔존 투자 등급 표현 점검

**SnapshotAnalyst 완전 제거**
- `src/components/dashboard/snapshot/snapshot-analyst.tsx` 파일 삭제
- `src/app/(dashboard)/stocks/[symbol]/page.tsx`
  - `SnapshotAnalyst` import 제거
  - `AnalystRow` 타입 import 제거
  - `analyst_ratings` 쿼리 제거 (Promise.all 8개 → 7개)
  - `analystRows` 변수 제거
  - `<SnapshotAnalyst>` 렌더링 제거

**내부자 표현 수정** (`src/app/(dashboard)/watchlist/page.tsx`)
- `"내부자 매수 N건 확인"` → `"내부자 취득 N건 확인"`
- `"내부자 매도 N건 확인"` → `"내부자 처분 N건 확인"`
- 주석도 동일하게 수정

**잔존 투자 등급 표현 점검 결과**

| 파일 | 내용 | 판단 |
|------|------|------|
| `src/app/admin/page.tsx:96,100,101,103` | `strong_buy`, `buy` 컬럼명 참조 + 어드민 활동 점수 계산 | **어드민 내부 로직** — 사용자 노출 없음, 수정 불필요 |
| `src/app/admin/page.tsx:380` | `"Strong Buy 5+개+8"` — 어드민 툴팁 설명 | **어드민 내부** — 사용자 노출 없음, 수정 불필요 |
| `src/lib/collect/calls.ts:103` | `"매수" 등 표현 절대 사용하지 않습니다` — 프롬프트 금지 지침 | **금지 지침 선언** — 정상 |

결론: 사용자 노출 화면에 투자 등급 표현 잔존 없음.

---

## 2026-06-29 · 세션 51

### 실적 캘린더 배당 탭 + 인사이더 기관 보유 현황 + 종목 주식 분할 타임라인 + 경제지표 그리드 수정

**변경 파일**
- `src/app/(dashboard)/earnings/page.tsx`
  - 상단 탭 추가: "실적 발표" / "배당 일정" (`?tab=earnings` 기본 / `?tab=dividends`)
  - `dividends` 테이블 연결: ex_date >= today, ASC, 25건 페이지네이션
  - 탭별 URL 파라미터 보존을 위해 `Pagination` 컴포넌트에 `prefix` 파라미터 추가
  - 수익률(%) 컬럼 포함, 현재는 "—" 표시 (주가 조회 없이는 계산 불가)
- `src/app/(dashboard)/insider/page.tsx`
  - `InstitutionalHoldings` 섹션 신규 추가 (Pro 전용, InsiderBoard 위에 배치)
  - `institutional_holdings` 최신 분기 파악 → 해당 분기 최대 2000행 조회 후 JS 집계
  - institution_name 기준 총 보유 금액 내림차순 상위 10개 표시
  - 보유 금액 포맷: T/B/M 단위 자동 변환
- `src/components/dashboard/snapshot/stock-splits.tsx`: 신규 생성
  - `stock_splits` 테이블 연결, split_date DESC 정렬
  - `numerator:denominator` 비율 표시, denominator > numerator 시 "역분할(Reverse Split)" 표기
  - 데이터 없으면 컴포넌트 null 반환 (섹션 미표시)
  - `stocks/[symbol]/page.tsx` 주가 차트(PriceCard) 바로 아래 배치
- `src/components/macro/macro-board.tsx`
  - 그리드 `sm:grid-cols-2 lg:grid-cols-3` → `md:grid-cols-2 w-full` (2열 고정)
  - 홀수 마지막 카드에 `md:col-span-2` 적용
- `src/components/macro/indicator-card.tsx`
  - 외부 div에 `h-full w-full` 추가 → 그리드 셀 전체 채움

---

## 2026-06-29 · 세션 50

### 종목 스냅샷 실 DB 데이터 연결

**변경 파일**
- `src/app/(dashboard)/stocks/[symbol]/page.tsx`
  - `stock_prices`: `.limit(30)` → `.gte("date", oneYearAgo)` (1년 일봉)
  - `insider_trades`: limit 5 → 10
  - `analyst_ratings` 쿼리 추가 (최근 3개 기간, period DESC)
  - `SnapshotAnalyst` 컴포넌트 추가 (CompanyInfo/SnapshotInsider 그리드 아래 배치)
- `src/components/dashboard/snapshot/price-card.tsx`: "최근 30일 종가 추이" → "1년 종가 추이"
- `src/components/dashboard/snapshot/snapshot-insider.tsx`: 설명·slice 5 → 10
- `src/components/dashboard/snapshot/snapshot-analyst.tsx`: 신규 생성
  - 최신 기간 바 차트 (Strong Buy/Buy/Hold/Sell/Strong Sell, maxCount 기준 정규화)
  - 최근 3개 기간 비교 테이블
  - 출처: Finnhub, 투자 의견 면책 문구 포함

---

## 2026-06-28 · 세션 49

### collect 함수 PostgREST 1000행 제한 우회 + 데이터 시딩 스크립트 정비

**문제**
`filings.ts`, `news.ts`, `earnings.ts`, `analyst.ts`, `prices.ts`의 tickers 전체 조회가
PostgREST 기본 1000행 제한에 걸려 전체 종목 처리 불가.

**해결**
`adminClient.from("tickers").select("ticker")` 단일 쿼리를 `.range(from, from+999)` 반복 루프로 교체.
`prices.ts`는 추가로 Yahoo Finance → FMP API(`historical-price-eod/full`)로 교체.

**변경 파일**
- `src/lib/collect/filings.ts`: tickerSet range 페이지네이션 + 6단계 console.log 추가
  - EDGAR hits 건수 / tickerSet 크기 / ticker 매칭 / insert 시도 / 저장 / 스킵
- `src/lib/collect/news.ts`: tickerSet range 페이지네이션
- `src/lib/collect/earnings.ts`: tickerSet(runEarningsCollect) + allTickers(runEarningsActualCollect) range 페이지네이션
- `src/lib/collect/analyst.ts`: allTickers range 페이지네이션
- `src/lib/collect/prices.ts`: allTickers range 페이지네이션 + Yahoo Finance → FMP API 교체

**신규 스크립트**

| 파일 | 설명 |
|------|------|
| `scripts/seed-tickers.ts` | SEC EDGAR에서 NASDAQ+NYSE 전체 종목 일괄 upsert |
| `scripts/seed-profiles.ts` | FMP API로 sector NULL 종목 일괄 업데이트 |
| `scripts/seed-prices.ts` | FMP `historical-price-eod/full`로 1년 일봉 일괄 수집 |
| `scripts/seed-earnings.ts` | Finnhub 실적 일정(날짜 범위 30일 청크) + 과거 4분기 actual_eps 전체 종목 수집 |
| `scripts/seed-analyst.ts` | Finnhub 애널리스트 추천 전체 종목 수집 (429 재시도 포함) |

**주요 버그 수정**
- `seed-prices.ts`: FMP stable API는 `{ symbol, historical: [] }` 아닌 배열 직접 반환 → `Array.isArray()` 분기로 처리
- `seed-earnings.ts`: 동일 청크 내 ticker+report_date 중복 → upsert 전 JS 중복 제거

**공통 패턴 (모든 스크립트)**
- `.env.local` 수동 파싱 (dotenv 미설치 환경)
- `range()` 1000행 페이지네이션으로 PostgREST 제한 우회
- 실행: `npx tsx scripts/{파일명}.ts`

---

## 2026-06-28 · 세션 48

### 랜딩 페이지 recent-changes.tsx 데이터 품질 개선

**변경 내용**
- 공시 우선순위 필터 강화: `getFormPriority()` 함수 추가
  - 0순위: 8-K + PRIORITY_EVENT_TYPES (CEO 교체 등)
  - 2순위: Form 4 내부자거래
  - 3순위: 10-K 연간보고서
  - 4순위: 10-Q 분기보고서
  - 5순위: 8-K (event_type 없는 것)
  - 10순위: S-1, DEF 14A 등 후순위 공시
- 뉴스 카드 추가: 공시 6건 미만 시 뉴스로 채움
  - `headline IS NOT NULL` 조건으로 제목 없는 뉴스 제외
  - headline 표시 (제목), summary_kr 있으면 함께 표시
- 카드 타입 분리: `CardItem = { kind: "filing" | "news"; data }` 유니온 타입

**수정 파일**
- `src/components/recent-changes.tsx`

---

## 2026-06-28 · 세션 47

### Google OAuth 로그인 버그 수정

**원인**
Supabase 대시보드에서 설정된 웰컴 이메일 트리거(`supabase_functions.http_request()`)가 신규 유저 가입 시 HTTP 요청에 실패 → 트리거 실패 → `auth.users` INSERT 전체 롤백 → "Database error saving new user" 에러 발생.

**해결**
Supabase SQL Editor에서 트리거 삭제:
```sql
DROP FUNCTION IF EXISTS supabase_functions.http_request() CASCADE;
```

**진단 과정**
- `no_code` 에러: OAuth callback URL에 `?code=` 파라미터 없음
- Google Console / Supabase Client ID·Secret / redirectTo URL 모두 정상 확인
- auth/callback route에 전체 쿼리 파라미터 로그 추가 후 `server_error:Database error saving new user` 에러 포착
- 트리거 문제로 원인 확정 → 삭제로 해결

**코드 변경**
- `src/app/auth/callback/route.ts`: 임시 디버그 로그 제거, 에러 시 `?error=` / `?error_description=` 파라미터 포착 유지
- `src/app/login/page.tsx`: 디버그 메시지 표시 제거

**남은 작업**
- 웰컴 이메일 기능 필요 시 Resend 연동 후 트리거 재설정

---

## 2026-06-27 · 세션 46

### 경제지표 페이지 전면 개편 (MacroBoard)

**신규 생성**
- `src/lib/macro.ts`: `MacroIndicator`·`MacroGroup` 타입, `SERIES_META` 정적 매핑(6개 지표), `GROUP_ORDER`, `formatMainValue()`·`formatPrevValue()` 포맷 헬퍼
- `src/components/macro/mini-line-chart.tsx`: SVG 스파크라인 (gradient fill, preserveAspectRatio="none")
- `src/components/macro/indicator-card.tsx`: 서버 컴포넌트 — nameEn + name 병기, 변화방향 ▲▼ 중립 회색, 이전값 + 발표일 하단 표시
- `src/components/macro/macro-board.tsx`: 클라이언트 컴포넌트 — 그룹 탭(전체/금리/물가/고용/경기) 클라이언트 필터링

**교체**
- `src/app/(dashboard)/macro/page.tsx`: 서버 컴포넌트로 전면 재작성
  - `macro_indicators` 전체 200행 조회 → `indicator_name` 기준 그룹핑
  - 복수 행 → 오름차순 정렬 후 히스토리 배열 구성 (스파크라인용)
  - 최신 `released_at` → 기준일 표시
  - `export const dynamic = "force-dynamic"` 유지

**구조 결정**
- `SERIES_META`는 DB의 `indicator_name` 값("기준금리", "CPI" 등)을 키로 사용
- history는 최대 13행(최신 → 반전하여 오름차순) 구성
- 변화 방향 색상 사용 금지 — 중립 회색(`#666666`)만 표시

---

## 2026-06-27 · 세션 45

### 섹터 히트맵 페이지 전면 개편

**신규 생성**
- `src/lib/sectors.ts`: `SectorStat`·`SectorPeriod` 타입, `SECTOR_COLORS`·`SECTOR_KR`·`SECTOR_KEYWORDS`·`PERIOD_LABELS` 상수, `hexToRgba()` 헬퍼
- `src/app/api/sectors/route.ts`: 기간(7d/30d/90d) 파라미터 받아 tickers·filings·news 집계 후 `SectorStat[]` 반환 API
- `src/components/sectors/sector-treemap.tsx`: SVG squarified 트리맵 (lib/sectors에서 색상·타입 import)
- `src/components/sectors/sectors-board.tsx`: 전체 보드 레이아웃 (client component)
  - 기간 세그먼트(7/30/90일) + 색상 범례
  - Top 3 섹터 카드 (activityScore 비례 배경 바)
  - 트리맵 패널 (SectorTreemap)
  - 요약 테이블 (인라인 게이지 바 + IconInfoCircle hover 툴팁)
  - 섹터별 키워드 카드 그리드 (sm:2 / lg:3)
  - 마지막 업데이트 KST 타임스탬프

**교체**
- `src/app/(dashboard)/sectors/page.tsx`: SectorsBoard + DashboardDisclaimer만 렌더링
  - `export const dynamic = "force-dynamic"` 포함
  - ProGate 제거 (실 데이터 페이지로 전환)
- `src/components/dashboard/sector-treemap.tsx`: `sectors/sector-treemap.tsx`로 re-export

**구조 결정**
- 기간 변경 시 `/api/sectors?period=7d|30d|90d` 클라이언트 재조회
- SECTOR_KR 매핑: 기존 값 유지 ("경기소비재", "커뮤니케이션")

---

## 2026-06-27 · 세션 44

### 어닝콜 카드 UI 개선 (날짜·회사명·링크)

**날짜 표시**
- 상대시간("오늘", "3일 전") → 실제 발표일 날짜("2026.06.27") 표시
- `call_date` 컬럼을 SELECT 쿼리에 추가, FMP transcript 실제 날짜 사용
- `relativeTime()` 함수 및 `EarningsCall.relative_time` 필드 제거

**회사명 정제**
- `cleanCompanyName()` 함수 추가 (page.tsx)
  - SEC 법인 state code 제거: ` /MO/`, ` /DE/` 등 패턴 제거
  - 전각대문자(ALL CAPS) → title case 변환
  - 예: "CHARTER COMMUNICATIONS, INC. /MO/" → "Charter Communications, Inc."
  - `name_kr`이 있으면 그대로 사용, `name_en`만 정제 대상

**링크 버튼**
- SEC 원문: ticker 기반 SEC EDGAR URL로 항상 표시 (모든 카드)
- Transcript: DB `transcript_url` 컬럼 직접 쿼리로 안정화
  - 기존: `key_points.transcript_url` (항상 빈 값) → DB 컬럼 직접 참조

---

## 2026-06-27 · 세션 43

### 어닝콜 수집 Cron 스케줄 변경

- `vercel.json`: `/api/collect/calls` 스케줄 `0 2 * * *` → `22 2 * * *` (02:22 UTC, 11:22 KST)
  - 이유: Vercel Cron 정각(00분) 혼잡 회피
- `src/app/admin/system/trigger/page.tsx`: 표시 텍스트 "매일 02:00 UTC" → "매일 02:22 UTC (11:22 KST)"

---

## 2026-06-27 · 세션 42

### 어닝콜 수집 로그 전면 강화 + 에러 집계 버그 수정

- `src/lib/collect/calls.ts` 개선
  - **버그 수정:** `errors: totalSkipped` → `errors: totalErrors` (스킵 != 에러)
  - 각 단계별 `console.log` 추가 (Vercel 함수 로그에서 원인 확인 가능)
    - ① dates URL·HTTP status·body(200자) 출력
    - ② DB 중복 체크 결과 출력
    - ③ transcript URL·HTTP status·body(200자)·content 길이 출력
    - ④ Sonnet HTTP status·body·JSON parse 성공 여부 출력
    - ⑥ upsert payload·error.message·error.code 출력
  - 종목별 `detail` 문자열 수집 → `debug: tickerResults` 로 반환
    - 트리거 페이지에서 JSON 블록으로 종목별 실패 원인 확인 가능
    - 예: `{ "AAPL": "transcript 날짜 없음 (빈 배열)", "NVDA": "이미 존재 (Q2 FY2026)" }`
  - `analyzeWithSonnet` → `{ analysis, detail }` 반환으로 에러 메시지 전파
  - `fetchTranscriptDates` / `fetchTranscript` → 내부에서 직접 fetch+text() 처리 (에러 삼킴 제거)

---

## 2026-06-27 · 세션 41

### 내부자 거래 수집 Finnhub 복원 + 어닝콜 수집 필드명 버그 수정

**내부자 거래 Finnhub 복원**
- FMP insider-trading 엔드포인트 테스트 결과: FMP Ultimate 플랜에도 미포함 (403 Forbidden)
- 라이선스 제약으로 FMP 사용 불가 → Finnhub으로 복원 (추가 비용 없음)
- 데이터 공급원 역할 분리 확정:
  - SEC → 공시 원문
  - Finnhub → 뉴스, 실적 캘린더, 내부자 거래
  - FMP Ultimate → 어닝콜 Transcript
  - Claude Sonnet → 구조화 요약
- `src/lib/collect/insider.ts`: Finnhub `insider-transactions` 엔드포인트 복원
  - 수집 대상: 와치리스트 + 최근 7일 공시 종목 (최대 10개)
  - 필터: P(매수)/S(매도), isDerivative=false
- 트리거 페이지 레이블 복원: "(FMP)" → "(Finnhub)"

**어닝콜 수집 FMP 응답 필드명 버그 수정**
- `src/lib/collect/calls.ts`
  - `FmpTranscriptDate.year` → `FmpTranscriptDate.fiscalYear` (실제 API 응답 필드명)
  - `FmpTranscript.quarter: number` → `FmpTranscript.period: string` (실제 API 필드명)
  - `latest.year` → `latest.fiscalYear`
  - **원인:** API가 `fiscalYear` 반환하는데 코드가 `year`로 읽어 `undefined` → transcript URL `&year=undefined` 전달
  - **검증:** AAPL Q2 FY2026, 51,251자 transcript 정상 수신 확인

---

## 2026-06-27 · 세션 40

### 내부자 거래 수집 404 에러 수정

- `src/lib/collect/insider.ts` URL에서 `&limit=20` 제거
  - **원인:** FMP stable API는 `limit` 쿼리 파라미터 미지원 → HTTP 404 반환
  - **증상:** 저장 0건, 스킵 50건, 에러 50건 (HTTP 404)
  - **수정:** `insider-trading?symbol={ticker}&limit=20&apikey=` → `insider-trading?symbol={ticker}&apikey=`
- `src/lib/collect/calls.ts` URL 확인 → spec과 일치, 수정 불필요
- 빌드: ✓ Compiled successfully

---

## 2026-06-27 · 세션 39

### 내부자 거래 페이지 전면 재구현 + 수집 파이프라인 FMP 전환

- `src/lib/collect/insider.ts` 전면 재작성
  - Finnhub → FMP `/stable/insider-trading?symbol={ticker}&limit=20`
  - 수집 대상: watchlist + 최근 7일 공시 종목 → tickers 테이블 전체 (알파벳 순, 최대 50개)
  - 필터: P-Purchase / S-Sale 만 수집, price > 0 건만 (파생상품·옵션 제외)
  - 중복: 기존 UNIQUE 제약 23505 에러 skip 방식 유지
  - 200ms 딜레이
- `src/components/dashboard/insider-board.tsx` 신규
  - "use client", useMemo, useState
  - 필터: 거래 유형(전체/매수/매도), 기간(7/30/90일), 내 종목만 토글, 금액($100K+/$1M+)
  - 정렬: 최신순(기본) / 금액순
  - PAGE_SIZE = 20, 클라이언트 사이드 페이지네이션
  - 카드: 티커(amber 배지), 거래 유형(emerald/red 배지), 임원명/직책, 거래 수치 3열, SEC EDGAR 링크
  - sticky 필터 바, 건수 표시, 빈 상태, 데이터 소스 카드
- `src/app/(dashboard)/insider/page.tsx` 전면 재작성
  - async 서버 컴포넌트, force-dynamic
  - isPro 서버사이드 체크 → Pro일 때만 데이터 조회 (최근 90일, 최대 500건)
  - insider_trades + tickers join (name_kr) + watchlist join (in_watchlist)
  - ProGate 유지 (children = InsiderBoard)
  - transaction_value: value 컬럼 사용 (= shares * price)
- `src/app/admin/system/trigger/page.tsx` 레이블 "Finnhub" → "FMP"
- 빌드: ✓ Compiled successfully

---

## 2026-06-27 · 세션 38

### 어닝콜 수집 파이프라인 FMP 전환

- `src/lib/collect/calls.ts` 전면 재작성: Finnhub transcript → FMP transcript API
- FMP API Base URL: `https://financialmodelingprep.com/stable`
- 환경변수: `FMP_API_KEY` (신규), `FINNHUB_API_KEY`는 EPS·매출 보완용으로 optional 유지
- 수집 흐름
  - `/earning-call-transcript-dates?symbol={ticker}` → 가장 최근 quarter/year 선택
  - `earnings_calls` 테이블에 ticker+quarter 이미 존재하면 skip (중복 방지)
  - `/earning-call-transcript?symbol={ticker}&year={year}&quarter={quarter}` → content 조회
  - Claude Sonnet 구조화 분석 (headline, guidance, keywords, key_statements, qa_pairs 등)
  - Finnhub `/stock/earnings` 로 EPS·매출 보완 (optional — FINNHUB_API_KEY 없어도 동작)
  - surprise_percent = (actual - estimate) / |estimate| × 100 직접 계산
  - call_date: FMP 실제 날짜 사용
  - upsert onConflict: ticker,quarter
- `src/app/admin/system/trigger/page.tsx` 레이블 "Finnhub + Sonnet" → "FMP + Sonnet"
- 빌드: ✓ Compiled successfully

### 수집 전 Supabase SQL 실행 필요 (미완료)

earnings_calls 테이블에 아래 컬럼이 없으면 추가 필요:
```sql
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS quarter text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS call_date date;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS guidance_direction text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS guidance_previous text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS guidance_summary text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS headline_summary text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS revenue_actual text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS revenue_estimate text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS eps_actual text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS eps_estimate text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS surprise_percent numeric;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS keywords text[];
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS key_statements jsonb;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS qa_pairs jsonb;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS keyword_changes jsonb;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS tone_previous text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS tone_current text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS has_earnings_release boolean DEFAULT false;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS transcript_url text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS summary_generated_at timestamptz DEFAULT now();
ALTER TABLE earnings_calls ADD CONSTRAINT earnings_calls_ticker_quarter_key UNIQUE (ticker, quarter);
```
SQL 실행 후 `pnpm gen:types` 재생성, supabase.ts 첫 줄 `export type Json =` 확인 필수.

---

## 2026-06-24 · 세션 1

### 프로젝트 초기 셋업
- Next.js 16 (App Router, src/ 구조) + TypeScript + Tailwind CSS v4 + shadcn/ui 초기화
- pnpm / @tabler/icons-react (stroke=1.5) / Inter 폰트
- GitHub 연결: nudgefilm/ticker-flow (main 브랜치)
- Vercel 배포 + tickerflow.net 도메인 연결
- globals.css: HSL 토큰 + .no-scrollbar + animate-fade-in

### Supabase 설정
- profiles 테이블 생성: id (uuid, FK auth.users), email, plan (default 'free'), created_at
- RLS 정책 활성화
- `GRANT SELECT, UPDATE ON profiles TO authenticated;` 수동 실행
  - **원인:** SQL Editor로 만든 테이블은 authenticated role에 자동 grant 안 됨
  - **증상:** 403 에러 (RLS 정책만으로는 부족)

### OAuth / 인증
- Google OAuth PKCE 흐름: src/app/auth/callback/route.ts
- **버그:** redirectTo에 `NEXT_PUBLIC_SITE_URL` 사용 시 Vercel 빌드에서 undefined
- **해결:** `window.location.origin` 으로 교체 (런타임에 항상 정확한 origin 반환)

### 랜딩 페이지
- src/app/page.tsx 조립 완료
- navbar.tsx: 스크롤 감지 (scrollY > 8), bg-background/80 backdrop-blur
- hero.tsx: H1 + CTA + 샘플 카드 2장
- recent-changes.tsx, comparison.tsx, features.tsx, stats.tsx, footer.tsx
- login-modal.tsx: overlay `bg-black/40 backdrop-blur-sm` (자체 blur 처리, 외부 의존 없음)
- scroll-to-top.tsx: ⬆️ 이모지 → IconArrowUp (tabler 계열 통일)

### 대시보드 레이아웃
- src/components/dashboard/sidebar.tsx 초기 구현
  - 사이드바 메뉴 그룹: 내 종목 / 모니터링 / 인사이트 / 매크로 / 설정
- src/components/dashboard/dashboard-header.tsx

### 완료된 대시보드 페이지 (세션 1)
- /dashboard — 공시 피드
- /news — 뉴스 피드
- /earnings — 실적 캘린더
- /watchlist — 와치리스트
  - 홀수 카드 문제 수정: 마지막 카드 `md:col-span-2` 자동 처리
- /stocks, /stocks/[symbol] — 종목 스냅샷
- /macro — 경제지표
- /billing — 요금제
- /analysis, /calls, /insider, /sectors, /alerts — Pro 페이지 레이아웃 초안

### Admin 패널
- src/middleware.ts: ADMIN_EMAIL 환경변수로 /admin 접근 제어
- src/app/api/is-admin/route.ts: 서버사이드 어드민 체크 (클라이언트 미노출)
- footer © 클릭 → /api/is-admin 확인 후 어드민만 /admin 이동, 일반 유저 무반응
- 완료 페이지 13개:
  - /admin (KPI 대시보드: 유저수, 전환율, 방문자, 매출)
  - /admin/users, /admin/users/subscriptions, /admin/users/pro-grant
  - /admin/data/filings, /admin/data/news, /admin/data/translation, /admin/data/api
  - /admin/ops/filings, /admin/ops/notices, /admin/ops/reports
  - /admin/system/costs, /admin/system/env, /admin/system/trigger

### Navbar 프로필 드롭다운
- 로그인 상태: 이메일 이니셜 아바타 + hover 드롭다운 (MY PAGE / LOG OUT)
- hover 동작: 150ms timer (기존 메인 메뉴와 동일 방식)
- 로그아웃: supabase.auth.signOut() + router.push('/')

### useProfile 훅
- src/lib/hooks/use-profile.ts
- **버그:** 모듈 레벨 캐시 사용 시 로그아웃 후 재로그인해도 이전 plan 반환
- **해결:** 캐시 완전 제거, 컴포넌트 레벨 useState만 사용
- sidebar.tsx / dashboard-header.tsx useProfile 연동 (plan, email, initial)

### cursor-pointer 전역 적용
- globals.css `@layer base { button { cursor: pointer; } }`

---

## 2026-06-24 · 세션 2

### Pro 기능 게이팅 완성
- src/components/dashboard/pro-gate.tsx 전면 재작성
  - "use client" + useProfile() 로 plan 실시간 확인
  - Free → 잠금 UI (자물쇠 아이콘 + Pro 시작하기 → /billing)
  - Pro → children 그대로 렌더
  - **문제:** icon prop을 `ComponentType`으로 받으면 Server Component → Client Component 경계에서 RSC 직렬화 에러
    ```
    "Functions cannot be passed directly to Client Components"
    ```
  - **해결:** `iconName: "lock" | "user" | "microphone" | "flame" | "bell"` string으로 받고 내부 ICON_MAP으로 resolve
- 적용 완료: /analysis, /calls, /insider, /sectors, /alerts

### Pro Preview 컴포넌트 blur 제거
- Pro 유저가 ProGate children 볼 때 blur 없이 선명하게 표시해야 함
- analysis / calls / insider / sectors / alerts preview에서 제거:
  - `blur-sm`, `select-none`, `aria-hidden="true"`, 래퍼 `pointer-events-none`
- alerts-preview만 예외: 카드 레벨 `pointer-events-none` 유지 (mock 토글/체크박스 클릭 방지)

### 금융 규제 준수 감사 — 대시보드 (CLAUDE.md 6항)

| 파일 | Before | After |
|------|--------|-------|
| calls-preview | 전분기 대비 톤: 낙관적 → 매우 낙관적 | 전분기 대비 발언 변화: 성장 기조 유지 → 공급 확대 중심 강조 |
| calls-preview | 수요 강세를 근거로 | 수요 확대를 근거로 |
| sectors-preview | 이번 주 강세 섹터 | 이번 주 뉴스 활발 섹터 |
| sectors-preview | 약세 분위기 | 뉴스 감소 섹터 |
| sectors-preview | 범례: 긍정 / 부정 | 범례: 뉴스 증가 / 뉴스 감소 |
| earnings/page | EPS 예상 / 매출 예상 | 시장 예상 EPS / 시장 예상 매출 |
| billing-plan-card | 추천 (배지) | 인기 |

### 금융 규제 준수 감사 — 랜딩

| 파일 | Before | After |
|------|--------|-------|
| features.tsx | EPS 컨센서스 | 시장 예상 EPS |

### 로고 이미지 제거
- logo.tsx: `<Image>` 제거 → "TickerFlow" 텍스트 전용
- navbar.tsx, footer.tsx: `text-foreground` (HSL 토큰, 랜딩 규칙)
- sidebar.tsx: `text-white` (HEX, 대시보드 규칙)

### CLAUDE.md 업데이트
- 10항 작업 규칙에 13, 14번 추가
  - import 수정 시 기존 목록 확인 후 추가만 (삭제 금지)
  - str_replace로 import 블록 전체 교체 금지
- 14항 신규: 매 세션 후 WORKLOG.md 업데이트 규칙

---

## 2026-06-24 · 세션 3

### 마이페이지(/mypage) 구현
- 7개 섹션 완료:
  - 계정 정보: 이메일, 가입일 (supabase.auth.getUser().created_at)
  - 구독 플랜: Free → 업그레이드 CTA, Pro → 결제 정보 placeholder + 해지 문의 링크
  - 알림 설정: Pro → /alerts 링크, Free → 잠금 + Pro 시작하기
  - 데이터 내보내기: 와치리스트 CSV 다운로드 (BOM 포함 UTF-8)
  - 결제 내역: Polar.sh 연동 전 placeholder (아이콘 + 안내 문구)
  - 문의/피드백: 2열 카드 (문의하기 / 피드백, mailto 링크)
  - 계정 관리: 로그아웃, 회원 탈퇴 (확인 모달 포함)
- 회원 탈퇴 모달: bg-black/40 backdrop-blur-sm, 지정 경고 문구, 처리 중 상태
- /api/delete-account: Supabase Admin API (SUPABASE_SERVICE_ROLE_KEY 필요 — .env.local에 추가 필요)

### 이메일 일괄 변경
- contact@tickerflow.net → support@tickerflow.net
- 변경 파일: footer.tsx, terms/page.tsx, privacy/page.tsx

---

## 2026-06-24 · 세션 4

### 버그 수정: 랜딩 navbar 로그아웃 미작동
- **증상:** 헤더 프로필 드롭다운에서 LOG OUT 클릭 시 로그아웃이 되지 않음
- **원인:** `router.push("/")` 는 이미 `/` 에 있을 때 같은 경로 이동이라 Next.js가 re-render 스킵 → `userInitial` state가 그대로 남아 로그인 상태처럼 보임
- **해결:** `window.location.href = "/"` 로 교체 → 하드 리로드로 모든 React state 초기화 + 서버에서 세션 없이 새로 렌더

### 버그 수정: /mypage 사이드바 미표시
- **증상:** `/mypage` 접속 시 사이드바 없이 본문만 전체 화면으로 표시
- **원인:** 이 프로젝트는 각 대시보드 페이지마다 개별 `layout.tsx`로 사이드바를 주입하는 구조인데, `src/app/mypage/layout.tsx` 가 누락됨
- **해결:** 다른 페이지(news, earnings 등)와 동일한 패턴으로 `layout.tsx` 생성

---

## 2026-06-25 · 세션 5

### 레이아웃 구조 리팩토링: 개별 layout.tsx → 공통 Route Group 레이아웃

- **이전 구조:** 각 대시보드 페이지(news, earnings, macro, watchlist, analysis, calls, insider, sectors, alerts, billing, mypage, stocks/[symbol])가 개별 `layout.tsx`로 Sidebar를 주입
- **변경 구조:** Next.js Route Group `(dashboard)` 사용
  - `src/app/(dashboard)/layout.tsx` — 사이드바 공통 레이아웃 1개만 유지
  - 전체 대시보드 라우트를 `(dashboard)/` 하위로 이동
  - Route Group은 URL에 영향 없음 (기존 `/dashboard`, `/news`, `/stocks` 등 URL 유지)
- **삭제된 개별 layout.tsx:** dashboard, news, earnings, macro, watchlist, analysis, calls, insider, sectors, alerts, billing, mypage, stocks/[symbol] — 총 13개
- **이점:** 사이드바 레이아웃 변경 시 1개 파일만 수정하면 됨

---

## 2026-06-25 · 세션 6

### 금융 용어 설명 추가 (툴팁 + 괄호 표기)

**filing-filter-bar.tsx** — 공시 필터 탭에 hover 툴팁 추가
- 8-K: "주요 경영 이벤트 공시 — CEO 교체, M&A, 계약 등"
- 10-K: "연간 실적 보고서 — 매년 1회 제출"
- 10-Q: "분기 실적 보고서 — 분기별 3회 제출"
- Form 4: "내부자 거래 공시 — 임원·대주주 매수/매도"
- CSS-only 툴팁 (group-hover/tab 패턴, 외부 의존 없음)

**alerts-preview.tsx** — Checkbox 컴포넌트에 `desc` prop 추가
- 각 공시 유형 아래에 한 줄 설명 표기

**earnings/page.tsx** — 기존 안내 박스에 용어 범례 추가
- EPS (주당순이익), BMO (개장 전 발표), AMC (장 마감 후 발표)

**insider/page.tsx**
- 헤더 "인사이더" → "내부자 거래"로 변경
- 서브타이틀 추가: 내부자(인사이더) 정의 (임원, 이사, 10% 이상 대주주)

**calls/page.tsx**
- 서브타이틀 추가: 어닝콜(실적 발표 컨퍼런스콜) 설명

**dashboard/page.tsx**
- "Form 4 인사이더" 배지 → "Form 4 내부자 거래"로 변경

**supabase/schema.sql**
- alerts.alert_type CHECK 제약 추가: `('8k', '10k', '10q', 'form4', 'other')`

---

## 2026-06-25 · 세션 7

### 데이터 수집 파이프라인 구현

**신규 파일**
- `src/lib/supabase/admin.ts` — service_role 어드민 클라이언트 팩토리
- `src/lib/collect/auth.ts` — Vercel Cron(CRON_SECRET 헤더) 또는 어드민 세션 검증
- `src/app/api/collect/filings/route.ts` — SEC EDGAR 공시 수집
- `src/app/api/collect/news/route.ts` — Finnhub 뉴스 수집
- `src/app/api/collect/earnings/route.ts` — Finnhub 실적 캘린더 수집
- `src/app/api/collect/macro/route.ts` — Finnhub 경제지표 수집
- `src/app/api/collect/insider/route.ts` — Finnhub 내부자 거래 수집 (ticker별 또는 전체)
- `vercel.json` — Vercel Cron 스케줄 (공시/뉴스 매시간, 실적/경제지표 매일 00:00 UTC)

**업데이트**
- `src/app/admin/system/trigger/page.tsx` — mock setTimeout → 실제 API 호출, 결과(inserted/skipped) 표시
- `supabase/schema.sql` — insider_trades에 UNIQUE(ticker, name, transaction_date, shares, transaction_type) 추가

**설계 결정**
- SEC EDGAR: `company_tickers_exchange.json`으로 CIK→ticker 매핑, 신규 티커 자동 upsert
- earnings/filings: 신규 ticker 자동 upsert (chicken-and-egg 방지)
- news: ticker nullable — DB에 없는 ticker는 null로 저장 (FK 위반 방지)
- insider: P→buy, S→sell, 나머지 및 파생상품 제외, 티커당 200ms 딜레이
- Cron 자동: filings/news/earnings/macro. 내부자 거래는 수동 트리거만

**필요한 Vercel 환경변수 (미설정 시 추가 필요)**
- `CRON_SECRET` — Vercel Cron 인가 시크릿 (임의 문자열, Vercel 프로젝트 설정과 동일 값)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase 어드민 INSERT용 (이미 사용 중)
- `FINNHUB_API_KEY` — Finnhub API 키 (이미 Vercel에 등록됨)

---

---

## 2026-06-25 · 세션 8

### 번역 파이프라인 구현 및 개선

**신규 파일**
- `src/lib/collect/summarize.ts` — 번역/요약 배치 로직
  - `buildFilingSummary(ticker, companyName, formType)` — 코드 생성 결정적 한국어 요약 (Haiku 미사용)
  - `FORM_TYPE_INFO` 매핑 (8-K, 10-K, 10-Q, Form 4, S-1, DEF 14A)
  - `subjectParticle()` — 이/가 조사 선택 (유니코드 종성 판별)
  - 뉴스 요약: Claude Haiku 사용, 100자 이내, plain text, 사실 서술체
  - Priority 로직: watchlist 종목 우선 (최대 `limit`건), 나머지 순차 처리
- `src/app/api/translate/route.ts` — 번역 엔드포인트
  - watchlist에서 distinct ticker → priorityTickers 추출
  - 공시/뉴스 배치 번역 (각 최대 20건)

**vercel.json 번역 Cron 3개 추가**
- `7 * * * *`, `27 * * * *`, `47 * * * *` → `/api/translate`

**번역 프롬프트 개선 이력**
- 분량 제한 추가: 뉴스 100자 이내
- 마크다운 기호 금지 (# ** - 등)
- Haiku 거절 방지: 프롬프트 완화 (금지표현 → 중립 서술 지시)
- [원칙] 블록 추가: 사실만 서술, 분석/의견/전망 금지, '~했습니다' 사실 서술체
- 공시 요약: Haiku 완전 제거 → 코드 생성 결정적 문자열 (거절 원천 차단)

**CLAUDE.md 업데이트**
- 번역 프롬프트 운영 원칙 섹션 추가

### 공시 피드(/dashboard) 실 데이터 연동

- `force-dynamic` export 추가
- `FilingFeedList` async 서버 컴포넌트: filings 테이블에서 최신순 50건 조회, 페이지네이션
- 2열 그리드: `grid grid-cols-1 md:grid-cols-2 gap-4`, 홀수 마지막 카드 `col-span-2`
- `FeedPagination` — Link 기반, `?page=N` 쿼리 파라미터, Suspense 내부 렌더

**신규 컴포넌트**
- `src/components/dashboard/feed-pagination.tsx` — 서버 컴포넌트, Link href 기반 페이지네이션

### 뉴스 피드(/news) 실 데이터 연동

- 동일 패턴: `NewsFeedList` async 컴포넌트, 50건 페이지네이션, 2열 그리드

### 실적 캘린더(/earnings) 실 데이터 연동

- `EarningsList` async 컴포넌트: 오늘 이후 30일, report_date 오름차순
- `DbEarning` 타입: `tickers: { name_kr: string | null; name_en: string | null } | null`
- `as unknown as DbEarning[]` 캐스트 (Supabase 조인 타입 추론 불일치 우회)
- TypeScript 빌드 에러 수정: `name_en: string | null`로 확장 + `as unknown as` 이중 캐스트

### 와치리스트(/watchlist) 실 데이터 연동

**신규 파일**
- `src/app/api/watchlist/route.ts` — POST: 종목 추가 (tickers 테이블 검증 후 insert, 중복 409)
- `src/app/api/watchlist/[ticker]/route.ts` — DELETE: 종목 삭제 (user_id + ticker 필터)
- `src/components/dashboard/watchlist-client.tsx` — 클라이언트 컴포넌트
  - useState: deletingTicker, showAddInput, addInput, addError, adding
  - 추가/삭제 후 `router.refresh()`로 서버 컴포넌트 재실행
  - 종목 추가 인라인 입력 폼, 에러 표시
  - Free 5종목 한도 표시 (N / 5 종목)
  - 최근 7일 변화 요약 (공시 건수, 뉴스 건수, 실적 임박 건수)

**수정 파일**
- `src/components/dashboard/watchlist-card.tsx`
  - `WatchlistStock` 인터페이스: `price`, `change`, `changeUp` 제거 / `newFilings: number`, `newNews: number` (string → number)
  - `onDelete: () => void`, `isDeleting?: boolean` 추가
  - "use client" 추가 (삭제 버튼 onClick 처리)
  - `IconLoader2` 스피너로 삭제 중 상태 표시
- `src/app/(dashboard)/watchlist/page.tsx`
  - `export const dynamic = "force-dynamic"`, `Suspense + WatchlistSkeleton`
  - `WatchlistContent` async 서버 컴포넌트: watchlist + tickers 조인 + 병렬 조회
    - filings 최근 7일 카운트 (ticker별 집계)
    - news 최근 7일 카운트 (ticker별 집계)
    - earnings 다음 발표일 조회 → `D-N` / `오늘` / `—` 포맷
  - 3개 쿼리 `Promise.all()` 병렬 실행

---

---

## 2026-06-25 · 세션 9

### 버그 수정: Next.js 15 동적 라우트 params

- **증상:** `DELETE /api/watchlist/[ticker]` TypeScript 빌드 에러
- **원인:** Next.js 15에서 동적 라우트 핸들러의 `params`가 `Promise<{ ticker: string }>` 타입으로 변경
- **해결:** context 타입을 `{ params: Promise<{ ticker: string }> }`로 수정, `await params`로 추출

### 와치리스트 Pro 플랜 배너 조건부 표시

- `WatchlistContent`에서 `profiles.plan` 조회를 watchlist 조회와 `Promise.all()` 병렬 실행
- `isPro` prop을 `WatchlistClient`로 전달
- Pro 유저: 업그레이드 배너 숨김, 종목 수 제한 없음(`atLimit` 조건 제외), 정보 바 `"N종목"` 표시
- Free 유저: 기존 동작 유지 (`N / 5 종목`, 배너 노출)

### 사이드바 종목 검색창 실 데이터 연동

**신규 파일**
- `src/components/dashboard/ticker-search.tsx` — 클라이언트 컴포넌트
  - 검색어 입력 시 200ms debounce → Supabase `tickers` 테이블 조회
  - `ticker.ilike.Q%` (prefix) + `name_en/name_kr.ilike.%Q%` (substring) OR 필터
  - 최대 10건, ticker 알파벳 순 정렬
  - 결과 클릭 시 `/stocks/[ticker]` 이동, 검색어 초기화
  - ESC / 바깥 클릭 시 드롭다운 닫힘
  - 로딩 중 `IconLoader2` 스피너 표시

**수정 파일**
- `src/components/dashboard/sidebar.tsx` — 정적 `<input>` → `<TickerSearch />` 교체

**변경 이력**
- 초기 구현: 결과 클릭 → 와치리스트 추가 (+ 버튼)
- 수정: 결과 클릭 → `/stocks/[ticker]` 페이지 이동으로 변경, + 버튼 제거

### 와치리스트 종목별 통계 쿼리 개선

- **증상:** 공시/뉴스 건수가 모두 "없음"으로 표시
- **원인:** 단일 `.in("ticker", tickers)` 배치 쿼리 사용 → 쿼리 에러 시 `data: null` → `[]` 처리되어 조용히 0 반환
- **해결:** 종목별 개별 count 쿼리로 교체
  - `select("*", { count: "exact", head: true })` — HEAD 요청으로 건수만 조회 (row 미반환)
  - `.eq("ticker", row.ticker)` 단건 필터로 명확화
  - `.maybeSingle()` — 다음 실적일 조회 (데이터 없을 때 에러 방지)
  - 쿼리 에러 시 `console.error`로 Vercel 로그에 기록

### 공시 수집 기간 7일로 확장 + 페이지네이션

- **배경:** 대형주 공시가 당일 EDGAR 결과에 포함되지 않는 경우 발생
- **변경:** `src/app/api/collect/filings/route.ts`
  - 기본 수집 범위: 오늘 하루 → 최근 7일 (`startdt = today-7`, `enddt = today`)
  - `?date=YYYY-MM-DD` 쿼리 파라미터: 단일 날짜 수동 백필 (기존 방식 유지)
  - `fetchAllHits()` 함수 분리: EFTS 페이지네이션 처리
    - 페이지당 200건 (`hits.hits=200`)
    - `from` 파라미터로 오프셋 증가
    - `hits.total.value`로 전체 건수 확인 후 마지막 페이지 감지
    - 1회 실행 최대 2000건 상한 (무한 루프 방지)
  - 응답: `date` → `period: { startdt, enddt }`로 변경

---

## 2026-06-25 · 세션 10

### 내부자 거래 페이지 수정

- **title 필드 매핑 누락 수정:** `FinnhubInsiderTransaction` 인터페이스에 `title?: string` 추가, insert 구문에 `title: tx.title || null` 추가 → 다음 수집부터 직책 데이터 저장
- **종목당 최대 5건 필터링:** Supabase 50건 조회 후 JS Map으로 ticker별 카운트, 5건 초과 시 제외

### 와치리스트 페이지 — 오늘의 기업 동향 섹션 추가

- 하단에 독립 Suspense로 `TrendingContent` 서버 컴포넌트 추가
- 최근 7일 공시(filings) + 뉴스(news) 각 500건 조회 후 ticker별 건수 집계
- 와치리스트 등록 종목 제외 후 활동 합산 기준 상위 10개 가로 스크롤 카드 표시
- 카드: ticker 배지, 회사명, 공시 N건, 뉴스 N건 (투자 추천 표현 없음)

### 어드민 홈 — 내부 관심 종목 섹션 추가

- `export const dynamic = "force-dynamic"` 추가, `createAdminClient` 도입
- 5개 병렬 쿼리: 내부자 매수(7일), 가이던스 공시(7일), 실적 상회(90일), 공시 전체(7일), 뉴스 전체(7일)
- 신호 태그: 내부자 매수(초록), 가이던스(파랑), 실적 상회(보라), 활동 활발(회색, 합산 5건 이상)
- 점수 산정: 신호당 +10점 + 활동 수 (최대 +20), 상위 10개 표시
- 어드민 전용, 유저 페이지에 미노출

### 와치리스트 기업 동향 섹션 개선 (세션 10 계속)

- 와치리스트 등록 여부 무관하게 전체 종목 대상으로 변경 (제외 로직 제거)
- 섹션명: "오늘의 기업 동향" → "기업 동향"
- 가로 스크롤바 제거, 좌/우 화살표 버튼 추가 (`TrendingCarousel` 클라이언트 컴포넌트)
- 자동 슬라이드: 3초 간격 카드 1칸 이동, 마우스 오버 시 정지, 끝에서 처음으로 복귀
- 수동 버튼: 화면 넓이 단위 스크롤
- 팩트 문장 자동 생성 (Haiku 호출 없이 코드 조합):
  - 우선순위: 실적 예정일 > 내부자 매수 > 내부자 매도 > 공시(form_type 포함) > 뉴스
  - 최대 2문장, 활동 없으면 "최근 7일 주요 활동 없음"
- 섹션 구분선: `border-t border-white/[0.06]`으로 와치리스트와 시각적 분리

### 어드민 홈 더미 데이터 → 실 데이터 교체

- KPI 카드: 총 가입자수, Pro 전환율 Supabase 실 쿼리 연동
- 오늘 현황: 신규 가입, 공시 수집, 뉴스 수집 실 데이터 표시

---

## 2026-06-25 · 세션 11

### 데이터 수집 파이프라인 추가

**신규 API 라우트**

- `src/app/api/collect/analyst/route.ts`
  - Finnhub `/stock/recommendation` API 연동
  - 와치리스트 + 최근 7일 공시 종목 대상 (1회 최대 15개, 300ms 딜레이)
  - `analyst_ratings` 테이블 upsert (`onConflict: "ticker,period"`)
  - 가장 최근 3개 기간 보관

- `src/app/api/collect/13f/route.ts`
  - SEC EDGAR 5개 대형 기관 13F-HR 공시 파싱
  - 기관 목록: Berkshire Hathaway, Appaloosa, Baupost, Tiger Global, Gates Foundation
  - EDGAR 제출 내역 → 최신 13F-HR → 파일 인덱스 → infotable XML 다운로드
  - XML 네임스페이스 허용 정규식으로 파싱
  - 회사명 정규화(normalizeName) → tickers.name_en 인메모리 매핑 → ticker 추출
  - `institutional_holdings` 테이블 upsert (`onConflict: "ticker,institution_name,quarter"`)
  - 분기 레이블: "YYYY-MM-DD" → "YYYYQN" (예: 2023Q4)

**Vercel Cron 추가 (vercel.json)**

- `/api/collect/analyst`: 매일 00:25 UTC (`"25 0 * * *"`)
- `/api/collect/13f`: 매주 월요일 00:30 UTC (`"30 0 * * 1"`)

### 어드민 홈 — 기업 동향 (내부용) 섹션 개선

- 섹션명: "내부 관심 종목" → "기업 동향 (내부용)"
- 신규 태그 추가: 애널리스트(teal), 기관 보유(amber)
- 스코어링 개편: `fc×2 + nc + 내부자매수+5 + 애널리스트+3 + 기관보유+3`
- 후보 풀 확장: 시그널 종목만 → 공시+뉴스 활동 모든 종목 + 시그널 종목 통합
- 수동 수집 버튼 추가 (`AdminTriggerButtons` 클라이언트 컴포넌트):
  - 형광 에메랄드 테두리 박스 내 버튼 2개 (애널리스트 추천, 13F)
  - 실행 중 스피너, 완료/에러 상태 표시, 저장/스킵 건수 출력

**Supabase 테이블 생성 필요 (미완료 — 유저 직접 실행)**

```sql
CREATE TABLE analyst_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL, period text NOT NULL,
  buy integer DEFAULT 0, hold integer DEFAULT 0, sell integer DEFAULT 0,
  strong_buy integer DEFAULT 0, strong_sell integer DEFAULT 0,
  collected_at timestamptz DEFAULT now(),
  UNIQUE(ticker, period)
);
CREATE TABLE institutional_holdings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text, institution_name text NOT NULL,
  shares bigint, value bigint, quarter text NOT NULL, filed_at date,
  UNIQUE(ticker, institution_name, quarter)
);
```

- 테이블 생성 후 `pnpm gen:types` 실행 필요

---

## 2026-06-25 · 세션 12

### 랜딩 페이지 실 데이터 연동

**구조 변경**
- `src/app/page.tsx`: "use client" 제거 → 서버 컴포넌트로 전환
  - useState(showLogin) 로직을 `src/components/landing-shell.tsx` 클라이언트 컴포넌트로 분리
  - Hero, RecentChanges, Stats가 서버 컴포넌트로 동작 가능해짐
- `src/components/landing-shell.tsx` 신규 생성: Navbar + LoginModal 상태 관리

**`src/components/hero.tsx` → 서버 컴포넌트**
- 최신 공시 2건 (summary_kr 있는 것) Supabase 조회
- form_type → 배지 색상/한국어 라벨 변환 (10-K, 10-Q, 8-K, Form 4 등)
- event_type → 한국어 이벤트명 변환 (CEO 교체, 자사주 매입 등)
- filed_at → 상대적 시간 표시 (오늘 HH:MM KST, 어제, N일 전)
- 실 데이터 2건 미만 시 기존 정적 카드 폴백
- `revalidate = 1800` (30분마다 재검증)

**`src/components/filing-card.tsx` 개선**
- `keyNumbers?: string` 선택적 prop으로 변경 (없으면 해당 섹션 미표시)
- `url?: string` prop 추가 → SEC 원문 링크 실제 URL 연결

**`src/components/recent-changes.tsx` → 서버 컴포넌트**
- 최근 7일 공시 중 summary_kr 있는 것 최대 6건 조회
- 우선순위: event_type 있는 것(ceo_change, buyback, insider_trade, ma, guidance 등) 먼저, 이후 최신순
- 배지: event_type 기반 색상 분류 (purple: 임원교체, amber: 내부자/자사주, blue: 가이던스/M&A, green: 보고서)
- 회사명 tickers 테이블 별도 조회
- 카드 레이아웃: 2열 (sm) → 3열 (lg)
- `revalidate = 1800`

**`src/components/stats.tsx` → 서버 컴포넌트**
- 4개 count 쿼리 병렬 실행: tickers, filings, news, macro_indicators
- 숫자 포맷: 1만 이상 → "N만+", 1천 이상 → "N천+", 이하 → "N+"
- 4항목 표시: 모니터링 기업, 수집 공시, 수집 뉴스, 경제지표
- `revalidate = 3600`

---

## 2026-06-25 · 세션 13

### 수집 파이프라인 추가 — 주가 히스토리 · 어닝서프라이즈

**신규 API 라우트**

- `src/app/api/collect/prices/route.ts`
  - Yahoo Finance v8 chart API 활용 (Python 불필요, Vercel 서버사이드)
  - URL: `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1y&interval=1d`
  - 수집 항목: 현재가(regularMarketPrice), 52주 최고(fiftyTwoWeekHigh), 52주 최저(fiftyTwoWeekLow), 52주 수익률(close 첫값→마지막값 % 변동)
  - 수집 대상: 와치리스트 + 최근 7일 공시 종목, 1회 최대 20개, 200ms 딜레이
  - `stock_prices` 테이블 upsert (`onConflict: "ticker"`)

- `src/app/api/collect/earnings-actual/route.ts`
  - Finnhub `/stock/earnings?symbol={ticker}` 엔드포인트
  - 회계 분기 마감일(period)과 DB 발표일(report_date) 매칭: |기간차| ≤ 90일
  - null actual_eps 행만 선택적 업데이트 (기존 실적 데이터 보존)
  - 수집 대상: 와치리스트 + 최근 7일 공시 종목, 1회 최대 15개, 300ms 딜레이

**Vercel Cron 추가 (vercel.json)**

- `/api/collect/prices`: 매일 00:30 UTC (`"30 0 * * *"`)
- `/api/collect/earnings-actual`: 매일 00:35 UTC (`"35 0 * * *"`)

### 어드민 홈 종합 스코어링 개편

기존: `fc×2 + nc + 내부자매수+5 + 애널리스트+3 + 기관+3`
신규: `fc×2 + nc + 내부자매수+5 + Strong Buy 5+개+8 + Buy 5+개+5 + 기관편입+5 + 어닝서프라이즈+6 + 가이던스+6`

변경 내역:
- 애널리스트 조건 세분화: strong_buy ≥ 5 → +8, buy ≥ 5 → +5 (기존: any > 0 → +3)
- 기관 보유 가중치: +3 → +5
- 어닝서프라이즈(actual_eps > eps_estimate): 태그만 있었으나 → +6점 추가
- 가이던스 공시(event_type = 'guidance'): 태그만 있었으나 → +6점 추가
- analyst_ratings 쿼리: `.gt("buy", 0)` 필터 제거, JS에서 임계값 처리

### 어드민 트리거 페이지 업데이트

- 수동 실행 버튼 2개 추가: 주가 히스토리 수집, 실적 어닝서프라이즈 업데이트
- Cron 스케줄 안내 테이블: analyst, prices, earnings-actual, 13F 항목 추가

**Supabase 테이블 생성 필요 (미완료 — 유저 직접 실행)**

```sql
-- 기존 (이전 세션에서 생성 필요했던 것)
CREATE TABLE analyst_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL, period text NOT NULL,
  buy integer DEFAULT 0, hold integer DEFAULT 0, sell integer DEFAULT 0,
  strong_buy integer DEFAULT 0, strong_sell integer DEFAULT 0,
  collected_at timestamptz DEFAULT now(),
  UNIQUE(ticker, period)
);
CREATE TABLE institutional_holdings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text, institution_name text NOT NULL,
  shares bigint, value bigint, quarter text NOT NULL, filed_at date,
  UNIQUE(ticker, institution_name, quarter)
);

-- 이번 세션 신규
CREATE TABLE stock_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker text NOT NULL UNIQUE,
  current_price numeric,
  week52_high numeric,
  week52_low numeric,
  week52_return numeric,
  collected_at timestamptz DEFAULT now()
);
```

- 테이블 생성 후 `pnpm gen:types` 실행 필요

---

## 2026-06-25 · 세션 14

### /api/collect/prices 버그 수정

- **원인 1 — 컬럼명 불일치**: 코드는 `current_price`, `week52_high`, `week52_low`, `week52_return`, `collected_at` 사용 / 실제 테이블: `close`, `date`, `change_pct`, `volume`
- **원인 2 — Yahoo Finance API 차단**: `query1` 도메인 + 부족한 헤더로 Vercel 서버사이드 요청이 차단됨
- **수정**: `query2.finance.yahoo.com` + `Referer: https://finance.yahoo.com/` 헤더 추가
- **저장 방식 변경**: 스냅샷 1행 → 최근 30일 일별 행 (`range=1mo`, `onConflict: "ticker,date"`)
- **에러 가시성**: HTTP 상태코드·파싱 오류를 `firstError` 필드에 담아 응답에 포함
- `trigger-buttons.tsx`: 성공 시 `firstError`를 노란색 경고로 표시

### 어드민 홈 스코어링 — 52주 수익률 추가

- `stock_prices` 테이블에서 종목별 최초·최신 종가 조회
- 기간 수익률 = `(최신 종가 - 최초 종가) / 최초 종가 × 100`
- 스코어링: 수익률 20% 이상 → +4, 10% 이상 → +2
- 현재 30일치 데이터 기준으로 동작, 수집이 누적될수록 52주 실값에 근접

---

## 미완료 스코어링 항목 (추후 업데이트)

기업 동향 스코어링에서 아래 항목은 데이터 또는 파싱 고도화 후 반영 예정:

| 항목 | 현황 | 비고 |
|------|------|------|
| 어닝서프라이즈 +6 | `actual_eps` 데이터 축적 중 | `earnings-actual` 크론으로 수집 중, 데이터 쌓이면 자동 반영 |
| 가이던스 공시 파싱 +6 | `filings.event_type = 'guidance'` 파싱 고도화 필요 | EDGAR 8-K 원문에서 가이던스 언급 여부 추출 필요 |
| 52주 수익률 | `stock_prices` 수집 완료, 스코어링 연결 완료 | 현재 30일 데이터 기준 → 누적 시 52주 근접 |

---

---

## 2026-06-25 · 세션 15

### 어드민 데이터 페이지 더미 데이터 → 실 데이터 교체

**`src/app/admin/data/filings/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- `createAdminClient()` 기반 3개 쿼리 병렬 실행:
  - 전체 count, 오늘 count, 최근 7일 raw rows (filed_at + form_type)
- JS에서 날짜별·form_type별 집계: 8-K / 10-K / 10-Q / Form 4 / 기타 분류
- 기존 하드코딩 5일치 더미 로그 → 실 DB 기반 유형별 분류표 + 7일 날짜별 건수표

**`src/app/admin/data/news/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- 전체 count, 오늘 count, 최근 7일 raw rows (published_at + source) 병렬 조회
- JS에서 날짜별·소스별 집계 (null → "기타")
- 기존 더미 로그 → 실 DB 기반 소스별 분류표 + 7일 날짜별 건수표

**`src/app/admin/data/translation/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- 4개 count 쿼리 병렬: filings 전체, filings summary_kr NOT NULL, news 전체, news summary_kr NOT NULL
- 기존 토큰 비용 더미 데이터 완전 교체 → 번역 완료율 기반 UI로 재설계
  - 상단 카드: 전체 완료율 / 번역 완료 건수 / 번역 대기 건수
  - 공시·뉴스 진행률 바 (퍼플 색상, 퍼센트 + 건수 표시)
  - 하단 상세 테이블: 전체 / 완료 / 대기 / 완료율 4컬럼

---

## 2026-06-25 · 세션 16

### 어드민 추가 페이지 더미 데이터 → 실 데이터 교체

**`src/app/admin/data/api/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- `createAdminClient` 불필요 (Supabase 미사용), 서버 컴포넌트에서 직접 `process.env.*` 접근
- 환경변수 존재 여부 확인: `FINNHUB_API_KEY`, `FRED_API_KEY`, `ANTHROPIC_API_KEY`
- 실제 ping 테스트 3개 (`Promise.all` 병렬):
  - Finnhub: `GET /api/v1/quote?symbol=AAPL` (키 있을 때만)
  - SEC EDGAR: `efts.sec.gov` 검색 엔드포인트 (키 불필요)
  - FRED: `/fred/series?series_id=FEDFUNDS` (키 있을 때만)
  - Anthropic: 키 등록 여부만 확인 (비용 절약 위해 실제 호출 생략)
- `AbortSignal.timeout(6000)` 으로 6초 타임아웃
- 응답 시간(ms) 실측 표시, 키 등록/미등록 배지

**`src/app/admin/users/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- `createAdminClient()` 기반 profiles 테이블 조회
- 전체 count + 최신 100명 병렬 조회 (created_at DESC)
- 기존 하드코딩 더미 유저 10명 → 실 DB 데이터
- plan 값 기준 배지: `pro` → 초록, 그 외 → 회색
- 100명 초과 시 "최신 N명 표시 중" 안내 메시지

**`src/app/admin/users/subscriptions/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- 3개 병렬 쿼리: 전체 count, pro count, pro 유저 목록
- 상단 카드: Free 인원 / Pro 인원 / 전환율(%) 실 계산
- Pro 유저 목록: profiles 테이블 email + created_at 기반 표시
- 결제 상세(갱신일, 금액)는 Polar.sh 연동 전까지 미표시

---

## 2026-06-25 · 세션 17

### 어드민 시스템 페이지 더미 데이터 → 실 데이터 교체

**`src/app/admin/system/costs/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- `createAdminClient()` 기반 번역 건수 조회 (summary_kr IS NOT NULL)
- 예상 비용 계산: 공시 번역 건수 × $0.0002 + 뉴스 번역 건수 × $0.0001 (누계)
- 상단 카드 3개: 공시 번역 예상 / 뉴스 번역 예상 / 합계
- 비용 내역 테이블: 항목 / 건수 / 건당 단가 / 예상 비용
- Anthropic 직접 연동 / Vercel / Supabase → "준비 중" 섹션으로 분리

**`src/app/admin/system/env/page.tsx`**
- `export const dynamic = "force-dynamic"` 추가
- 하드코딩 더미 배열 제거 → `process.env.*` 서버사이드 실시간 확인
- 확인 항목 8개: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FINNHUB_API_KEY, FRED_API_KEY, ANTHROPIC_API_KEY, ADMIN_EMAIL, CRON_SECRET
- 값 미노출 원칙: `!!process.env.KEY` (boolean 변환만) → 설정됨/미설정만 표시
- 카테고리 구분: Supabase / 외부 API / 앱

## 2026-06-26 · 세션 18

### 와치리스트 기업 동향 공시 유형 약어 풀네임 표기
**`src/app/(dashboard)/watchlist/page.tsx`**
- `expandFormType()` 헬퍼 함수 추가: 8-K → 8-K(주요 경영 이벤트), 10-K → 10-K(연간 보고서), 10-Q → 10-Q(분기 보고서), 4 → Form 4(내부자 거래), S-1 → S-1(신규 상장), DEF 14A/DEF14A → DEF 14A(주주총회)
- 팩트 문장 생성 시 fTypes[0]을 expandFormType()으로 변환하여 적용

### 랜딩 히어로 글로우 애니메이션 CSS 버그 수정
**`src/app/globals.css`**
- **원인:** `@theme inline`으로 선언된 `--animate-glow-pulse` 변수는 브라우저 런타임에 CSS custom property로 노출되지 않아 `var()` 참조가 빈 값으로 해석됨
- **수정:** `.animate-glow-pulse` 클래스의 `animation: var(--animate-glow-pulse)` → `animation: glow-pulse 3s ease-in-out infinite` 직접 값으로 교체

---

## 2026-06-26 · 세션 19

### pnpm gen:types 파일 오염 버그 수정

- **원인:** `npx supabase` (버전 미지정) 실행 시 설치 프롬프트 텍스트가 stdout으로 출력되어 `src/types/supabase.ts`에 저장됨 → TypeScript 빌드 에러
- **수정 1:** `package.json` gen:types 스크립트에 `--yes` 플래그 추가: `npx --yes supabase@latest ...`
- **규칙 추가:** CLAUDE.md 10항 15번 — 커밋 전 supabase.ts 첫 줄 `export type Json =` 확인 의무화

### collect_runs 테이블 타입 캐스트 적용

- `src/app/api/admin/run/route.ts`, `run-status/route.ts`, `last-runs/route.ts`
- `collect_runs` 테이블이 Supabase 자동 생성 타입에 없어 빌드 에러 발생
- **수정:** 3개 파일 모두 `.from("collect_runs")` → `(adminClient as any).from("collect_runs")` 패턴 적용
- **규칙 추가:** CLAUDE.md 10항 16번 — 타입 미등록 테이블은 `as any` 캐스트 패턴 사용

### 와치리스트 에메랄드 테두리 위치 수정

- **이전:** `WatchlistCard`(종목 요약 카드)에 잘못 적용됨
- **수정:** `WatchlistCard` → `border-white/[0.08]` 원복, `TrendingCarousel` 개별 카드 → `border-emerald-400/50 shadow-emerald-400/[0.12]` 적용 (더 밝게)

### 랜딩 히어로 "티커플로우" 글로우 효과 최종 구현

- text-shadow CSS 방식 완전 포기 (Tailwind v4 `@theme inline` 환경에서 반복 실패)
- **최종 구현:** `text-blue-400` + `style={{ filter: "drop-shadow(0 0 10px rgba(96,165,250,0.7))" }}`
  - 인라인 CSS filter로 텍스트 외곽 형광 글로우 구현 (정적, 애니메이션 없음)
  - 뱃지 blue-400 계열과 동일한 색상 체계

### 랜딩 히어로 헤드카피 단축

- "나스닥 모니터링 대시보드" → "나스닥 모니터링"

### 공시 피드 탭 필터 구현 시도 (미완료)

- `FilingFilterBar`: useState → useRouter → Link 방식으로 변경 (3회 시도)
- `DashboardPage`: `?type=` searchParam 읽어 Supabase 쿼리에 필터 적용
- `FeedPagination`: `type` param 유지 기능 추가
- **현재 상태:** URL 필터링 로직은 구현됐으나 탭 클릭 시 시각적 반응 없음 (원인 미확정, 추후 재작업)

### FilingCard SEC 원문 링크 하단 고정

- **수정:** `<div className="space-y-3 ...">` → `<div className="flex flex-col space-y-3 ...">`
- SEC 원문 링크 div에 `mt-auto` 추가
- 카드 내 텍스트 분량과 무관하게 링크가 항상 카드 하단에 위치

---

## 2026-06-26 · 세션 20

### 종목 스냅샷(/stocks/[symbol]) 실 데이터 연동

**`src/app/(dashboard)/stocks/[symbol]/page.tsx` 전면 재작성**

- 기존 더미 데이터 전체 제거, 실 Supabase 쿼리로 교체
- `export const dynamic = "force-dynamic"` 추가
- Next.js 15+ 비동기 params 패턴: `params: Promise<{ symbol: string }>`, `await params`
- `createClient` from `@/lib/supabase/server`

**6개 쿼리 Promise.all 병렬 실행**

| 테이블 | 쿼리 조건 | 용도 |
|--------|-----------|------|
| `tickers` | ticker = symbol, maybeSingle | 회사명, 거래소, 섹터 |
| `stock_prices` | ticker = symbol, ASC 30건 | SVG 차트 + 최근 종가 |
| `filings` | ticker = symbol, DESC 5건 | 최근 공시 목록 |
| `news` | ticker = symbol, DESC 5건 | 최근 뉴스 목록 |
| `earnings` | report_date ≥ today, ASC 1건 | 다음 실적 발표일 |
| `insider_trades` | ticker = symbol, DESC 5건 | 내부자 거래 내역 |

**SVG 주가 차트 (서버사이드 렌더링)**

- viewBox="0 0 600 140", 차트 영역 0~110px, 날짜 라벨 영역 110~140px
- 선: `polyline` stroke="#60a5fa" strokeWidth=2
- 면: `polygon` fill rgba(96,165,250,0.08), 선 꼭짓점 + 우하단 + 좌하단
- Y축: min/max에서 10% 패딩 자동 산출
- X축 날짜 라벨: 첫날·중간·마지막날 3개, MM/DD 포맷
- 데이터 2건 미만 시 수집 중 안내 텍스트 표시

**페이지 레이아웃**

- 상단: 티커 배지 + 회사명 + 거래소·섹터·산업
- 주가 차트 카드: 최근 종가 + 전일 대비(%) + 수집 기간
- 3열 요약 카드: 최근 종가 / 전일 대비 / 다음 실적 (D-N일, BMO/AMC, EPS 예상)
- 2/3 + 1/3 레이아웃: [최근 공시, 최근 뉴스] / [내부자 거래]
- 공시: form_type 배지(8-K amber / 10-K·10-Q blue / Form 4 purple), 상대 시간, summary_kr, SEC 원문 링크
- 뉴스: 헤드라인, 상대 시간, summary_kr, 소스 배지, 원문 링크
- 내부자 거래: 거래일, 매수(emerald)/매도(red), 이름, 직책, 주수, 단가
- 하단 면책 문구 (CLAUDE.md 준수)

### 공시 피드 탭 필터 재구현

**근본 원인:**
- Next.js 15+에서 `page.tsx`의 `searchParams`가 `Promise` 타입으로 변경됨
- `DashboardPage`가 동기 함수였기 때문에 `searchParams.type`이 항상 `undefined` 반환
- 결과: `type`이 항상 `""`(전체)로 고정 → 탭 클릭해도 필터·강조 변화 없음

**수정 내역:**

`src/app/(dashboard)/dashboard/page.tsx`
- `export default function` → `export default async function`
- `searchParams` 타입: `{ page?: string; type?: string }` → `Promise<{ page?: string; type?: string }>`
- `const { page: pageParam, type: typeParam } = await searchParams` 로 추출
- 기본값: `type = typeParam ?? "all"`
- 탭 값 매핑 변경: `""/"8-K"/"10-K"/"10-Q"/"4"` → `"all"/"8k"/"10k"/"10q"/"form4"`
- Supabase 필터 조건 업데이트 (`"8k"` → `.like("form_type", "8-K%")` 등)
- `<FilingFilterBar activeType={type}>` → `<FilingFilterBar currentType={type}>`
- `FeedPagination type={type !== "all" ? type : undefined}` (all 일 때 URL 파라미터 제거)

`src/components/dashboard/filing-filter-bar.tsx`
- `Link` 삭제, `useRouter` from `next/navigation` 추가
- 탭 `<Link>` → `<button onClick={() => router.push(...)}>`
- 활성 탭 스타일: `border-b-2 border-white` → `bg-white text-black` (pill 방식)
- 비활성 탭: `text-[#a6a6a6] hover:text-white`
- prop 명 `activeType` → `currentType`

### SVG textAnchor 타입 에러 수정

- **원인:** `labels` 배열의 `anchor` 필드가 `string` 타입으로 추론되어 SVG `textAnchor` 속성(`"start" | "middle" | "end"`)에 할당 불가
- **수정:** `labels` 배열 타입을 `{ i: number; anchor: "start" | "middle" | "end" }[]`로 명시

### 섹터 히트맵 페이지 실 데이터 연동

**신규 파일: `src/components/dashboard/sector-treemap.tsx`**
- `"use client"`, `useState(hovered)`
- SVG viewBox="0 0 800 400", preserveAspectRatio="xMidYMid meet"
- Squarified Treemap 알고리즘 순수 TypeScript로 직접 구현 (외부 라이브러리 없음)
- `worstRatio()` — 행의 최악 종횡비 계산
- `squarify()` — 재귀 레이아웃, w/h 비교로 수평/수직 스트립 선택
- 유효 값: `activityScore > 0 ? activityScore : tickerCount * 0.5`
- 최솟값 보정: 각 섹터 전체 면적의 2% 이상 보장
- 색상: 활동 상위 33% → rgba(96,165,250,0.35), 중위 → rgba(96,165,250,0.18), 하위 → rgba(255,255,255,0.06)
- 박스 내 텍스트: 섹터명(14px bold) + 종목 수(11px) + 공시·뉴스 건수(11px, width>100 조건)
- clipPath로 텍스트 박스 넘침 방지
- hover: stroke rgba(96,165,250,0.6), SVG `<title>` 기반 브라우저 툴팁

**수정 파일: `src/app/(dashboard)/sectors/page.tsx`**
- 기존 ProGate + SectorsPreview 더미 제거 → 실 데이터 서버 컴포넌트로 재작성
- `export const dynamic = "force-dynamic"`, async 서버 컴포넌트
- 3개 쿼리 `Promise.all` 병렬: tickers(sector 있는 것) + filings(30일) + news(7일)
- JS 서버사이드 집계: ticker→sector 매핑 후 섹터별 종목·공시·뉴스 카운트
- 활동 점수 = filingCount × 2 + newsCount
- SECTOR_KR 매핑: 11개 섹터 한국어 변환
- 범례 (활동 활발/보통/적음) + 활동 점수 계산식 표시
- 섹터 요약 테이블: activityScore DESC, hover 하이라이트
- 하단 면책 문구 3줄

### 종목 프로필 수집 파이프라인 신규 생성

**신규 파일: `src/app/api/collect/profile/route.ts`**
- Finnhub `/stock/profile2?symbol={ticker}` API 연동
- 수집 대상: tickers 테이블에서 `sector IS NULL`인 종목 (최대 50개, 이미 있는 건 스킵)
- `finnhubIndustry` → `INDUSTRY_TO_SECTOR` 매핑 테이블로 sector 추출
  - 매핑 없는 경우 finnhubIndustry 값을 sector에 그대로 저장
- tickers 테이블 `.update({ sector, industry })`
- 종목당 300ms 딜레이 (Finnhub rate limit 대응)
- 응답: `{ ok, total, updated, skipped, errors, firstError }`

**`vercel.json`** — Cron 추가: `"37 1 * * 1"` (매주 월 01:37 UTC / 10:37 KST)

**`src/app/api/admin/run/route.ts`** — `"profile": "/api/collect/profile"` JOB_MAP 추가

**`src/app/admin/system/trigger/page.tsx`**
- TRIGGERS 배열에 "종목 프로필 수집 (Finnhub)" 버튼 추가
- `TriggerResult` 인터페이스에 `updated?: number`, `errors?: number` 추가
- `resultSummary()` 함수에 `업데이트 N건`, `에러 N건` 표시 추가
- Cron 스케줄 테이블에 종목 프로필 항목 추가

### 어드민 트리거 페이지 카드 2열 그리드 배치

- 카드 wrapper: `space-y-3` → `grid grid-cols-1 md:grid-cols-2 gap-4`
- map 콜백에 `index` 추가, `TRIGGERS.length % 2 !== 0 && index === last` 조건으로 마지막 카드 `md:col-span-2` 자동 처리

### 종목 프로필 수집 401 에러 분석

- **코드 차이 없음:** profile route는 기존 정상 동작 route(analyst, filings 등)와 완전히 동일한 패턴 사용 확인
- **원인:** `/api/admin/run` → `after()` → `/api/collect/profile` 서버-서버 호출 시 세션 쿠키가 전달되지 않음. CRON_SECRET이 `.env.local`에 없으면 Bearer 인증도 실패 → 401
- **다른 버튼이 "완료"로 보이는 이유:** `lastRun` DB에 이전 성공 기록이 있어서. profile은 신규라 이전 결과 없음 → 현재 오류 바로 노출
- **해결:** `.env.local`에 `CRON_SECRET=tickerflow-local-dev` 추가 (Vercel 설정값과 동일하게). 코드 변경 없음.

---

## 2026-06-26 · 세션 21

### 어드민 더미 데이터 전체 제거 및 실 데이터 연동

**`src/app/admin/users/pro-grant/page.tsx`**
- `"use client"` + `useState` 제거 → 서버 컴포넌트(async) 전환
- `export const dynamic = "force-dynamic"` 추가
- `createAdminClient()`로 `profiles` 테이블에서 `plan = 'pro'` 유저 조회 (created_at DESC)
- 하드코딩 `grantHistory` 배열 완전 제거
- 사유 컬럼 완전 제거 (profiles 테이블에 없음): 폼의 사유 입력 필드 + 테이블 사유 열 모두 삭제
- 전체 Pro 유저 수 카드 추가
- 빈 상태 처리: "Pro 플랜 유저가 없습니다." 안내

**`src/app/admin/ops/filings/page.tsx`**
- `"use client"` 제거 → 서버 컴포넌트(async) 전환
- 하드코딩 `filings` 배열 완전 제거
- `createAdminClient()`로 4개 쿼리 `Promise.all` 병렬 실행:
  - 전체 공시 수 (count)
  - 오늘 수집 수 (filed_at >= today, count)
  - 번역 완료 수 (summary_kr IS NOT NULL, count)
  - 최근 20건 (filed_at DESC)
- 상단 카드 3개: 전체 공시 / 오늘 수집 / 번역 완료
- 테이블 컬럼: 날짜 / 티커 / 유형 / 제목 / 번역(O·X) / 원문 링크
- 검색·숨김 필터 UI 제거 (미구현 기능)
- 빈 상태 처리: "수집된 공시가 없습니다." 안내

**`src/app/admin/ops/notices/page.tsx`**
- 더미 notices 배열 + useState + 폼 전체 제거
- notices 테이블 없음 확인 (supabase.ts)
- 빈 상태 UI (IconBell + "공지사항 기능은 준비 중입니다.") 로 대체

**`src/app/admin/ops/reports/page.tsx`**
- 더미 reports 배열 + statusColor 맵 + 테이블 전체 제거
- reports / contacts 테이블 없음 확인 (supabase.ts)
- 빈 상태 UI (IconMessage + "문의·신고 기능은 준비 중입니다.") 로 대체

### 종목 프로필 수집 401 에러 근본 수정

**`src/app/api/admin/run/route.ts`**
- **원인:** `after()` 콜백은 새 fetch 컨텍스트이므로 브라우저 세션 쿠키가 자동 전달되지 않음
- **이전 접근:** CRON_SECRET 환경변수에 의존 → 미설정 시 모든 트리거 401
- **수정:** 원본 요청의 `cookie` 헤더를 캡처해 `after()` fetch에 수동 전달
  ```typescript
  const cookieHeader = req.headers.get("cookie") ?? "";
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    ...(cookieHeader && { Cookie: cookieHeader }),
  }
  ```
- 이제 CRON_SECRET 없이 어드민 세션 쿠키만으로 인증 통과

### 실적 캘린더 페이지네이션 추가

**`src/app/(dashboard)/earnings/page.tsx`**
- `PAGE_SIZE = 25` 상수 추가
- `EarningsList`에 `page` prop 추가, Supabase `.range(offset, offset + 24)` + `{ count: "exact" }`로 DB 레벨 슬라이싱
- `EarningsPagination` 서버 컴포넌트 추가: Next.js `<Link>` 기반 `?page=N` URL 파라미터 방식
  - 7페이지 이하: 전체 노출 / 이상: 현재 페이지 주변 + `…` 말줄임
  - 이전/다음 버튼 비활성 시 `pointer-events-none opacity-30`
- `EarningsPage` async 변환, `searchParams: Promise<{ page?: string }>` 파싱
- `<Suspense key={page}>` — 페이지 전환마다 스켈레톤 재표시
- 데이터 25건 이하 시 페이지네이션 미표시

### 마이페이지 카드 너비 수정

**`src/app/(dashboard)/mypage/page.tsx`**
- 카드 컨테이너 `max-w-2xl` 제거 → 다른 페이지와 동일하게 전체 너비 사용

### 랜딩 Hero 2열 레이아웃 + 대시보드 목업 UI 구현

**`src/components/hero.tsx`**
- 기존 1열 중앙 정렬 → 2열 그리드 (`grid-cols-1 lg:grid-cols-2 gap-16`) 변경
- 좌측: 기존 h1, 부제, 샘플 공시 카드 유지 (`lg:text-left` 반응형 정렬 추가)
- 우측: 대시보드 목업 UI 코드로 직접 구현 (`hidden lg:block`)
  - 브라우저 크롬 상단 바 (macOS 버튼 3개 + tickerflow.net URL)
  - 미니 사이드바 (모니터링/인사이트 메뉴, 공시 피드 활성 상태)
  - 공시 카드 3건 (실제 DB filings 데이터, summary_kr IS NOT NULL 최신순)
  - form_type 배지 색상: 8-K → amber, 10-K·10-Q → blue, Form 4 → purple, 기타 → gray
  - 하단 페이드 그라디언트 + 좌측 페이드 (배경 자연 연결)
  - 블루 글로우 (`bg-blue-500/10 blur-3xl`)
- `relativeTime()` 헬퍼 추가 (오늘/어제/N일 전)
- `getMockupBadgeClass()` 헬퍼 추가 (form_type → Tailwind 클래스)
- filings 쿼리: `id` 필드 추가, `limit(2 → 3)` 확장
- `revalidate = 1800` 유지

### Resend 이메일 연동

**설치**
- `pnpm add resend` (v6.14.0)

**이메일 클라이언트**
- `src/lib/email/resend.ts`: `Resend` 인스턴스 + `FROM` 상수

**템플릿 4종** (`src/lib/email/templates.ts`)
- `welcomeEmail()`: 환영 이메일 — 서비스 소개 + 주요 기능 3가지 + CTA
- `proUpgradeEmail()`: Pro 전환 알림 — Pro 기능 5가지 목록 + CTA
- `inboundForwardEmail()`: 수신 이메일 포워딩 (관리자용)
- `dailyDigestEmail()`: 일보 다이제스트 — 공시 5건 + 뉴스 5건 + KST 날짜

**API 라우트**
- `src/app/api/email/welcome/route.ts` — POST `{ email }`, `requireCollectAuth`
- `src/app/api/email/pro-upgrade/route.ts` — POST `{ email }`, `requireCollectAuth`
- `src/app/api/webhooks/resend/route.ts` — POST (Resend 수신 웹훅, 인증 없음), nudgefilm@gmail.com으로 포워딩
- `src/app/api/email/digest/route.ts` — GET/POST, `requireCollectAuth`, Pro 유저 전원 발송

**Vercel Cron**
- `/api/email/digest` — `0 1 * * *` (매일 01:00 UTC = 10:00 KST)

**어드민 트리거**
- `src/app/admin/system/trigger/page.tsx`: "일보 다이제스트 발송 (Pro 유저)" 트리거 추가
- `src/app/api/admin/run/route.ts`: `JOB_MAP["digest"]` 추가

**도메인 설정 (별도 수동 작업 필요)**
- Resend 도메인 인증: tickerflow.net (Tokyo ap-northeast-1 권장)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` 환경변수 등록 (Vercel + .env.local)

### Polar.sh 결제 연동

**설치**
- `pnpm add @polar-sh/sdk` (v0.48.1)

**웹훅 처리** (`src/app/api/webhooks/polar/route.ts`)
- `subscription.active` / `subscription.created` → `profiles.plan = 'pro'` 업데이트 + Pro 전환 이메일 발송
- `subscription.canceled` / `subscription.revoked` → `profiles.plan = 'free'` 업데이트
- `order.paid` → 로그만 (추가 처리 없음)
- POLAR_WEBHOOK_SECRET 설정 시 HMAC-SHA256 서명 검증
- 페이로드: `data.user.email` 또는 `data.customer.email`

**체크아웃 API** (`src/app/api/polar/checkout/route.ts`)
- POST `{ productId, userEmail }` → Polar `/v1/checkouts` 호출 → `{ checkoutUrl }` 반환
- 로그인 세션 필수 (Supabase auth 확인)
- `success_url`: `/billing?success=true`

**클라이언트 버튼** (`src/components/dashboard/checkout-button.tsx`)
- "use client" — 로딩 상태, 에러 메시지 표시
- `handleCheckout()`: POST `/api/polar/checkout` → `window.location.href` 이동

**billing 페이지** (`src/app/(dashboard)/billing/page.tsx`)
- 서버 컴포넌트 전환 (`export const dynamic = "force-dynamic"`)
- `createClient()` + `createAdminClient()`로 현재 유저 plan 조회
- `?success=true` 쿼리 파라미터 시 성공 배너 표시
- Pro 플랜이면 "현재 Pro 플랜 이용 중" 버튼 비활성화

**컴포넌트 업데이트**
- `billing-current.tsx`: plan/email/productId props 수신, Free일 때만 업그레이드 버튼
- `billing-plan-card.tsx`: isPro/userEmail/productId props 수신, 상태별 버튼 분기

**필요 환경변수**
- `POLAR_ACCESS_TOKEN` (기존)
- `POLAR_WEBHOOK_SECRET` (Polar 웹훅 Signing Secret)
- `POLAR_PRODUCT_ID_MONTHLY` (Pro 월간 상품 ID)

### 공시 피드 상단 시각화 섹션 추가

**신규 컴포넌트 3종**
- `src/components/dashboard/disclosure-type-chart.tsx`: 유형 분포 도넛 차트 (conic-gradient, 범례 포함)
- `src/components/dashboard/disclosure-trend-chart.tsx`: 최근 7일 바 차트 (일별 건수)
- `src/components/dashboard/sector-activity-chart.tsx`: 섹터별 수평 바 차트 (상위 5개)

**`src/app/(dashboard)/dashboard/page.tsx` 수정**
- 차트용 집계 쿼리 2개 추가 (`filings`, `tickers`) — 기존 피드 쿼리와 독립적으로 실행
- JS 집계 3종:
  - 유형 분포: form_type 카테고리별 건수 → 퍼센트 변환 (8-K/#fbbf24, 10-K/#60a5fa, 10-Q/#93c5fd, Form 4/#c084fc, 기타/#6b7280)
  - 7일 트렌드: 날짜별 건수 (빈 날짜 0으로 초기화)
  - 섹터 활동: tickerSectorMap 빌드 후 섹터별 건수 상위 5개, SECTOR_KR 한국어 매핑
- 시각화 섹션(`md:grid-cols-3`)을 FilingFilterBar 위에 배치
- SECTOR_KR 매핑 sectors/page.tsx와 동일하게 유지

### profile 수집 파라미터 조정

**`src/app/api/collect/profile/route.ts`**
- 기본 수집 종목 수: 50 → 20으로 축소 (타임아웃 방지)
- Finnhub API 딜레이: 300ms → 200ms로 단축
- `?limit=N` 쿼리 파라미터 추가 (기본 20, 최대 50 상한)

---

## 2026-06-26 · 세션 22

### 401 Unauthorized 근본 원인 분석 및 수정

**원인 확정**
- `requireCollectAuth()`에서 세션 쿠키 체크 경로가 제거된 상태에서 브라우저 요청이 `/api/admin/run`에 진입
- 브라우저는 `Authorization: Bearer CRON_SECRET` 헤더를 보내지 않으므로 무조건 401 반환
- collect 엔드포인트 호출 자체가 이루어지지 않았음

**수정 1: requireCollectAuth() 세션 경로 복원**
- `src/lib/collect/auth.ts`
- 인증 순서: ① CRON_SECRET → ② Supabase 세션 + ADMIN_EMAIL 확인 → ③ 401
- `user.email === process.env.ADMIN_EMAIL` 조건으로 브라우저 관리자 요청 허용

**수정 2: profile collect 함수 직접 호출 리팩토링**
- `src/app/api/collect/profile/route.ts`
  - `runProfileCollect(limit?: number)` 함수로 수집 로직 분리 export
  - GET 핸들러는 `requireCollectAuth` 후 `runProfileCollect()` 호출만 수행
  - Cron 직접 GET 호출 동작 유지
- `src/app/api/admin/run/route.ts`
  - `job === "profile"` 분기: HTTP fetch 제거 → `runProfileCollect()` 직접 호출
  - 나머지 job은 기존 `JOB_MAP + fetch()` 구조 그대로 유지
  - `collect_runs` insert/update 로직 변경 없음
- **효과:** after() 컨텍스트에서 Authorization 헤더 릴레이 불필요, 리다이렉트 위험 제거

## 2026-06-26 · 세션 23

### 전체 collect API HTTP self-call 제거 및 CollectResult 타입 통일

**목적**
- 세션 22에서 profile만 직접 호출로 전환한 것을 나머지 9개 job에 모두 적용
- 스케줄러 교체(Inngest, Trigger.dev 등) 시 수정 없이 이전 가능한 구조 확보

**신규 파일**
- `src/lib/collect/types.ts`: 공통 `CollectResult` 인터페이스 (`{ ok: boolean; error?: string; [key: string]: unknown }`)

**리팩토링 대상 (10개)**
- filings → `runFilingsCollect(dateParam?)`
- news → `runNewsCollect()`
- earnings → `runEarningsCollect(from?, to?)`
- earnings-actual → `runEarningsActualCollect(tickerParam?)`
- prices → `runPricesCollect(tickerParam?)`
- insider → `runInsiderCollect(tickerParam?)`
- analyst → `runAnalystCollect(tickerParam?)`
- 13f → `run13fCollect(institutionParam?)`
- macro → `runMacroCollect()`
- profile → `runProfileCollect(limit?)` (기존, 타입만 통일)

**모든 함수 공통 패턴**
- 반환 타입: `Promise<CollectResult>`
- GET 핸들러: auth 체크 → params 추출 → `runXxxCollect(params)` → 응답
- 파라미터 미지정 시 기본값(와치리스트+공시 7일 대상, 기본 날짜 범위 등) 동작 유지

**`src/app/api/admin/run/route.ts` 개선**
- `COLLECT_MAP: Record<string, () => Promise<CollectResult>>`: 10개 job 직접 호출 맵
- `FETCH_JOB_MAP`: collect 외 job (watchlist-tickers, translate, digest 등)만 fetch 유지
- `after()` 블록: `COLLECT_MAP[job]?.()` 우선, 없으면 fetch fallback

---

## 2026-06-26 · 세션 22

### 수집 아키텍처 개선 — watchlist-tickers COLLECT_MAP 승격 완료

**배경**: HTTP 자기 호출 → Authorization 헤더 드롭(RFC 9110 redirect 규칙) → 401. 근본 해결은 HTTP 실행 모델 제거.

**`src/lib/collect/types.ts`**
- `COLLECT_JOBS`에 `"watchlist-tickers"` 추가 (11번째)
- `FETCH_JOBS`에서 `"watchlist-tickers"` 제거 → 4개 잔류

**`src/lib/collect/collect-ticker.ts`**
- `export interface CollectResult` 제거 (Method A — 공통 타입과 충돌 해소)
- 내부 반환 타입을 파일-로컬 `type TickerData`로 대체 (미노출)

**신규 `src/lib/collect/watchlist.ts`**
- `runWatchlistTickersCollect(): Promise<CollectResult>` — 순수 서비스 함수
- `NextRequest` / `NextResponse` 의존 없음
- watchlist 테이블 조회 → 중복 제거 → `collectTickerData(ticker)` 루프
- 반환: `{ ok, tickers, filings, news, errors? }`

**`src/lib/collect/index.ts`**
- `export * from "./watchlist"` 추가

**`src/app/api/collect/watchlist-tickers/route.ts`**
- 기존 인라인 로직(adminClient 조회 + 루프) 완전 제거
- `runWatchlistTickersCollect()` 호출하는 thin wrapper로 교체

**`src/app/api/admin/run/route.ts`**
- `runWatchlistTickersCollect` import 추가
- `COLLECT_MAP`에 `"watchlist-tickers": runWatchlistTickersCollect` 추가
- `FETCH_JOB_MAP`에서 `"watchlist-tickers"` 항목 제거

**결과**
- COLLECT_MAP: 11개 (profile, filings, news, earnings, earnings-actual, prices, insider, analyst, 13f, macro, watchlist-tickers)
- FETCH_JOB_MAP: 4개 (seed-tickers, translate, digest, debug-env)
- watchlist-tickers 401 완전 해소

---

## 2026-06-27 · 세션 24

### Polar.sh 결제 연동 완성

**`src/app/api/webhooks/polar/route.ts`** (재작성)
- `export const dynamic = "force-dynamic"` 추가
- 수신 이벤트: `subscription.created`, `subscription.updated`, `subscription.canceled`, `subscription.revoked`
- `subscription.created` / `subscription.updated` + `status === "active"` → `profiles.plan = "pro"` 업데이트 + Pro 전환 이메일 발송
- `subscription.canceled` / `subscription.revoked` → `profiles.plan = "free"` 업데이트
- DB 업데이트 실패 시 500 반환 (Polar 재시도)
- 서명 검증: `X-Polar-Signature` 헤더 값 == `HMAC-SHA256(rawBody, POLAR_WEBHOOK_SECRET)` hex
- 유저 식별: `event.data.customer.email` 우선, 없으면 `event.data.user.email`

**`src/middleware.ts`**
- `/api/webhooks/` 경로 조기 반환 추가 (`NextResponse.next()`, Supabase 세션 조회 없이 통과)

**`src/app/(dashboard)/billing/page.tsx`**
- `PRODUCT_ID` 환경변수 참조 제거
- 정적 체크아웃 URL 상수 2개 추가:
  - `MONTHLY_CHECKOUT_URL = "https://buy.polar.sh/polar_cl_b4362962-9365-4bfb-be40-1f5ad65b45af"`
  - `ANNUAL_CHECKOUT_URL = "https://buy.polar.sh/polar_cl_046ffe47-7b01-4427-b69b-63202cf5ae85"`
- `BillingCurrent` prop: `productId` → `monthlyCheckoutUrl`
- `BillingPlanCard` prop: `userEmail`, `productId` → `monthlyCheckoutUrl`, `annualCheckoutUrl`

**`src/components/dashboard/billing-plan-card.tsx`**
- `CheckoutButton` 제거 → `<a>` 링크 2개 (`target="_blank" rel="noopener noreferrer"`)
  - 월간: "월간 구독 시작" → `monthlyCheckoutUrl`
  - 연간: "연간 구독 시작 (₩11,900/월)" → `annualCheckoutUrl`
- Pro 유저: "현재 Pro 플랜 이용 중" 비활성 버튼 유지

**`src/components/dashboard/billing-current.tsx`**
- `CheckoutButton` 제거 → `<a>` 링크 (`monthlyCheckoutUrl`, `target="_blank"`)
- prop: `productId` → `monthlyCheckoutUrl`

**필요 Vercel 환경변수**
- `POLAR_WEBHOOK_SECRET` — Polar 웹훅 Signing Secret
- `POLAR_ACCESS_TOKEN` — `/api/polar/checkout` API용 (체크아웃 API는 유지됨)

### Polar.sh 웹훅 등록 완료

- Polar 대시보드 웹훅 엔드포인트 등록 완료 (tickerflow-production)
- `POLAR_WEBHOOK_SECRET` Vercel + `.env.local` 등록 완료
- 상품 ID 확정:
  - 월간: `b4362962-9365-4bfb-be40-1f5ad65b45af`
  - 연간: `046ffe47-7b01-4427-b69b-63202cf5ae85`

### .env.local.example 신규 생성

- `.env.local.example` 프로젝트 루트에 생성
- 포함 항목: Supabase / Finnhub / FRED / Anthropic / Polar / Resend / 앱 설정
- Polar 항목: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_ID_MONTHLY`, `POLAR_PRODUCT_ID_ANNUAL`

---

## 2026-06-27 · 세션 25

### 사이드바 구독 관리 메뉴 추가

**`src/components/dashboard/sidebar.tsx`**
- `IconCreditCard` import 추가
- [설정] 그룹에 `{ href: "/billing", label: "구독 관리", icon: IconCreditCard }` 추가 (알림 설정 ↔ 마이페이지 사이)
- Pro 배지 없음 (Free 유저도 접근 가능)

### billing 페이지 재구성

**`src/app/(dashboard)/billing/page.tsx`** (전면 재작성)
- `createClient()` 로 현재 유저 plan 조회 (`profiles.id = user.id`)
- 레이아웃 변경: Free vs Pro 비교 → 현재 플랜 상태 카드(상단) + 월간/연간 플랜 카드(하단)
- 상단 현재 플랜 카드: Free/Pro 표시, Pro 유저 "활성" 배지
- 월간 플랜 카드 (₩14,900/월): Free → 체크아웃 링크, Pro → "현재 Pro 플랜 이용 중" 비활성
- 연간 플랜 카드 (₩142,800/년, 월 ₩11,900): "2개월 무료" 배지, Free → 체크아웃 링크, Pro → 비활성
- `?success=true` 쿼리 시 Pro 전환 성공 배너 표시
- 하단 면책 문구 3줄 유지
- 기존 BillingCurrent / BillingPlanCard 컴포넌트 의존 제거 (인라인 구현)

---

## 2026-06-27 · 세션 26

### billing 페이지 플랜 비교 UI 개편

**`src/components/dashboard/billing-plans-client.tsx`** (신규)
- `"use client"` — 탭 상태(`useState`) 필요
- 2열 그리드 (Free 카드 | Pro 카드)
- Free 카드: 와치리스트(최대 5종목), 공시 피드, 뉴스 피드, 실적 캘린더, 종목 스냅샷, 경제지표
- Pro 카드: 월간 / 연간 탭 스위처 (`bg-[#1a1a1a]` 탭 바)
  - 월간 탭: ₩14,900 / 월, "월간 구독 시작" 링크
  - 연간 탭: ₩142,800 / 년 (월 ₩11,900 상당), "2개월 무료" 배지, "연간 구독 시작" 링크
  - 체크아웃 링크는 탭 상태에 따라 동적 전환 (`buy.polar.sh` 정적 URL)
- 현재 플랜 강조: 해당 카드 `border-2 border-blue-400/60` + "현재 플랜" 배지
- Pro 유저: 체크아웃 링크 → "현재 플랜" 비활성 버튼
- `mt-auto` 로 CTA 버튼 카드 하단 고정

**`src/app/(dashboard)/billing/page.tsx`** 수정
- 기존 인라인 월간/연간 카드 제거 → `BillingPlansClient isPro={isPro}` 위임
- 상단 현재 플랜 상태 카드 유지

---

## 2026-06-27 · 세션 27

### billing 페이지 — 구독 해지 링크 추가

**`src/app/(dashboard)/billing/page.tsx`**
- 현재 플랜 카드 하단 (Pro 유저 전용): `border-t border-white/[0.06]` 구분선 + 해지 섹션 추가
- "구독 해지 또는 플랜 변경" 텍스트 링크 → `https://polar.sh/tickerflow/portal`
  - `target="_blank" rel="noopener noreferrer"`
  - 색상: `text-[#a6a6a6]` → hover `text-white`
- 안내 문구: "구독 해지 후에도 현재 결제 기간 종료일까지 Pro 기능을 이용할 수 있습니다."

---

## 2026-06-27 · 세션 28

### 뉴스 피드 상단 시각화 섹션 추가

**신규 컴포넌트 3개**

- `src/components/dashboard/news-source-chart.tsx`
  - 뉴스 출처 분포 도넛 차트 (conic-gradient)
  - props: `sources: { name, value, color }[], total: number`
  - 범례: 출처명 + 퍼센트 + 건수

- `src/components/dashboard/news-trend-chart.tsx`
  - 최근 7일 뉴스 추이 막대 차트
  - props: `trend: { day, count }[]`
  - 막대 색상: `linear-gradient(to top, rgba(59,130,246,0.4), #60a5fa)`

- `src/components/dashboard/news-sector-chart.tsx`
  - 섹터별 뉴스 활동 수평 바 차트
  - props: `sectors: { sector, count }[]`
  - SECTOR_KR 매핑 컴포넌트 내부 처리, 바 색상 `#60a5fa`

**`src/app/(dashboard)/news/page.tsx`** 수정
- `async` 서버 컴포넌트로 전환
- 4개 쿼리 `Promise.all` 병렬 실행:
  - 출처 분포: news 최근 30일 source 집계 → 상위 5개 + 기타
  - 7일 추이: news 최근 7일 published_at 집계 (빈 날짜 0 초기화)
  - 섹터별: news 최근 7일 ticker + tickers sector 매핑 → 상위 5개
- 시각화 레이아웃: `md:grid-cols-2 items-stretch`
  - 좌: `NewsSourceChart` (전체 높이)
  - 우: `NewsTrendChart` + `NewsSectorChart` (flex-col gap-4)
- 기존 필터바·피드·면책 문구 유지

## 2026-06-27 · 세션 29

### /mypage 구독 플랜 섹션 정리

**`src/app/(dashboard)/mypage/page.tsx`**
- Pro 유저 상태에서 "결제 정보 — Polar.sh 연동 후 제공 예정" InfoRow 제거
- Pro 유저 상태에서 "플랜 해지 문의 →" mailto 링크 (`mailto:support@tickerflow.net?subject=Pro 플랜 해지 요청`) 제거
- Pro 유저 구독 플랜 섹션은 "현재 플랜: Pro 배지" 한 행만 표시
- 해지 방법은 `/billing` 페이지의 Polar.sh 포털 링크로 통일 (별도 안내 불필요)

---

## 2026-06-27 · 세션 30

### 와치리스트 "최근 7일 변화 요약" 카드 추가

**신규 파일: `src/components/dashboard/weekly-summary-card.tsx`**
- `SummaryMetric` 인터페이스 export: `{ label, value, unit, color, series }`
- props로 `metrics: SummaryMetric[]` 수신 (더미 데이터 없음)
- 카드 내 3열 그리드: 각 metric마다 스파크라인(7개 바) + 수치 + 레이블
- 스파크라인: `flex h-10 items-end`, 바 높이 = `max(10, round(v/peak*100))%`, 데이터 없는 날 opacity 0.15
- 대시보드 HEX 토큰 사용 (`#111111`, `#a6a6a6` 등), HSL 토큰 사용 없음

**수정 파일: `src/app/(dashboard)/watchlist/page.tsx`**
- `WeeklySummaryCard`, `SummaryMetric` import 추가
- `WatchlistContent`에 3개 일자 키 배열 추가: `pastKeys`(과거 7일), `futureKeys`(미래 7일), `sevenDaysLater`
- 와치리스트 비어있을 때: `emptyMetrics`(전부 0) 으로 WeeklySummaryCard 표시
- 와치리스트 있을 때: 기존 per-ticker 쿼리와 3개 배치 쿼리를 `Promise.all` 1회로 병렬 실행
  - 쿼리 1: `filings.filed_at` 최근 7일, 와치리스트 ticker 한정
  - 쿼리 2: `news.published_at` 최근 7일, 와치리스트 ticker 한정
  - 쿼리 3: `earnings.report_date` 오늘~+6일, 와치리스트 ticker 한정
- JS 집계: `filingsByDay`, `newsByDay`, `earningsByDay` (초기값 0), `earningsTickerSet`(Set)
- metrics 배열: 신규 공시(`#60a5fa`), 신규 뉴스(`#93c5fd`), 실적 임박(`#fbbf24`)
- 반환: `<WeeklySummaryCard metrics={metrics} />` → `<WatchlistClient ...>` 순서

---

---

## 2026-06-27 · 세션 31

### /analysis 공시 인사이트 페이지 전면 재작성

**신규 파일 — 공유 타입**
- `src/lib/insights/types.ts` — StockInsight, Filing, TimelineEvent, InsiderTrade, InsiderSummary, EarningsRow, NewsItem 인터페이스

**신규 파일 — 공시 인사이트 컴포넌트 11개**
- `src/components/dashboard/insights/ui.tsx` — InsightCard, ImportanceBadge, EmptyState, FormTypeBadge, relativeDate
- `src/components/dashboard/insights/stock-combobox.tsx` — 와치리스트 기반 종목 선택 combobox (useRouter, click-outside)
- `src/components/dashboard/insights/stock-header.tsx` — 종목 헤더 (exchange, sector, lastClose, updatedAt)
- `src/components/dashboard/insights/change-summary.tsx` — 5개 요약 카드 (공시/주요이벤트/내부자거래/뉴스/실적)
- `src/components/dashboard/insights/recent-filings.tsx` — 최근 공시 목록 (ImportanceBadge + FormTypeBadge)
- `src/components/dashboard/insights/change-timeline.tsx` — 통합 타임라인 (filing/news/insider/earnings 통합, 최대 20건)
- `src/components/dashboard/insights/insider-trading.tsx` — 내부자 거래 (3열 요약 + 거래 목록)
- `src/components/dashboard/insights/earnings-flow.tsx` — 실적 테이블 (분기/EPS예상/EPS실제/결과)
- `src/components/dashboard/insights/related-news.tsx` — 관련 뉴스 목록 (출처/날짜/헤드라인/한국어요약)
- `src/components/dashboard/insights/data-sources.tsx` — 데이터 출처 (SEC EDGAR/Finnhub/Yahoo Finance)

**수정 파일**
- `src/app/(dashboard)/analysis/page.tsx` — 서버 컴포넌트, force-dynamic, 6개 Promise.all 병렬 쿼리, ProGate 래핑

**데이터 쿼리**
- tickers, stock_prices(30일), filings(30일), news(90일), insider_trades(180일), earnings(4건) 병렬
- 타임라인: filings + news + insider_trades + earnings 통합, date DESC 정렬

**규제 준수**
- 투자 추천/호재/악재 표현 없음, 면책 문구 3줄 포함

---

## 2026-06-27 · 세션 32

### /stocks/[symbol] 종목 스냅샷 페이지 컴포넌트 분리 재작성

**타입 추가**
- `src/lib/insights/types.ts` — Quote, NextEarnings 인터페이스 추가

**신규 파일 — snapshot 컴포넌트 7개**
- `src/components/dashboard/snapshot/snapshot-header.tsx` — 티커 배지, 회사명, 거래소/섹터/산업 (lucide-react 사용)
- `src/components/dashboard/snapshot/price-card.tsx` — SVG 주가 차트, 최근 종가/변동/52주 고저 (PriceCardFull export)
- `src/components/dashboard/snapshot/key-metrics.tsx` — 3열 카드: 최근종가/전일대비/다음실적
- `src/components/dashboard/snapshot/snapshot-filings.tsx` — 최근 공시 목록 + "공시 인사이트 보기 →" /analysis?symbol 링크
- `src/components/dashboard/snapshot/snapshot-news.tsx` — 최근 뉴스 목록
- `src/components/dashboard/snapshot/company-info.tsx` — 기업 정보 카드 (거래소/섹터/산업)
- `src/components/dashboard/snapshot/snapshot-insider.tsx` — 내부자 거래 목록

**수정 파일**
- `src/app/(dashboard)/stocks/[symbol]/page.tsx` — 7개 Promise.all 병렬 쿼리 (tickers/prices/filings/news/insider/earnings/nextEarnings), 컴포넌트 조합으로 레이아웃 재구성
- DataSources 컴포넌트 재사용 (공시 인사이트와 공유)

**데이터 변환**
- stock_prices → Quote (history 배열, change, changePct, week52High/Low)
- earnings (미래) → NextEarnings (daysUntil, timing BMO/AMC)
- filings → Filing (event_type 한국어 라벨, importance 자동 산정)
- news → NewsItem, insider_trades → InsiderTrade (buy/sell → 매수/매도)

---

## 2026-06-27 · 세션 33

### /analysis 공시 인사이트 페이지 v0 디자인 전면 적용

**목표:** 이전 세션에서 구현한 분석 페이지 컴포넌트들을 v0 결과물 디자인으로 교체

**수정 파일 7개**

- `src/components/dashboard/insights/stock-combobox.tsx`
  - lucide-react ChevronsUpDown / Search / Check 아이콘으로 변경
  - 드롭다운 배경 `bg-[#161616]`, 티커 배지 + 이름 2열 레이아웃
  - 선택 항목에 파란 Check 아이콘 표시
  - useMemo로 검색 필터링 최적화

- `src/components/dashboard/insights/stock-header.tsx`
  - 회사명 + 티커 배지를 상단에, 거래소·섹터·산업을 한 줄 메타로 배치
  - 우측에 StockCombobox 직접 임베드 (서버 컴포넌트 → 클라이언트 컴포넌트 렌더링)
  - 하단에 5개 ChangeStat 카드: 최근 공시/주요 변화/최근 뉴스/최근 실적 발표/최근 내부자 거래
  - props: `industry`, `summary`, `comboboxOptions` 추가 / `lastClose` 제거

- `src/components/dashboard/insights/recent-filings.tsx`
  - `"use client"` 추가 (필터 탭 상태 관리)
  - 필터 탭: 전체/8-K/10-Q/10-K/Insider/기타 — 활성: `bg-[#60a5fa] text-[#0a0a0a]`
  - 날짜 좌측 고정 `w-12` + 공시 내용 우측
  - formType/eventType 배지 (blue), 원문 링크 인라인

- `src/components/dashboard/insights/change-timeline.tsx`
  - lucide-react 아이콘 4종 (FileText/Newspaper/UserRound/TrendingUp)
  - 수직 타임라인 CSS: `pl-8 before:absolute before:left-[11px] before:w-px`
  - 아이콘 버블: `ring-4 ring-[#111111]`로 수직선과 분리
  - 카드: `borderLeft: 2px solid {color}` 컬러 구분선

- `src/components/dashboard/insights/insider-trading.tsx`
  - 3개 StatCard (매수건수 green / 매도건수 red / 총거래규모 blue)
  - 전체 테이블: 거래일/내부자/직책/구분/수량/금액 6컬럼
  - `t.value` 포맷: B/M/K 단위 자동 변환

- `src/components/dashboard/insights/related-news.tsx`
  - `InsightCard` → `SectionCard` 래퍼로 교체
  - 출처·날짜 인라인 `·` 구분자

- `src/components/dashboard/insights/change-summary.tsx`
  - 5개 요약 카드 → CheckCircle2 아이콘 체크리스트로 완전 교체
  - props: `summary: {...}` → `events: TimelineEvent[]`
  - 타임라인 이벤트 최신 10건, date ASC → DESC 정렬 표시

**`src/app/(dashboard)/analysis/page.tsx`**
- 섹션 순서 재조정 (v0 순서 적용):
  StockHeader → RecentFilings → ChangeTimeline → InsiderTrading → EarningsFlow → RelatedNews → ChangeSummary → DataSources
- StockCombobox 별도 div 제거 (StockHeader에 통합)
- StockHeader props 업데이트: `industry`, `summary`, `comboboxOptions` 추가 / `lastClose` 제거
- ChangeSummary에 `events={insight.timeline}` 전달

**빌드 결과:** ✓ Compiled successfully (에러 없음)

---

## 2026-06-27 · 세션 34

### 공시/뉴스피드 차트 높이 균형 및 히어로 도넛 최대화

**문제 1 — 좌측 도넛 카드 공백**
- `DisclosureTypeChart` / `NewsSourceChart`: 수평 레이아웃(`items-center gap-8`)이라 도넛(h-48)이 행 높이를 결정
- 우측 트렌드+섹터 카드 합계보다 짧아 `items-stretch` 그리드에서 공백 발생

**수정 1:** 도넛 카드 레이아웃 수평 → 수직 전환
- `flex flex-1 items-center gap-8` → `flex flex-1 flex-col items-center gap-5`
- 범례: `flex min-w-0 flex-1 flex-col gap-3` → `flex w-full flex-1 flex-col justify-between`
- 도넛 h-48 유지 (축소 없음), 범례가 나머지 높이를 자동으로 채움

**문제 2 — 트렌드 차트 count 레이블 잠재 클리핑**
- 각 바 컬럼 콘텐츠(count 레이블+바+날짜)가 ~88px인데 컨테이너가 84px

**수정 2:** 컨테이너 높이 `BAR_HEIGHT + 32` → `BAR_HEIGHT + 40` (8px 확보)
- `h-full` 제거 → 자연 높이로 렌더링 (우측 flex 컬럼에서 h-full 간섭 방지)

**문제 3 — 섹터 차트 잔여 공간 미활용**
- `h-full` 이 flex 컬럼 내에서 100% parent를 시도하면서 트렌드 차트와 경쟁

**수정 3:** `h-full` → `flex-1` + 아이템 `justify-between`
- `flex flex-1 flex-col rounded...` + `flex flex-1 flex-col justify-between` 으로 아이템 균등 배분

**히어로 도넛 최대화 요청**
- 히어로 목업 Card 1(공시유형분포): 도넛 `h-28 w-28` → `h-40 w-40`, `inset-[28px]` → `inset-[40px]`
- 범례: `justify-between` + `flex-1`으로 잔여 공간 자동 채움
- 결과: 도넛이 카드 좌우 공백 없이 최대 크기로 표시

**수정 파일 7개**
- `src/components/dashboard/disclosure-type-chart.tsx`
- `src/components/dashboard/news-source-chart.tsx`
- `src/components/dashboard/disclosure-trend-chart.tsx`
- `src/components/dashboard/news-trend-chart.tsx`
- `src/components/dashboard/sector-activity-chart.tsx`
- `src/components/dashboard/news-sector-chart.tsx`
- `src/components/hero.tsx`

---

## 2026-06-27 · 세션 35

### CLAUDE.md 15항 초보자 배려 원칙 — 금융 용어 표기 통일

전체 대시보드 페이지·컴포넌트에서 금융 용어 첫 등장 시 괄호 설명 병기, 반복 등장 시 용어만 표기, 좁은 공간은 hover tooltip 원칙 적용.

**수정 파일 11개**

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/dashboard/sidebar.tsx` | 사이드바 레이블 "인사이더" → "내부자 거래" |
| `src/app/(dashboard)/insider/page.tsx` | ProGate title "인사이더는" → "내부자 거래는" |
| `src/components/dashboard/insider-preview.tsx` | 각주 "인사이더 거래는" → "내부자 거래는" |
| `src/components/dashboard/snapshot/key-metrics.tsx` | 다음 실적 발표 sub 표시: `BMO` → `BMO (개장 전)`, `AMC` → `AMC (장 마감 후)` (표시 레이어에서 변환, timing 타입 "BMO"\|"AMC" 유지) |
| `src/components/dashboard/calls-preview.tsx` | 첫 번째 Section label "가이던스" → "가이던스 (실적 전망)" |
| `src/app/(dashboard)/sectors/page.tsx` | 부제 "섹터 크기를" → "섹터(업종) 크기를" |
| `src/components/dashboard/snapshot/company-info.tsx` | 기업 정보 레이블 "섹터" → "섹터 (업종)" |
| `src/app/(dashboard)/mypage/page.tsx` | 데이터 출처 "CPI" → "CPI(소비자물가지수)" |
| `src/components/dashboard/stock-earnings-table.tsx` | EPS 컬럼 헤더 "EPS" → "EPS (주당순이익)" |
| `src/components/dashboard/snapshot/key-metrics.tsx` | MetricCard label "시장 예상 EPS" → "시장 예상 EPS (주당순이익)" |
| `src/components/dashboard/analysis-preview.tsx` | 수치 칩 "EPS $2.94" → "EPS(주당순이익) $2.94" |

**이미 처리된 항목 (변경 불필요)**
- `earnings/page.tsx`: EPS/BMO/AMC 하단 각주에 이미 설명 ✓
- `insights/earnings-flow.tsx`: 하단에 "EPS(주당순이익)" 이미 명시 ✓
- `macro/page.tsx`: INDICATOR_META의 desc에 "소비자물가지수" 이미 포함 ✓
- `filing-filter-bar.tsx`: 8-K/10-K/10-Q/Form 4 tooltip 이미 구현 ✓

**빌드 결과:** ✓ Compiled successfully

---

## 2026-06-27 · 세션 36

### 어닝콜 요약 페이지(/calls) 실 데이터 연동

**목적:** 기존 ProGate + CallsPreview 데모 제거, earnings_calls 테이블 실 데이터 연동

**신규 파일 3개**

- `src/lib/earnings-calls.ts`
  - `EarningsCall` 인터페이스 (타입 중앙화)
  - `GuidanceDirection`, `KeyStatement`, `QaPair`, `KeywordChange` 보조 타입

- `src/components/dashboard/earnings-call-card.tsx`
  - `"use client"` — Q&A expand/collapse `useState`
  - 9개 섹션: 헤더 / 핵심요약(오렌지15%) / 실적요약(블루15%) / 가이던스 / 키워드 / 경영진발언 / Q&A / 전분기비교 / 하단링크
  - 데이터 없는 섹션 자동 숨김 (조건부 렌더링)

- `src/components/dashboard/calls-board.tsx`
  - `"use client"` — 필터/페이지네이션 상태
  - 필터: 기간(전체/1개월/3개월) · 가이던스방향(세그먼트) · 내 종목만(토글)
  - `PAGE_SIZE = 3`, 3건 초과 시 페이지네이션 표시
  - 빈 상태: "최근 3개월 내 어닝콜 데이터가 없습니다."
  - 데이터 출처 카드 하단 고정

**수정 파일 1개**

- `src/app/(dashboard)/calls/page.tsx`
  - `ProGate` + `CallsPreview` 완전 제거
  - `export const dynamic = "force-dynamic"` 추가
  - `async` 서버 컴포넌트로 전환
  - `earnings_calls` 테이블 쿼리 (`adminClient`) + tickers 조인
  - profiles 테이블에서 isPro 조회, watchlist에서 보유 종목 Set 생성
  - `key_points` JSON 필드에서 EarningsCall 필드 매핑
  - CLAUDE.md 16항 `as unknown as EarningsCallRow[]` 패턴 준수

**데이터 매핑**
- `fiscal_quarter` + `fiscal_year` → `Q{N} FY{YYYY}` 포맷
- `processed_at` → `call_date` (ISO slice) + `relative_time` (오늘/어제/N일 전) + `summary_generated_at` (KST)
- `key_points.tone_current ?? tone_change` — DB 컬럼 폴백

**빌드 결과:** ✓ Compiled successfully

---

## 2026-06-27 · 세션 37

### 어닝콜 요약 수집 파이프라인 구현

**배경:** earnings_calls 테이블 실 데이터 수집 파이프라인 신규 구축. CLAUDE.md 17항 서비스 계층 분리 원칙 준수.

**Supabase SQL (수동 실행 필요)**
earnings_calls 테이블에 아래 컬럼이 없어 SQL Editor에서 직접 실행해야 합니다:
```sql
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS quarter text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS call_date date;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS guidance_direction text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS guidance_previous text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS guidance_summary text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS headline_summary text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS revenue_actual text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS revenue_estimate text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS eps_actual text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS eps_estimate text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS surprise_percent numeric;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS keywords text[];
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS key_statements jsonb;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS qa_pairs jsonb;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS keyword_changes jsonb;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS tone_previous text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS tone_current text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS has_earnings_release boolean DEFAULT false;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS transcript_url text;
ALTER TABLE earnings_calls ADD COLUMN IF NOT EXISTS summary_generated_at timestamptz DEFAULT now();
ALTER TABLE earnings_calls ADD CONSTRAINT earnings_calls_ticker_quarter_key UNIQUE (ticker, quarter);
```

**신규 파일 2개**

- `src/lib/collect/calls.ts` — 수집 서비스 계층
  - `runCallsCollect(): Promise<CollectResult>` export
  - 수집 대상: watchlist + earnings 테이블 최근 90일 실적 발표 종목, 최대 10개
  - ① Finnhub `/stock/earnings-call-transcript` — 최신 transcript 조회 (없으면 skip)
  - ② Finnhub `/stock/earnings` — EPS/매출 실적 수치 조회
  - ③ Claude Sonnet (`claude-sonnet-4-6`) — 한국어 구조화 분석 JSON 생성
    - headline_summary / guidance_direction / keywords / key_statements / qa_pairs / keyword_changes / tone 등 14개 필드
    - 사실 서술체만 / 투자 의견 배제 / plain JSON 출력
  - ④ earnings_calls 테이블 upsert (onConflict: "ticker,quarter")
  - 기존 key_points / summary_kr / tone_change 컬럼도 동시 업데이트 (page.tsx 호환)
  - 종목당 500ms 딜레이

- `src/app/api/collect/calls/route.ts` — API route 진입점 (thin wrapper)
  - `maxDuration = 300`
  - `requireCollectAuth()` → `runCallsCollect()` 호출

**수정 파일 5개**

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/collect/types.ts` | COLLECT_JOBS에 `"calls"` 추가 |
| `src/lib/collect/index.ts` | `export * from "./calls"` 추가 |
| `src/app/api/admin/run/route.ts` | `runCallsCollect` import + COLLECT_MAP 등록 |
| `vercel.json` | Cron `"0 2 * * *"` (매일 02:00 UTC = 11:00 KST) 추가 |
| `src/app/admin/system/trigger/page.tsx` | TRIGGERS 배열 + Cron 스케줄 테이블에 "어닝콜 요약 수집" 추가 |

**빌드 결과:** ✓ Compiled successfully

---

## 다음 작업 예정
- 각 collect 버튼 Vercel 배포 후 실제 동작 테스트
- `auth.ts` 디버그 로그 제거 (401 이슈 완전 해소 확인 후)
- seed-tickers / debug-env 등 나머지 FETCH_JOB 401 원인 조사
- 공시 피드 탭 필터 재작업 (클릭 시 시각 반응 및 실제 필터링 동작)
- .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가 (회원 탈퇴 기능 활성화)
- Polar.sh 결제 플로우 실제 테스트 (체크아웃 → 웹훅 수신 → plan 업데이트 확인)
- Resend 도메인 인증 후 이메일 발송 테스트
