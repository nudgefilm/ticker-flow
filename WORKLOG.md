# TickerFlow — 개발 작업 기록

> 아카이브:
> - [세션 1–30](docs/worklog-archive/sessions-01-30.md)
> - [세션 31–60](docs/worklog-archive/sessions-31-60.md)

---

## 2026-07-05 · 세션 80

### 어드민 "일별 방문자" KPI 카드 실 데이터 연동

**`page_visits` 테이블 신규 (`supabase/page_visits.sql`, `supabase/schema.sql` §13)**
- 컬럼: `id`, `visited_date`, `user_id`(nullable FK auth.users), `ip_hash`(nullable), `created_at`
- 로그인 방문(`visited_date, user_id` WHERE NOT NULL)·비로그인 방문(`visited_date, ip_hash` WHERE NULL) 각각 부분 유니크 인덱스로 하루 1회만 집계되도록 제약
- CLAUDE.md §17 체크리스트 중 "authenticated SELECT GRANT"는 의도적으로 생략 — 다른 사용자의 `ip_hash`/`user_id`가 담긴 로그라 일반 로그인 유저에게 열어두면 전체 방문자 로그를 조회할 수 있게 되는 문제 방지, `service_role`만 GRANT
- SQL은 Supabase SQL Editor에서 직접 실행(사용자 확인) 후 `pnpm gen:types` 실행, `src/types/supabase.ts` 첫 줄 `export type Json =` 확인 완료

**방문 로깅 (`middleware.ts`)**
- `/api/*`, `/admin/*`, 정적 자산(기존 matcher) 제외 후 실제 페이지 요청만 기록, 리다이렉트되는 요청(비로그인→로그인 등)은 로깅 지점 이전에 return되어 자동 제외
- 로그인 시 `user_id`, 비로그인 시 IP를 Web Crypto(`crypto.subtle.digest`)로 SHA-256 해시 후 저장 — 원본 IP는 저장하지 않음
- PostgREST `.upsert()`는 부분 유니크 인덱스(WHERE 조건부)를 `ON CONFLICT` 추론에서 매칭하지 못해, `insert()` 후 중복키 오류(`23505`)를 무시하는 방식으로 대체 구현
- `next/server`의 `after()`로 응답 전송 후 비동기 기록 — 미들웨어 어댑터가 `waitUntil`을 지원함을 확인해 응답 지연 없이 신뢰성 있게 실행되도록 처리

**어드민 홈 카드 교체 (`src/app/admin/page.tsx`)**
- "일별 방문자" "준비 중" 플레이스홀더 → 오늘(UTC, 기존 신규가입 카운트 기준과 통일) `page_visits` count 3종(전체/로그인/비로그인) 쿼리로 교체, 기존 `createAdminClient`+`force-dynamic` 병렬 쿼리 패턴 유지

**빌드 검증**: `pnpm build` 성공 에러 0건, `pnpm lint` — 변경 파일(`middleware.ts`, `admin/page.tsx`) 오류 없음(기존 다른 파일 오류 72건은 이번 작업과 무관).

---

## 2026-07-05 · 세션 79

### 빌링 탭 UI 정리, Polar 체크아웃 리다이렉트 사고 진단·수정, 환불정책 추가, Polar 결제 보류로 안내 모달 전환

**빌링 페이지 Pro 탭 선택 상태 명확화 (`billing-plans-client.tsx`)**
- 월간/연간 탭 선택 상태가 비선택 상태와 구분이 잘 안 되는 문제 → 선택 탭 배경을 Free 카드 "현재 플랜" 버튼과 동일한 `bg-blue-500/[0.15]`로 통일, 탭 컨테이너 `bg-[#262626]` → `bg-[#111111] rounded-lg p-1`로 변경

**Polar 체크아웃 "polar.sh 메인으로 리다이렉트" 사고 진단 및 수정 (`billing-plans-client.tsx`, `billing/page.tsx`)**
- 월간/연간 "구독 시작" 클릭 시 결제 페이지 대신 `polar.sh` 메인으로 이동하는 문제 확인 — `curl -I`로 하드코딩된 정적 `buy.polar.sh/polar_cl_...` 체크아웃 링크가 302로 `polar.sh` 메인 리다이렉트되는 것을 확인, Polar API(`/v1/products`, `/v1/checkouts`)로 상품 자체는 정상(미보관) 상태이고 체크아웃 링크만 만료된 것이 원인임을 검증
- 정적 링크 상수를 product ID 상수로 교체하고, 기존에 다른 곳에 이미 구현돼 있던 `/api/polar/checkout`(매번 새 체크아웃 세션 생성) 방식으로 전환 — 재발 방지: 만료 가능한 "체크아웃 링크 ID" 대신 안정적인 "상품 ID" 사용
- `BillingPlansClient`에 `userEmail` prop 추가, `billing/page.tsx`에서 전달

