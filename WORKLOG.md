# TickerFlow — 개발 작업 기록

> 아카이브:
> - [세션 1–30](docs/worklog-archive/sessions-01-30.md)
> - [세션 31–60](docs/worklog-archive/sessions-31-60.md)

---

## 2026-07-01 · 세션 73

### 다이제스트 이메일 레이아웃 완전 인라인화 + 사이드바 스와이프 수정 + 모바일 카드 그리드 점검

**다이제스트 이메일 Gmail 렌더링 문제 — 근본 원인 및 수정 (`src/lib/email/templates.ts`)**
- 1차 수정(컨테이너 800px, 폰트 크기 확대, TOP3 박스 배경 `#2d2d2d`)이 Gmail에서 반영되지 않음을 확인
- 원인 추정: `<head><style>` 블록의 클래스(`.wrap`, `.card`, `.header`, `.body`, `.footer`, `h1`, `p`)에 의존 → Gmail 앱 등 `<style>` 무시 클라이언트에서 스타일 미적용
- 추가 원인: 직전 수정이 커밋되지 않은 상태였음 — 프로덕션 어드민 트리거 테스트 시 이전 코드로 발송됐을 가능성
- 조치: `<style>` 블록 및 `class` 속성 전면 제거, 모든 요소에 `style=""` 인라인 스타일 직접 명시 (반복 스타일은 `HEADER_STYLE`/`BODY_STYLE`/`FOOTER_STYLE`/`H1_STYLE`/`P_STYLE`/`CTA_STYLE` JS 문자열 상수로 재사용, CSS 클래스 아님)
- 박스형 요소에 `style` + `bgcolor` 속성 동시 적용 (Gmail 일부 버전 호환)
- TOP10 리스트를 1열 세로 나열 → `<table>` 기반 2열(5행×2열) 레이아웃으로 변경, `width="50%" valign="top"`, 홀수 종목 시 마지막 셀 `&nbsp;` 채움, PC/모바일 동일 2열 고정
- 폰트 기준: 본문 16px / 섹션 헤더 20px / 종목명 17px / 설명 텍스트 15px
- 로컬에서 `dailyDigestEmail()` 직접 실행해 인라인 스타일·2열 레이아웃 반영 여부 사전 검증

**사이드바 모바일 스와이프 방향 문제 (`src/components/dashboard/sidebar.tsx`)**
- 원인: 좌측 30px 이내 엣지 스와이프 트리거가 브라우저/OS 네이티브 "엣지 스와이프 뒤로가기" 제스처와 충돌
- 수정: 닫힌 상태에서만 렌더링되는 좌측 20px 전용 트리거 `<div>` 신설, `touch-pan-y` 적용 + non-passive `touchmove`에서 가로 스와이프 감지 시 `preventDefault()`로 네이티브 제스처 선점 차단
- 열림 상태의 좌측 스와이프-닫기 로직은 기존 유지, PC(`md:hidden`)는 트리거 미렌더링으로 기존 동작 유지

**모바일 카드 그리드 전수 점검 (`src/components/dashboard/insights/change-timeline.tsx`)**
- `grid-cols-2`/`md:grid-cols-2` 패턴 34개 파일 전수 검색 — 랜딩·KPI 타일·어드민은 의도된 디자인으로 제외
- 변화 타임라인 카드 그리드만 모바일 대응 누락 확인 → `grid-cols-2` → `grid-cols-1 md:grid-cols-2`로 수정
- 대시보드 카드 폰트가 전역적으로 고정 크기(`text-sm`/`text-xs`)라 반응형 폰트 확대는 범위가 크다고 판단, 보류 (실제 가독성 문제 발견 시 개별 대응)

---

## 2026-07-01 · 세션 72

### Google OAuth 브랜딩, BRIEF 버그 수정, top30_daily 권한 수정

**Google OAuth 브랜딩 인증 대응**
- `src/app/layout.tsx`: `title`을 `{ default, template }` 형식으로 변경 ("TickerFlow | 미국 주식 모니터링 대시보드")
- OG/Twitter 태그에 `title`, `description`, `siteName` 명시 추가
- `src/components/hero.tsx`: TickerFlow 서비스 목적 및 투자 자문 비제공 안내 문단 추가

