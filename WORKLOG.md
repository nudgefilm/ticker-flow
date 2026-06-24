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

## 다음 작업 예정
- /mypage 마이페이지 구현
- 실제 데이터 연동 (SEC EDGAR API, Finnhub, yfinance)
- Polar.sh 결제 연동
- Resend 이메일 알림 연동