**결제 버튼 새 탭 오픈 (`billing-plans-client.tsx`)**
- 클릭 즉시 `window.open("", "_blank")`로 빈 탭을 먼저 열고, 체크아웃 URL 발급 후 해당 탭의 `location`을 갱신하는 방식 적용 — fetch 완료 후 `window.open`을 호출하면 사용자 제스처가 소실돼 Safari 등에서 팝업이 차단되는 문제 방지

**환불정책 추가 (`legal-modal.tsx`, `footer.tsx`)**
- 이용약관(`TERMS_SECTIONS`)에 "환불 정책" 조항 신규 추가(구독 취소/환불/문의)
- 처음에 `/refund` 독립 페이지(한국어+영문 병기)로 구현했다가, "페이지 스크롤 대신 이용약관처럼 모달로" 피드백에 따라 독립 페이지·sitemap 항목을 제거하고 `LegalModal`에 `refund` 타입을 추가해 푸터 버튼이 기존 이용약관/개인정보처리방침과 동일한 모달(`no-scrollbar` 처리 재사용)로 열리도록 전환

**Polar 결제 연동 보류 → 안내 모달로 전환 (`billing-plans-client.tsx`)**
- Polar.sh 측에서 조직(UNFOLD LAB) 결제 활성화를 거부해 결제사 교체를 검토해야 하는 상황 발생
- 월간/연간 결제 버튼 클릭 시 `/api/polar/checkout` 연동 대신 "결제 준비 중" 안내 모달(마이페이지 문의 유도) 표시로 임시 전환
- 기존 `handleCheckout`(Polar 체크아웃 로직)은 삭제하지 않고 전체 주석 처리해 결제사 확정 후 재활성화 가능하도록 보존

**빌드 검증**: 매 단계 `pnpm build` 성공, 에러 0건.

---

## 2026-07-04 · 세션 78

### 랜딩 카드 배경 밝기 조정, 종목 스냅샷 기업소개/빈카드 UX 개선, 수집 대상 확장(TOP30·거래량·섹터) + 뱃지 표시, 자동 수집 트리거, 캐시 전략 조사

**랜딩 페이지 카드 배경 밝기 조정 (`src/app/globals.css`)**
- `--card` 토큰 `hsl(0 0% 7%)`(`#111111`) → `hsl(0 0% 9%)`(`#171717`)로 상향
- `--muted`(10%, `#1a1a1a`)와 값을 동일하게 맞추면 카드 위 `hover:bg-muted/30` 호버·FAQ 아코디언 호버·아이콘 박스가 배경과 구분이 안 되는 부작용이 있어, 9%로 절충해 밝기 개선과 기존 UI 구분을 동시에 확보
- `bg-card` 클래스 사용처를 전수 확인한 결과 전부 랜딩/로그인 관련 파일뿐이라(대시보드는 HEX 직접 사용) 토큰 하나만 바꿔도 대시보드에 영향 없음 확인

**종목 스냅샷 — 기업소개 상시 노출 + 빈 카드 UX 개선 (`stock-brief.tsx`, `stocks/[symbol]/page.tsx`, `snapshot-filings.tsx`, `snapshot-news.tsx`, `earnings-flow.tsx`)**
- "기업 한눈에"(description_kr+로고)가 Pro 전용 BRIEF 박스 안에 중첩돼 있어 무료 유저가 Pro 전용으로 오인할 수 있는 구조 확인 → `CompanyGlanceCard`로 독립 컴포넌트 분리, `StockBrief`와 무관하게 항상 렌더링되도록 변경
- 공시·뉴스 빈 카드 문구를 "이 종목의 최근 공시/뉴스가 없습니다. 변화 발생 시 확인하려면 와치리스트에 추가해 보세요."로 교체, `WatchlistAddButton` 재사용(이미 등록됨/비로그인 시 미표시)
- 실적 흐름(`earnings-flow.tsx`) 빈 문구를 "이 종목의 실적 데이터가 없습니다."로 수정 — 요청에는 `key-metrics.tsx`로 명시됐으나 실제 "실적 흐름" 섹션·문구는 `earnings-flow.tsx`에 있어 확인 후 정정 적용