**BRIEF 버그 수정 — 데이터 윈도우 7일→30일**
- 원인: `!hasData` 조기 반환. 7일 윈도우에선 공시·번역된 뉴스가 없어 5종목 모두 조기 종료됨
- `src/lib/collect/brief.ts`: 데이터 조회 윈도우 `since7d` → `since30d`로 확장
- `callHaiku`: API 오류 시 상태코드·본문 `console.error` 로깅 추가
- `runBriefBackfill` 루프: `ok:false` 응답도 `failed++` 카운터에 반영, 개별 로그 추가
- `src/components/dashboard/snapshot/stock-brief.tsx`: 면책 문구 "최근 7일" → "최근 30일"

**BRIEF 백필 "실패 5건" 진단**
- 원인: `stock_briefs` 테이블에 `service_role` GRANT 누락 (SQL 에디터 생성 테이블 공통 문제)
- 동일 패턴: `top30_daily`도 같은 이유로 `permission denied` 발생
- 수정 방법: `GRANT ALL ON TABLE public.stock_briefs TO service_role;` (사용자가 Supabase SQL 에디터에서 직접 실행)

**BRIEF 백필 트리거 버튼 미표시 이슈 확인**
- 원인: 스크린샷(2026-06-30)이 버튼 추가 커밋(2026-07-01 03:30) 이전 시점이었음
- 코드·배포 모두 정상. 추가 수정 불필요

**top30_daily GRANT 수정 (SQL 제공)**
- `permission denied for table top30_daily` 에러 원인 확인
- 코드는 `createAdminClient()`로 정상 사용 중
- `GRANT ALL ON TABLE public.top30_daily TO service_role;` 제공 (사용자 직접 실행)

**와치리스트 "새 뉴스" 건수 진단**
- 집계 기간 로직 정상 (7일 필터 `sevenDaysAgo` 정확히 적용)
- NVDA 387건은 Finnhub 일반 뉴스 API의 multi-source 특성으로 설명 가능 (코드 버그 아님)
- 중복 확인용 SQL 제공

---

## 2026-07-01 · 세션 71

### 종목 스냅샷 BRIEF 섹션 + 와치리스트 Pro 30개 한도

**DB**
- `stock_briefs` 테이블 신규 생성 (ticker UNIQUE, content, source_period_start/end, generated_at, trigger_reason)
- RLS 정책: `profiles.plan = 'pro'` 유저만 SELECT 허용
- `pnpm gen:types` 재생성, 첫 줄 `export type Json =` 확인

**`src/lib/collect/brief.ts` (신규)**
- `isTickerInProWatchlist(ticker)`: Pro 유저 와치리스트에 ticker 포함 여부 2쿼리로 확인
- `runStockBriefCollect(ticker, triggerReason)`: 최근 7일 공시·뉴스·내부자거래·실적 집계 → Claude Haiku 사실 나열형 종합 (200~300자, plain text) → `stock_briefs` upsert
- CLAUDE.md 6항 금지 표현 후처리 필터 적용

**collect 트리거 연결**
- `filings.ts`: 신규 공시 ticker Set(최대 20개) → `Promise.allSettled` 병렬 BRIEF 갱신
- `news.ts`: 동일 패턴, null ticker 제외
- `insider.ts`: `inserted > 0`이면 fire-and-forget
- `earnings.ts`: `res.saved > 0`이면 fire-and-forget

**`src/components/dashboard/snapshot/stock-brief.tsx` (신규)**
- `{ticker} BRIEF` + Pro 뱃지 헤더
- `generated_at` 기준 "오늘 / N일 전" 상대 표시
- 본문 + 투자 판단 근거 사용 금지 주석

**`src/app/(dashboard)/stocks/[symbol]/page.tsx`**
- 인증 → Pro 여부 → 와치리스트 등록 여부 순차 확인
- 조건 충족 시 `<StockBrief>` SnapshotHeader 바로 아래 렌더링
- `createClient()` + RLS 기반 조회 (adminClient 불필요)

**`src/app/api/watchlist/route.ts`**
- 서버사이드 한도 체크 추가: Free 5개, Pro 30개
- 초과 시 403 + 안내 문구 반환

**`src/components/dashboard/watchlist-client.tsx`**
- `PRO_LIMIT = 30` 추가, Pro 유저도 `(현재 / 30)` 카운터 표시
- Pro 30개 도달 시 한도 안내 문구 표시
- 업그레이드 배너 "최대 30종목" 문구로 수정

