# TickerFlow — 개발 작업 기록

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

## 다음 작업 예정
- Supabase에 `analyst_ratings`, `institutional_holdings` 테이블 생성 후 `pnpm gen:types` 실행
- .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가 (회원 탈퇴 기능 활성화)
- Polar.sh 결제 연동 (구독 관리, 결제 내역)
- Resend 이메일 알림 연동