**수집 대상 확장 — TOP30 + 거래량 상위 + 섹터별 시가총액 상위 (`src/lib/collect/target-tickers.ts` 신규/확장, `insider.ts`)**
- `getCollectTargetTickers()` 신규 유틸 도입 시 `filings.ts`/`news.ts`는 애초에 티커 필터 없이 전체 상장사를 수집 중임을 확인 → 실제 티커 풀 기반 수집은 `insider.ts`(와치리스트+최근 7일 공시 종목, 기존 10건 상한)뿐이라 사용자 확인 후 `insider.ts`만 대상 확장, `.slice(0, 10)` 상한 제거(TOP30 포함 시 잘려나가는 문제 방지)
- `getTargetTickerSets()`로 재작성 — 와치리스트/TOP30(top30_daily 최근일)/거래량 상위 20(`stock_prices.volume` 최근 1일)/섹터별 시가총액 상위 3(`tickers.sector`+`market_cap`, PostgREST 1000행 제한 우회 range 페이지네이션 포함)을 각각 Set으로 반환하도록 확장, `getCollectTargetTickers()`는 4개 Set 합집합으로 변경

**종목 노출 시 뱃지 표시 (`ticker-badge.tsx` 신규, `snapshot-header.tsx`, `watchlist-card.tsx`, `filing-feed-card.tsx`, `news-feed-card.tsx` + 각 페이지)**
- `getBadgeReasons(ticker, sets)` 헬퍼로 TOP30 선정(오렌지 `#f97316`)/거래량 상위(노랑 `#fbbf24`)/섹터 주목(보라 `#a78bfa`) 판정, 중복 해당 시 모두 표시
- 종목 스냅샷 헤더, 와치리스트 카드, 공시 피드 카드, 뉴스 피드 카드 4곳에 적용 — 각 페이지에서 `getTargetTickerSets()`를 기존 병렬 쿼리에 추가해 페이지당 1회만 조회 후 종목별 매핑

**종목 스냅샷 자동 수집 트리거 (`snapshot-collect-modal.tsx` 신규, `snapshot-status/route.ts` 신규, `collect-ticker.ts`, `log-run.ts`)**
- 종목 스냅샷 접속 시 최근 30일 공시·뉴스·내부자거래가 모두 0건이면 첫 방문으로 간주, `after()`로 `collectTickerFull()`(공시+뉴스+내부자거래 통합 수집) 백그라운드 트리거
- `collect_runs` 테이블(관리자 트리거와 동일 인프라)에 `job_type: "ticker-collect:{ticker}"`로 기록, `findRecentRun()`으로 동일 종목 1시간 이내 중복 트리거 방지(진행 중 실행은 재사용, 완료된 실행은 재트리거 없이 모달도 생략)
- 클라이언트 모달: 스피너 + "데이터 수집 중" 안내, 3초 간격 폴링(`/api/collect/snapshot-status`)으로 상태 확인 후 자동 닫힘+`router.refresh()`, 60초 타임아웃 및 수동 닫기 버튼

**사이트 전체 revalidateTag 캐싱 도입 요청 — 조사 후 보류 결정**
- 요청 대상 9개 페이지 전수 확인 결과 전부 `export const dynamic = "force-dynamic"` + Supabase 직접 쿼리 구조. Next.js 16은 fetch 캐시가 기본 비활성(옵트인)이라 이미 매 요청마다 최신 데이터를 조회 중 — "캐시가 오래된 데이터를 보여주는" 문제 자체가 없음을 확인
- `revalidateTag()`는 무효화할 캐시가 있어야 의미가 있는데 현재 캐시가 아예 없어 적용 대상이 없고, 억지로 `unstable_cache()` 레이어를 새로 추가하면 태그 무효화 누락 시 지금 없던 지연/오류가 새로 생길 위험이 있어 사용자 확인 후 작업 보류(코드 변경 없음)

**빌드 검증**: 매 단계 `pnpm build` 성공, 에러 0건.

---

## 2026-07-04 · 세션 77

### 종목 스냅샷 BRIEF 노출 정책 개편, 뉴스 티커 필터, 카드 UI 정리, 배당 데이터 파이프라인 사고 진단, 미국 공휴일 유틸