---

## 2026-07-01 · 세션 70

### 데이터 출처 박스 7개 페이지 일괄 표준화

**`src/components/dashboard/insights/data-sources.tsx` — 공통 컴포넌트 표준화**
- `description: string` prop 추가 (페이지별 출처 문구 주입)
- 기존 하드코딩 본문 제거, `{description}` 렌더링으로 교체
- "투자 자문이나 투자 권유" 면책 문구 제거 (DashboardDisclaimer와 중복)
- "마지막 업데이트" → "마지막 업데이트:" 콜론 추가

**7개 페이지 데이터 출처 박스 신규/교체 적용**

| 페이지 | 변경 내용 | 출처 문구 |
|---|---|---|
| 공시 피드 | 신규 추가 | 미국 증권거래위원회(SEC EDGAR) 공시 데이터 |
| 뉴스 피드 | 신규 추가 | 공개된 뉴스 데이터 |
| 공시 인사이트 | 표준 양식 교체 | 미국 증권거래위원회(SEC EDGAR) 공시 및 시장 데이터 |
| 어닝콜 요약 | 신규 추가 | 미국 증권거래위원회(SEC EDGAR) 공시 데이터 |
| 내부자 거래 | 신규 추가 | 미국 증권거래위원회(SEC) Form 4 공시 |
| 섹터 히트맵 | 신규 추가 | 공개된 미국 증권거래위원회(SEC EDGAR) 공시 및 시장 데이터 |
| 경제지표 | 신규 추가, 상단 출처 문구 하단 박스로 이동 | 미국 연방준비제도(FRED) 데이터 |

**"마지막 업데이트" 날짜 동적 계산**
- 하드코딩 제거, 각 페이지 핵심 테이블 MAX 날짜 기준 동적 계산
- 공시 피드: `filings.filed_at MAX` (별도 쿼리)
- 뉴스 피드: `news.published_at MAX` (별도 쿼리)
- 공시 인사이트: `filingRows[0].filed_at` (기존 쿼리 재활용) — 버그 수정 (기존: 주가 날짜 오용)
- 어닝콜 요약: `rows[0].processed_at` (기존 쿼리 재활용)
- 내부자 거래: `trades[0].transaction_date` (기존 쿼리 재활용)
- 섹터 히트맵: `filings.filed_at MAX` (신규 쿼리, async 함수로 전환)
- 경제지표: `latestAt` (기존 `rows[0].released_at` 재활용)

**`src/app/(dashboard)/stocks/[symbol]/page.tsx` — 동반 수정**
- description prop 누락 수정 (빌드 타입 에러 해결)

---

## 2026-06-30 · 세션 69

### 대시보드 헤더 알림 벨 드롭다운 구현

**`src/components/dashboard/dashboard-header.tsx` — 알림 드롭다운 추가**
- 기존: 벨 아이콘이 빈 버튼(기능 없음)
- 변경: 클릭 시 드롭다운 열림, 외부 클릭 / ESC 키로 닫힘
- `useRef + mousedown` 이벤트 패턴 (ticker-search.tsx 동일 방식)

드롭다운 구성:
- 텔레그램 채널 항목: 텔레그램 아이콘(`#229ED9`) + 채널명 + 설명 → 새 탭 이동
- 이메일 다이제스트 항목: 메일 아이콘(`#60a5fa`)
  - Free 유저: Pro 뱃지 표시, 클릭 시 `/billing`
  - Pro 유저: "구독 중" 초록 뱃지, 클릭 시 `/alerts`
- 하단 "전체 알림 설정 보기" 링크 → `/alerts`

---

## 2026-06-30 · 세션 68

### 페이지네이션 섹션 스크롤 연동 + 공시 인사이트 재구성 + 데이터 출처 표기 통일

**페이지네이션 스크롤 연동 (전체 사이트)**
- 기존: 페이지 전환 시 전체 최상단으로 이동
- 변경: 해당 섹션 상단으로만 스크롤 이동 (`window.scrollTo` 방식 완전 제거)
- 클라이언트 페이지네이션 (인사이트 4섹션, 어닝콜): `useRef + scrollIntoView`
- URL 기반 페이지네이션 (공시 피드, 뉴스, 실적): `sessionStorage + FeedScrollAnchor`
  - Suspense 언마운트/리마운트 특성 활용 — `useEffect([])` + 플래그 방식
  - `scroll={false}` + `onClick={markFeedScroll}` 패턴
