# TickerFlow — 개발 작업 기록 (세션 31–60)

> 아카이브 기간: 2026-06-27 ~ 2026-06-29
> 원본 파일: WORKLOG.md

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


## 2026-06-27 · 세션 40

### 내부자 거래 수집 404 에러 수정

- `src/lib/collect/insider.ts` URL에서 `&limit=20` 제거
  - **원인:** FMP stable API는 `limit` 쿼리 파라미터 미지원 → HTTP 404 반환
  - **증상:** 저장 0건, 스킵 50건, 에러 50건 (HTTP 404)
  - **수정:** `insider-trading?symbol={ticker}&limit=20&apikey=` → `insider-trading?symbol={ticker}&apikey=`
- `src/lib/collect/calls.ts` URL 확인 → spec과 일치, 수정 불필요
- 빌드: ✓ Compiled successfully

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


## 2026-06-27 · 세션 43

### 어닝콜 수집 Cron 스케줄 변경

- `vercel.json`: `/api/collect/calls` 스케줄 `0 2 * * *` → `22 2 * * *` (02:22 UTC, 11:22 KST)
  - 이유: Vercel Cron 정각(00분) 혼잡 회피
- `src/app/admin/system/trigger/page.tsx`: 표시 텍스트 "매일 02:00 UTC" → "매일 02:22 UTC (11:22 KST)"

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


## 2026-06-29 · 세션 53

### 어드민 홈 기업 동향 노출 종목 수 변경

- `src/app/admin/page.tsx`: 기업 동향(내부용) 슬라이싱 `.slice(0, 10)` → `.slice(0, 30)`
- 스코어링 로직 및 태그 표시 변경 없음

---


## 2026-06-29 · 세션 54

### 와치리스트 TrendingCarousel 노출 종목 수 변경

- `src/app/(dashboard)/watchlist/page.tsx`: `top10` → `top30`, `.slice(0, 10)` → `.slice(0, 30)`
- 추가 조회(회사명·내부자거래·실적 일정) `.in("ticker", top30)` 일괄 반영
- 스코어링 로직·태그·카드 레이아웃 변경 없음

---


## 2026-06-29 · 세션 55

### 어드민 기업 동향 (내부용) 섹션 시각적 구분

- `src/app/admin/page.tsx`: wrapper div 스타일 변경
  - `border-white/[0.08] bg-[#111111]` → `border-red-500/60 bg-red-500/[0.03] shadow-[0_0_20px_rgba(239,68,68,0.25)]`
  - 타이틀 `text-white` → `text-red-400`
- 작업 2(어드민 slice 30), 작업 3(와치리스트 slice 30)은 세션 53·54에서 기완료

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