**종목 스냅샷 BRIEF — Pro 전면 노출 + Free blur 잠금 UI (`stock-brief.tsx`, `stocks/[symbol]/page.tsx`, `snapshot-header.tsx`, `watchlist-add-button.tsx` 신규, `brief.ts`)**
- Pro 유저는 와치리스트 등록 여부와 무관하게 BRIEF 전체 열람 가능하도록 정책 변경, BRIEF 미생성 종목은 스냅샷 조회 시 `after()`로 백그라운드 즉시 생성 트리거
- `runStockBriefCollect()`의 `isTickerInProWatchlist` 게이트를 `trigger_reason === "snapshot_view"`일 때만 우회하도록 수정(다른 트리거는 기존 비용 통제 유지)
- Free 유저 잠금 UI를 텍스트 안내 → blur(4px) 처리된 더미 콘텐츠 + 중앙 오버레이 잠금 카드(`IconLock` `#60a5fa` + Pro 업그레이드 버튼) 방식으로 3차례 반복 개편
- 종목명 옆 "＋ 종목 추가" 버튼 신규(`watchlist-add-button.tsx`) — 등록됨/한도초과(Free 5·Pro 30)/추가 3가지 상태 처리, `SnapshotHeader`에 결합

**뉴스 피드 종목 필터 (`snapshot-news.tsx`, `news/page.tsx`, `news-filter-bar.tsx`, `feed-pagination.tsx`, `news-ticker-empty-notice.tsx` 신규)**
- 종목 스냅샷 "뉴스 피드 보기" 클릭 시 `/news?ticker={symbol}`로 이동해 해당 종목 뉴스만 필터링
- 필터 결과 0건이면 토스트 안내 후 2.5초 뒤 `router.replace("/news")`로 전체 피드 자동 전환, 필터 탭에 종목 배지(✕로 해제) 표시, 페이지네이션에 `ticker` 파라미터 유지

**카드 하단 안내 문구 📌 표시 — 위치 시행착오 및 최종 정리 (`dashboard-disclaimer.tsx`, `footer.tsx`, `insights/data-sources.tsx`, 기타 출처 표기 8개 파일)**
- 1차: 면책 문구 3줄·BRIEF 안내·데이터 출처·EPS/내부자거래 출처 등 전체에 📌 부착
- 2차 피드백: 데이터 출처 카드 설명문에서 📌 제거 → "마지막 업데이트" 앞으로 이동
- "면책 카드와 데이터 카드가 붙어 하나처럼 보인다"는 피드백 → 조사 결과 실제 중복 렌더링은 없고 두 카드 배경색(`#1a1a1a`)이 동일해 생긴 시각적 문제로 확인, 면책 카드 배경을 `#111827`(블루 톤)로 분리
- 최종 피드백으로 면책 카드 📌도 완전 제거, 랜딩 푸터(`footer.tsx`) 면책 3줄도 동일하게 제거
- `insights/ui.tsx`의 `SectionCard`를 `flex flex-col`(+본문 `flex-1 flex-col`)로 변경해 `h-full`로 늘어난 카드의 남는 여백 문제 해결, `snapshot-insider.tsx` 출처 문구를 `mt-auto`로 하단 고정(기업정보 카드와 높이를 맞췄을 때 생기던 하단 공백 제거)

**마이페이지 알림 카드 제거 (`mypage/page.tsx`)**
- "알림 설정" `SectionCard` 섹션 전체 삭제(사용하지 않는 `IconBell`/`IconLock` import 정리), 세로 스택 레이아웃이라 다른 카드 영향 없음

**배당 일정 데이터 파이프라인 사고 진단 (`supabase/fix_dividends_table.sql` 신규)**
- 실적 캘린더 "배당 일정" 탭 조회 안 되는 문제 조사 — UI 쿼리 코드는 정상이었고, `dividends` 테이블이 `scripts/seed-dividends.ts`(로컬 1회성 스크립트)로만 생성되어 `supabase/schema.sql`에 등록된 다른 테이블과 달리 GRANT/RLS/FK 설정이 누락된 것이 원인으로 확인(`permission denied` + `Could not find a relationship between 'dividends' and 'tickers'`)
- 서비스 롤 키로 직접 REST 조회해 전체 13,684행 존재·고아 티커 0건 확인 후 안전하게 FK 추가 가능함을 검증, 수정 SQL은 사용자가 Supabase SQL Editor에서 직접 실행 필요 (DB 직접 실행 권한 없음)
- 재발 방지를 위해 CLAUDE.md 10항에 "새 테이블 생성 시 schema.sql 등록+authenticated GRANT+service_role GRANT+RLS 정책 4종 필수, 누락 시 커밋 금지" 17번 규칙 추가

