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

## 다음 작업 예정
- profile 버튼 실제 동작 확인 (Vercel 배포 후 테스트)
- 나머지 collect job도 동일 패턴(함수 직접 호출)으로 순차 리팩토링 검토
- 공시 피드 탭 필터 재작업 (클릭 시 시각 반응 및 실제 필터링 동작)
- .env.local에 SUPABASE_SERVICE_ROLE_KEY 추가 (회원 탈퇴 기능 활성화)
- Polar.sh 환경변수 등록 후 결제 플로우 테스트
- Resend 도메인 인증 후 이메일 발송 테스트