- 신규 컴포넌트: `EarningsPagination`, `FeedScrollAnchor`, `SectionPager`

**공시 인사이트 4개 섹션 페이지네이션 교체**
- 최근 공시, 변화 타임라인, 내부자 거래, 관련 뉴스
- 더보기/접기 토글 → 5건(타임라인 10건) 단위 페이지 이동
- 공유 `SectionPager` 컴포넌트 (말줄임 ellipsis 포함)

**마이페이지 면책 문구 박스 교체**
- 기존: plain `<footer>` 텍스트
- 변경: `<DashboardDisclaimer />` 컴포넌트 통일

**최근 주요 변화 섹션 전면 재구성 (`change-summary.tsx`)**
- 기존: "주요 변화 요약" — 타임라인 이벤트 개별 카드 나열 + 더보기 토글
- 변경: "최근 주요 변화" — 통계 집계 불릿 문장 방식
- 서버 컴포넌트 전환 (`"use client"` 제거)
- props 재설계: `events` 제거 → `summary`, `insider`, `latestEarnings?`
- 불릿 항목: 30일 공시 건수 / 주요 변화 관련 공시 / 180일 내부자 / 총 거래 규모 / 90일 뉴스 / 최근 EPS
- 사실 서술체 (`~되었습니다`, `~집계되었습니다`)만 사용

**데이터 출처 표기 규칙 통일**
- 일반 화면(`data-sources.tsx`, `calls-board.tsx`): "공개된 SEC 공시 및 시장 데이터를 기반으로 제공합니다." 한 줄 통일
- 경제지표(`macro/page.tsx`): 공식 명칭 순서 `FRED(미국 연방준비제도)` → `미국 연방준비제도(FRED)`
- 이용약관(`legal-modal.tsx`): "데이터 출처" 섹션 신규 추가 (SEC EDGAR·FRED·Finnhub·FMP)
- `calls-board.tsx` 텍스트 색상 오류 교정: `#7a7a7a` → `#a6a6a6`

---

## 2026-06-30 · 세션 67

### Pro 일간 다이제스트 이메일 전면 재구성 (TOP30 기반)

**`src/lib/collect/digest.ts` — 완전 재작성**
- 기존: watchlist 기반 공시 5건 + 뉴스 5건 단순 나열
- 변경: top30_daily 데이터 직접 조회, 구성안 6개 섹션 완성
- 가장 최근 top30_daily 날짜 자동 조회 → 01:00 UTC cron 타이밍 문제 없음
- 전일 대비 신규 진입 / 빠진 기업 계산 (오늘 vs 전날 top30 비교)
- reason_tags → TAG_TO_DESC 한국어 문장으로 변환 (원본 태그/점수 미노출)
- Claude Haiku로 2~3문장 시장 요약 자동 생성 (규제 준수 프롬프트 적용)
- 이메일 제목: "오늘의 기업동향 TOP10 | TickerFlow"

**`src/lib/email/templates.ts` — dailyDigestEmail() 전면 교체**
- 새 타입 4개 추가: `Top30Item`, `MarketStats`, `NewEntrantItem`, `DigestData`
- 이메일 섹션 구성:
  - ① 기업동향 TOP10 (티커 링크 + 한국어 bullet 2개)
  - ② 오늘 시장 변화 (집계 통계 + 해석 한 줄)
  - ③ TOP3 상세 (카드 스타일, bullet 3개)
  - ④ 오늘 시장 요약 (Haiku 생성)
  - ⑤ 오늘 처음 TOP30 진입 (티커 링크 + 첫 번째 사유)
  - ⑥ 어제 대비 변화 (새로 진입 / 빠진 기업 링크)
- HTML 어디에도 score, weight, decay, reason_tags 원본 미노출 확인

**외부 노출 차단 확인**
- Haiku 프롬프트: 건수 집계된 한국어 팩트 문장만 전달 (원본 태그 미포함)
- HTML: MarketStats 타입에 score/weight 필드 없음 → 구조적으로 노출 불가

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