**미국 연방 공휴일 유틸 신규 (`src/lib/us-holidays.ts`)**
- 연방 공휴일 11개(요일 기반 6개는 `nthWeekdayOfMonth`로 매년 자동 계산) 정의, `isUsHoliday`/`isUsMarketClosed`/`getMarketStatusMessage`로 공시 피드(`dashboard/page.tsx`) 상단에 공휴일·주말 안내 배너 노출
- 후속 요청으로 관측일(Observed Holiday) 로직 추가 — 토요일 공휴일→전날 금요일, 일요일→다음날 월요일로 휴장 판단을 관측일 기준으로 전환, `getObservedHolidays`/`isMarketOpen`/`nextTradingDay` 추가, 뉴이어가 토요일과 겹쳐 관측일이 전년도 12/31로 넘어가는 연도 경계 케이스까지 `npx tsx`로 직접 실행 검증

**랜딩 푸터 브랜드 소개 문구 추가 (`footer.tsx`)**
- "언폴드랩(UNFOLD LAB)" 옆에 "| 데이터 기반 SaaS 인디 개발 스튜디오" 인라인 추가, 요청받은 HEX 색상은 랜딩 HSL 토큰 규칙에 따라 동일 값의 `text-muted-foreground`로 대체 적용

**빌드 검증**: 매 단계 `pnpm build` 성공, 에러 0건.

---

## 2026-07-03 · 세션 76

### 와치리스트 주간/월간 BRIEF 신규 기능 — 실시간 계산 → 캐시 전환, 어코디언 UI 개편

**주간/월간 BRIEF 실시간 계산 (1단계) — `src/lib/watchlist-brief.ts` 신규, `brief-sections.tsx` 신규, `watchlist/page.tsx`**
- 워치리스트 페이지에 최근 7일/30일 기업동향·시장변화·섹터동향·공시·실적·경제지표를 집계해 Haiku로 요약하는 BRIEF 섹션 신규 추가
- 공유 UI 프리미티브(`BriefCard`, `BriefCompanyList`, `BriefChangeBadges`, `BriefSectorList`, `BriefFilingList`, `BriefEarningsList`, `BriefMacroList`, `BriefTagLeaders`, `BriefSummaryText` 등) `brief-sections.tsx`에 정리
- 작업 중 `top30_daily`/`price_targets` RLS 갭 발견(institutional_holdings와 동일 유형) — `supabase/add_top30_price_targets_rls.sql` 제공

**캐시 기반 전환 (2단계) — `collect/weekly-brief.ts`, `collect/monthly-brief.ts` 신규**
- CLAUDE.md 17항 서비스 계층 분리 원칙에 따라 집계+Haiku 요약+upsert 로직을 `src/lib/collect/weekly-brief.ts`/`monthly-brief.ts`로 이동, `watchlist-brief.ts`는 캐시 읽기 함수(`getLatestWeeklyBrief`/`getLatestMonthlyBrief`)만 담당하도록 재편
- `api/collect/weekly-brief`, `monthly-brief` thin wrapper 라우트 신규, `vercel.json` Cron 등록(매주 월 00:00 UTC / 매월 1일 00:00 UTC), `admin/run` COLLECT_MAP·`collect/types` COLLECT_JOBS 등록, `admin/system/trigger`에 수동 트리거 버튼 2개 추가
- `weekly_briefs`/`monthly_briefs` 캐시 테이블 SQL 제공(`supabase/create_brief_cache_tables.sql`) — 사용자가 Supabase에서 직접 실행

**Supabase 타입 재생성 및 권한 문제 트러블슈팅**
- `pnpm gen:types` 실행 후 `weekly_briefs`/`monthly_briefs` 타입 반영 확인, 첫 줄 `export type Json =` 확인 후 커밋
- 실제 트리거 실행 시 "permission denied for table weekly_briefs"(service_role GRANT 누락), "Could not find the table 'public.monthly_briefs'"(PostgREST 스키마 캐시 미갱신) 두 가지 에러 발생 → `supabase/fix_brief_cache_tables.sql` 신규 제공(`GRANT ALL ... TO service_role`, RLS 정책 재생성, `NOTIFY pgrst, 'reload schema'`) — 실행 후 양쪽 정상 완료 확인

**주간/월간 BRIEF UI 개편 — 어코디언 + 색상 차별화 + 2열 그리드**
- `src/components/dashboard/brief-accordion.tsx` 신규 — `BriefAccordion` 클라이언트 컴포넌트. 기본 접힘, 헤더 클릭 시 펼침, 우측 `IconChevronDown` 회전 아이콘, 타이틀 옆 기간 배지 표시
- 내부 개별 섹션(①②③...)은 요청에 따라 어코디언 없이 그대로 유지(내부까지 어코디언 적용 시 "혼잡해짐" 피드백 반영)
- 주간 BRIEF는 파랑(`#60a5fa`, `bg-blue-500/[0.05]`), 월간 BRIEF는 보라(`#a78bfa`, `bg-purple-500/[0.05]`)로 타이틀·배지·섹터/태그리더 진행바 색상 차별화
- "TOP10/20 기업동향"+"시장 변화", "신규 진입 기업"+"섹터 동향"(월간은 "가장 많이 관측된 변화"+"경제지표" 추가)을 `md:grid-cols-2` 2열 배치, `BriefChangeBadges` 그리드를 6열→3열로 조정해 半폭에 맞춤
- 캐시 없을 때 문구를 "데이터 준비 중입니다."(서비스 미완성으로 오인될 수 있음) → 주간 "매주 월요일 업데이트됩니다.", 월간 "매월 1일 업데이트됩니다."로 수정

**빌드 검증**: 매 단계 `pnpm build` 성공, 에러 0건.

---

## 2026-07-02 · 세션 75

### 파비콘/OG 이미지 교체, BRIEF 회계연도 오기재 수정, 종목 스냅샷 BRIEF 대개편, 로그인 모달 해파리 배경

**파비콘·OG 이미지 신규 로고 교체 (`public/*`, `src/app/layout.tsx`)**
- 신규 확정 로고(`TickerFlow_Logo.png`, 투명 배경 화이트 마크) 기반으로 `favicon.ico`(16/32/48 멀티사이즈), `favicon.png`, `icon.png`(512), `icon-192.png`, `apple-touch-icon.png`(180) 전부 네이비(#0d1b2e) 배경으로 재생성. OG 이미지도 동일 배경에 로고 중앙 배치로 교체
- 이미지 생성에 `sharp`/`png-to-ico`를 임시 devDependency로 설치해 사용 후 완전히 원복 (package.json/lockfile 변경 없음)
- `layout.tsx`의 `icons` 메타데이터를 사이즈별 배열로 확장, `apple`을 전용 `apple-touch-icon.png`로 분리

**BRIEF 요약 프롬프트 — 미래 회계연도 오기재 버그 수정 (`src/lib/collect/brief.ts`)**
- 증상: NVDA BRIEF가 "2027 회계연도 1분기 실적에서"를 확정 사실처럼 표기 (2026년 7월 시점 기준 미래처럼 보임)
- 1차 수정: 프롬프트에 오늘 날짜 명시 + "미래 회계연도 확정 표기 금지" 등 5개 지침 추가
- 근본 원인 추가 발견: `earnings_calls.call_date`를 DB에서 조회만 하고 실제 프롬프트 입력에는 누락 — Haiku가 발표 시점을 판단할 근거 자체가 없었음. 실제 `call_date`(2026-05-20)는 오늘 기준 과거라 "미래 표기"가 아니라 NVIDIA 특유의 회계연도 오프셋 표기가 낯설어 보인 것으로 확인
- 2차 수정: `call_date`를 프롬프트 입력에 "발표일 YYYY-MM-DD"로 병기, "X 회계연도 Y분기 실적에서" 대신 "X 회계연도 Y분기에 해당하는 실적에서" 형태로 "해당하는" 수식어 추가 지침
- `stock_briefs`는 ticker당 1회 생성 후 upsert 없이 재사용되는 구조라, 기존 캐시(NVDA 등)는 코드 배포만으로 갱신 안 됨 — row 삭제 후 어드민 "BRIEF 백필" 재실행으로 검증 완료

**종목 스냅샷 52주 위치 인디케이터 (`src/components/dashboard/snapshot/price-card.tsx`)**
- 파란 점(현재가 위치)에 `filing-filter-bar.tsx`와 동일한 CSS-only hover 툴팁 패턴 적용, 모바일은 하단 안내 문구로 대체
- 슬라이더 바에 `aria-label` 추가, `animate-ping`으로 실시간 체크 효과(라이브 pulse) 부여

**종목 스냅샷 BRIEF 섹션 대개편 — 기업 개요 통합 (`tickers` 테이블, `profile.ts`, `summarize.ts`, `stock-brief.tsx`, `company-info.tsx`, `stocks/[symbol]/page.tsx`)**
- `tickers`에 `description`/`description_kr`/`ceo`/`full_time_employees`/`website`/`image`/`ipo_date`/`headquarters`/`market_cap` 컬럼 추가 (SQL 제공, 사용자 직접 실행 후 `pnpm gen:types` 재생성)
- `runProfileCollect()`가 FMP `/stable/profile`도 함께 호출해 신규 필드 수집(`marketCap` 필드명 주의, `fullTimeEmployees` string→int 파싱), 수집 대상 필터를 `sector IS NULL` → `sector IS NULL OR description IS NULL`로 확장
- `summarizeCompanyDescription()` 신규 — Haiku로 기업 개요 200자 내외 한국어 요약 → `description_kr` 저장
- BRIEF 섹션을 "기업 한눈에"(설명+로고, 전체 유저 공통) + 최근 30일 동향(Pro+워치리스트 전용)으로 재구성 — `StockBrief`를 `state: "ready"|"pending"|"gated"` 3분기 단일 컴포넌트로 재작성, Free/미워치리스트 유저는 "Pro 시작하기" 유도 카드 노출
  - 버그: `gated` + `description_kr` 없음 케이스에서 컴포넌트 전체가 렌더링 안 되던 문제 발견 후 즉시 수정 (ProGate가 항상 보이도록)
- BRIEF 섹션 위치를 페이지 상단 → 데이터 출처 섹션 바로 위로 이동
- 기업 정보 카드에 CEO/직원 수/상장일/본사/시가총액(T·B·M 단위)/홈페이지 링크 추가, null 필드 자동 숨김
- `scripts/seed-profiles-full.ts` 신규 — 전체 8,490종목 일괄 백필용 터미널 스크립트 (`npx tsx scripts/seed-profiles-full.ts`), FMP 호출 후 300ms·Haiku 호출 후 200ms 딜레이, 100종목마다 진행률 출력

**로그인 모달 해파리 배경 애니메이션 (`src/components/jellyfish-background.tsx` 신규, `login-modal.tsx`, `login/page.tsx`)**
- Canvas 2D 기반 `JellyfishBackground` 컴포넌트 추가, Navbar `LoginModal`과 `/login` 페이지(비로그인 시 `/dashboard` 리다이렉트 대상 — 별개 컴포넌트라 누락돼 있었음) 양쪽 모두에 적용
- 오버레이 `backdrop-blur-sm`이 뒤 레이어(해파리 캔버스 자체 blur와 중복)를 한 번 더 블러 처리해 해파리가 거의 안 보이던 문제 발견, 오버레이는 `bg-black/40` 틴트만 유지하도록 수정
- 저사양 기기에서 프레임당 blur 필터 부하로 로딩 지연 보고 → 해파리 개수를 뷰포트 기반 5~14마리 → 고정 1마리로 축소
- 로그인 카드가 화면 중앙을 차지해 해파리가 가려지는 문제 → 스폰 x좌표를 전체 랜덤 대신 2/5(40%) 또는 3~4/5(60~80%) 지점 중 하나로 제한

---

## 2026-07-01 · 세션 74

### SEO 메타데이터, TickerFlow Screener 스코어링 재설계, Google 로그인 404 진단, 경제지표 히어로 레이아웃 확장

**SEO 메타데이터 (`src/app/sitemap.ts`, `robots.ts`, `middleware.ts`, `layout.tsx`)**
- `sitemap.ts`/`robots.ts` 신규 생성 — 로그인 필요 경로(`/billing` 등)는 사이트맵 제외, robots.txt에 `PROTECTED_PATHS` 전체 disallow
- 배포 후 `tickerflow.net/sitemap.xml`·`/robots.txt`가 `{"error":"requested path is invalid"}` 404 — 원인: `middleware.ts` matcher가 이 두 정적 메타데이터 라우트까지 매칭해 Vercel 라우팅과 충돌. matcher에 `sitemap.xml|robots.txt` 제외 추가해 해결
- 네이버 서치어드바이저 인증 메타태그(`verification.other`) 추가
- OG 이미지 절대 URL 지정 + `og:type`/`og:url` 추가, `description`/`og:description`/`twitter:description` 통일 후 80자 이내로 축약
- 랜딩 페이지 시맨틱 마크업(h1 1개/h2 평탄 계층/img alt) 전수 점검 — 이상 없음

**TickerFlow Screener 스코어링 전면 재설계 (`src/lib/collect/scoring.ts`, `classify-filings.ts`, `top30.ts`)**
- 가중치 구조를 Smart Money 45% / Earnings Quality 30% / Corporate Events 15% / Market 5% / News Credibility 5%로 전면 교체
- Smart Money: 내부자매수 30일 선형감쇠, 13F 신규편입 건당+5(최대+12 캡), 13F는 분기 스냅샷(감쇠 없음)
- Earnings Quality: EPS/매출 Beat, Guidance up(+10)/down(-5), 4분기연속Beat(+8) 신규, 발표일→다음 발표예정일 선형감쇠(없으면 90일)
- Corporate Events: 뉴스 건수/surge 보너스 완전 제거, FDA승인/대형계약/Buyback/M&A/배당증가/CEO변경/유상증자(-)/SEC조사(-)/파산(-) 카테고리로 교체, 7일 급감 Decay. `classify-filings.ts`에 4개 신규 카테고리(fda_approval/dividend_increase/sec_investigation/bankruptcy) 및 Haiku 프롬프트 설명 추가 — DB CHECK 제약 SQL 별도 제공(사용자 직접 실행)
- Market/News Credibility: 데이터 신선도·출처 신뢰도 티어 기반 재계산, News는 최대 +5 캡
- 섹터 다양성 보정 세분화(1-3위 100%/4위 95%/5위 90%/6위 80%/7위+ 70%), `finalScore<0` 종목 Top30 제외
- Discovery Bonus: `tickers.market_cap` 컬럼 없어 TODO로 스킵

**어드민 홈 TickerFlow Screener 성능·UI (`src/app/admin/page.tsx`, `top30.ts`, `vercel.json`)**
- 접속마다 `computeScores()`로 10개 테이블 실시간 재계산 → `top30_daily`(date=오늘) 캐시 조회로 전환, 딜레이 없이 즉시 렌더링. 오늘 데이터 없으면 안내 문구 표시
- 종목 카드: 티커/회사명에 `/stocks/[ticker]` 링크(새 탭) 추가, 타이틀 색상 white로 변경, 부제 한글 요약, 카드 하단 텍스트 밝기 상향(`#a6a6a6`→`#d4d4d4`, `#a6a6a6/60`→`#999999`)
- 수집 시각 배지 신규(`[ KST HH:MM, YYYY.MM.DD | UTC HH:MM ]`) — `top30_daily.updated_at` 컬럼 추가(SQL 제공) 후 `pnpm gen:types` 재생성해 반영
- TOP30 계산 Cron을 21:00 UTC(KST 06:00) → 13:35 UTC(KST 22:35, 미국 개장 직후)로 변경
- 트리거 페이지 버튼명 "TOP30 선정" → "티커플로우 스크리너 TOP30"로 변경, 오렌지 강조 색상 적용, Cron 안내 테이블 스케줄 표기 동기화

**Google 로그인 404 진단 (코드 변경 없음)**
- 증상: Google 로그인 시 `tickerflow.net/auth/v1/callback`에서 Next.js 404
- 원인 확정: Supabase Auth Custom Domain을 apex 도메인(`tickerflow.net`)으로 설정 — 이 도메인은 이미 DNS가 Vercel(`76.76.21.21`)을 가리키고 있어 Supabase Custom Domain은 대시보드상 "Active"로 표시돼도 실제로 트래픽을 받을 수 없는 상태였음. Supabase의 `/auth/v1/authorize` 호출이 Google에 `redirect_uri=tickerflow.net/auth/v1/callback`을 지시 → DNS가 Vercel로 보냄 → Next.js에 해당 라우트 없어 404
- 해결: Supabase 대시보드에서 Custom Domain 삭제 → Callback URL이 기본값(`bjyceygtamogiikjedlu.supabase.co/auth/v1/callback`)으로 자동 복귀, 로그인 정상화 확인
- 브랜딩(Google 계정 선택 화면에 tickerflow 도메인 노출) 재도입 시 apex 대신 `auth.tickerflow.net` 서브도메인으로 재설정 필요 — 다음 작업으로 보류

**경제지표 히어로 레이아웃 확장 (`src/components/macro/macro-board.tsx`)**
- 금리 그룹(기준금리)에만 하드코딩돼 있던 "핵심 지표 크게 표시" 레이아웃을 `FEATURED_BY_GROUP` 맵으로 일반화 — 물가(CPI)/고용(실업률)/경기(GDP) 그룹에도 동일 적용
- 어느 탭에서 봐도(전체/개별 그룹) 그룹별로 독립적으로 히어로 레이아웃 적용되도록 탭 분기 로직 제거·단순화

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

