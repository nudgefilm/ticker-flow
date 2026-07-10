# TickerFlow — 개발 작업 기록

> 아카이브:
> - [세션 1–30](docs/worklog-archive/sessions-01-30.md)
> - [세션 31–60](docs/worklog-archive/sessions-31-60.md)

---

## 2026-07-11 · 세션 97

### TOP10/TOP30 순위 노출 전수 점검 — BRIEF 포함 공개/사용자 화면 대상 규제 리스크 조치

**배경**: TickerFlow TOP10/TOP30 스코어링(스마트머니 45%+실적품질 30%+기업이벤트
15%+시장활동 5%+뉴스신뢰도 5%)은 "성장 유망주를 찾아내는" 종합 평가·선정
로직. 어드민 내부 도구로 쓰는 것은 문제없으나, 그 결과를 "N위/TOP10/TOP30
진입" 형태로 공개·사용자 화면(블로그, BRIEF, 이메일 다이제스트 등)에 발행하는
것은 자본시장법 제101조 유사투자자문업의 "가치에 관한 조언"에 해당할 소지가
있음. 금융위원회 법령해석 요청(고유번호 7909)의 사실관계에 이 기능이
포함되어 있지 않아, 회신과 무관하게 즉시 자체 점검 필요.

**점검 결과 — 전체 발견 위치(어드민 제외)**
1. `src/app/page.tsx` + `src/components/landing-top10.tsx` — 랜딩(비로그인
   공개) "오늘의 기업 동향 TOP10" 섹션, "N위" 배지. **조치 완료(팩트 카운트
   기반 "최근 7일 활동이 많았던 기업"으로 재설계)**
2. `src/lib/collect/blog-draft.ts` — 블로그 생성 프롬프트 내부 데이터
   라벨·예시문에 "TOP10/TOP30/N위" 노출. **조치 완료**
3. `src/lib/email/templates.ts`의 `dailyDigestEmail()` — Pro+가입7일이내
   Free 전원에게 매일 발송 중인 활성 이메일. "TOP30 N건", "기업동향 TOP10",
   "N위" 배지, "TOP30 신규 진입", "N위→M위", "TOP30 이탈" 전면 노출. **조치
   완료(팩트 카운트 기반으로 재설계)**
4. `src/app/(dashboard)/alerts/page.tsx` — 위 이메일 기능을 "TOP10" 문구로
   설명(로그인 화면이나 이메일과 동급 취급 지시에 따라 조치 대상). **조치
   완료**
5. `src/components/dashboard/weekly-brief.tsx`, `monthly-brief.tsx`,
   `brief-sections.tsx` + `src/lib/watchlist-brief.ts`,
   `src/lib/collect/weekly-brief.ts`, `monthly-brief.ts` — Pro 게이팅된
   /watchlist 화면. "이번 주 기업동향 TOP10", "이번 달 기업동향 TOP20",
   "TOP30에 진입한 기업", "N위→M위" 순위 변화, "TOP30 이탈". **조치 완료
   (팩트 카운트 기반으로 재설계)**
6. `src/components/dashboard/ticker-badge.tsx` + `src/lib/collect/target-tickers.ts`
   — 와치리스트 카드 "TOP30 선정" 배지(`getBadgeReasons`). **조치 완료(배지
   자체 제거, volume/sector 배지는 유지 — 단일 객관 지표라 스코어링 결과가
   아님)**
7. `src/lib/notify/telegram.ts`의 `sendTelegramTop10`/`runTelegramNotify` —
   "오늘의 기업 동향 TOP10"을 텔레그램으로 발송하는 함수. `COLLECT_MAP`/
   `vercel.json` cron 어디에도 연결되지 않아 **현재 비활성(dead code)**이지만,
   재활성화 시 리스크를 남기지 않기 위해 **조치 완료(동일한 팩트 카운트
   기반으로 함께 정리)**.

**문제 없음으로 확인(스코어링 미사용 또는 순위 비노출)**
- `/watchlist`의 `TrendingCarousel`(`TrendingContent`) — 최근 7일 공시+뉴스
  건수 단순 합산 상위 10개일 뿐 TickerFlow 가중치 스코어링과 무관, 화면에
  순위 번호나 "TOP" 라벨 미노출.
- `src/components/recent-changes.tsx`(랜딩 "최근 7일 주요 변화") — 최신순
  정렬, 스코어링 미사용.
- `src/components/dashboard/snapshot/stock-brief.tsx` + `src/lib/collect/brief.ts`
  (종목별 BRIEF) — 순위/TOP 언급 없음.
- `src/lib/notify/telegram-digest.ts` — 리스트 번호는 순번일 뿐 스코어링
  순위 아님.

**조치 완료 (즉시 교체 가능, 구조 변경 없음)**
- `src/lib/collect/blog-draft.ts`: `BANNED_BLOCK`에 "TOP10/TOP30/N위/순위/
  랭킹/선정/진입" 추가, 프롬프트 데이터 라벨 4곳("[기업동향 TOP10]" 등)과
  "N위" 접두사 전부 제거, `ARTICLE_STRUCTURE_GUIDE` 예시문 3곳의 "TOP30"
  표현 교체, `FIXED_CATEGORIES`의 "TOP30 변동"→"관측 종목 변동", `FOOTER_RULES`
  자가검증 항목 추가.
- `src/components/dashboard/ticker-badge.tsx`, `src/lib/collect/target-tickers.ts`:
  `TickerBadgeReason`에서 `"top30"` 제거(volume/sector는 유지). 내부
  수집 대상 확장용 `TargetTickerSets.top30` Set 자체는 그대로 둠(사용자
  노출 배지에서만 뺐음).
- `src/app/(dashboard)/alerts/page.tsx`: "TOP10"/"포착" 문구를 사실 나열형
  문구로 교체.

**구조 재설계 완료 (사용자 확인: "팩트 카운트로 재구성" 선택)**
- `dailyDigestEmail()`(이메일), 주간/월간 BRIEF(`weekly-brief.tsx`/
  `monthly-brief.tsx`/`brief-sections.tsx`/`watchlist-brief.ts`), 랜딩
  `LandingTop10` — "상위 N개를 뽑아 순위·배지로 보여주는" 포맷 자체를
  top30_daily(스코어링) 의존에서 완전히 분리해, 공시+뉴스+내부자매수
  "건수" 기반으로 재설계.
  - `src/lib/watchlist-brief.ts`: `fetchTopCompanies`/`fetchPeriodComparison`/
    `fetchTagLeaders`를 top30_daily 참조 없이 새 헬퍼
    `fetchActivityCountsAndFacts()`(filings+news+insider_trades 건수 집계,
    `filings.event_type` 기반 `EVENT_TYPE_KR` 사실 라벨) 기반으로 재작성.
    `BriefCompany.avgScore`→`activityCount`, `RankMoverItem`→
    `ActivityMoverItem`(prevRank/currRank→prevCount/currCount)로 교체.
    `computeRange()`를 UTC 자정 정렬로 수정(기존엔 "지금 이 순간" 기준이라
    `days=1`일 때 사실상 오늘 데이터를 못 가져오는 버그가 있었음 — 신규
    daily 사용처 추가하며 발견·수정).
  - `src/lib/collect/digest.ts`: `gatherDigestData()`를 top30_daily 조회
    전면 제거, `computeRange(1)` + 위 재작성된 함수로 교체. 블로그 초안용
    내부자매수/실적상회 목록(`Top30TagItem.tags` 의존)은 `insider_trades`/
    `earnings` 원본 테이블에서 직접 계산하는 `insiderBuyToday`/
    `earningsBeatToday`로 교체.
  - `src/lib/email/templates.ts`: `DigestData` 관련 타입 전체 교체
    (`DigestTopItem.rank`→`activityCount`, `RankMoverItem`→
    `ActivityMoverItem`, `Top30TagItem`→`InsiderBuyItem`/`EarningsBeatItem`).
    `dailyDigestEmail()`의 "TOP30 N건"/"기업동향 TOP10"/"N위" 배지/"TOP30
    신규 진입"/"N위→M위"/"TOP30 이탈"을 전부 활동 건수 기반 표현으로 교체.
  - `src/components/dashboard/brief-sections.tsx`,`weekly-brief.tsx`,
    `monthly-brief.tsx`: 순위 인덱스(1,2,3...) 배지 → 실제 활동 건수 배지,
    섹션 제목의 "TOP10/TOP20/TOP30 진입/이탈" 전부 제거.
  - `src/components/landing-top10.tsx`: "오늘의 기업 동향 TOP10"(당일
    top30_daily rank≤10) → "최근 7일 활동이 많았던 기업"(`fetchTopCompanies`,
    7일 범위)로 교체.
  - `src/lib/notify/telegram.ts`(비활성 dead code): 동일 원칙으로 함께
    정리(재활성화 대비).
  - `src/lib/collect/blog-draft.ts`: `Top30TagItem`/`filterByTags` 의존 제거,
    `pickRelatedTopics()`를 새 필드(`insiderBuyToday`/`earningsBeatToday`)
    + description 문자열 매칭 기반으로 재작성.
  - `tsc --noEmit` 통과 확인.

**향후 금융위 법령해석 요청 보완 판단 자료** — 위 1~7번 발견 기능 목록(어드민
제외)을 그대로 자료로 남김. 고유번호 7909 사실관계에 TOP10/TOP30/BRIEF/이메일
다이제스트 기능이 포함되어 있지 않으므로, 보완 제출 여부는 별도 판단 필요.

## 2026-07-11 · 세션 96

### CLAUDE.md에 모델 전환 권장 기준 추가

**`CLAUDE.md` 수정**
- 배경: 설계 난이도를 사용자가 작업 착수 전에 미리 파악하기 어려운 경우가
  있어, 특정 조건에 해당하면 코드 수정 전에 먼저 Opus 모델 전환을 권장하고
  승인받도록 규칙화.
- "10. Claude Code 작업 규칙" 섹션 18번으로 신규 추가(기존 1~17번은 삭제·
  순서변경 없이 그대로 유지). 스코어링/알고리즘 재설계, 여러 테이블 걸친
  마이그레이션·대량 DELETE/UPDATE, 결제·정산·세무 계산 로직, 인증/권한 구조
  변경, 롤백 경로 불명확한 대규모 리팩터링 — 이 5가지 중 하나라도 해당하면
  작업 시작 전 사용자에게 먼저 알리고 승인받아야 함(Sonnet 유지 선택도 가능,
  단 권장 사실은 항상 먼저 고지).

## 2026-07-11 · 세션 95

### top30_daily도 delete-then-insert로 전환 — 탈락 종목 잔존 행 누적 문제 해결 (top30_entries와 동일 패턴 적용)

**`supabase/top30-entries-outcomes.sql` 수정**
- 배경: 세션94에서 `top30_entries`의 같은 날 재실행 UNIQUE 위반을
  delete-then-insert로 고친 뒤 실제 프로덕션에서 2회 연속 실행 검증을
  하던 중, `top30_daily`가 오늘자 43행(정상 30행 초과)으로 오염된 것을
  발견. 원인은 `top30_daily`의 `ON CONFLICT (date, ticker) DO UPDATE`가
  "이번 실행에 있는" 종목만 갱신하고 "이번 실행에서 탈락한" 종목의 행은
  지우지 않기 때문 — 세션93 자격 필터를 배포한 뒤에도, 배포 이전 13:35 UTC
  정기 실행분(CUEN 등 필터 대상 13개 포함)이 그대로 남아 뒤섞여 있었음.
- `upsert_top30_with_entries()` 함수 맨 앞, `top30_daily` INSERT 루프 이전에
  `DELETE FROM top30_daily WHERE date = 오늘(p_rows 첫 행의 date)`을 추가하고,
  이미 계산해둔 오늘 날짜(`v_today`)를 이어서 `top30_entries` DELETE에도
  재사용하도록 정리. `top30_daily`/`top30_entries` DELETE·INSERT가 모두 같은
  함수(=같은 트랜잭션) 안에서 처리되어 별도 트랜잭션으로 쪼개지지 않음.
- 배포 방식: 이번에도 자동 마이그레이션 러너가 없어 Supabase SQL Editor에서
  직접 `CREATE OR REPLACE FUNCTION` 실행 필요 — 사용자 확인 후 반영.
- 기존 오염된 43행은 별도 정리 SQL 없이도, 이 함수가 배포된 뒤 다음
  스케줄/수동 실행이 한 번만 돌면 해당 실행이 오늘자 기존 행을 전부 지우고
  이번 실행 결과로만 다시 채우므로 자동으로 정리됨(1회성 DELETE 스크립트
  불필요).

## 2026-07-11 · 세션 94

### top30_entries 같은 날 재실행 시 unique constraint 충돌 수정 (delete-then-insert 방식 전환)

**`supabase/top30-entries-outcomes.sql`, `CLAUDE.md` 수정**
- 배경: 스크리너를 같은 날 여러 번 수동 재실행하면 `duplicate key value
  violates unique constraint "top30_entries_ticker_selected_date_key"` 오류
  발생. 저장 로직 위치 확인 결과 `src/lib/collect/top30.ts`(TS)는
  `top30_daily`/`top30_entries`를 단일 트랜잭션으로 묶기 위해 Postgres RPC
  `upsert_top30_with_entries()`(`supabase/top30-entries-outcomes.sql`)를
  호출하는 구조. `top30_daily`는 `ON CONFLICT (date, ticker) DO UPDATE`로
  이미 재실행에 안전하지만, `top30_entries`는 조건 없는 단순 INSERT였음 —
  같은 날 재실행 시 "어제 top30_daily에 없던 신규 진입 종목"을 다시 계산해도
  대상 집합이 동일해 같은 (ticker, selected_date) 쌍을 또 INSERT하려다 UNIQUE
  제약을 위반.
- `upsert_top30_with_entries()` 함수 내부에서 entries INSERT 루프 직전에
  `p_rows`의 첫 행 date(=오늘)를 기준으로 `DELETE FROM top30_entries WHERE
  selected_date = 오늘`을 먼저 실행하도록 수정(delete-then-insert). 함수
  전체가 단일 트랜잭션이라 DELETE 이후 INSERT가 실패해도 부분 삭제 상태로
  남지 않음. `top30_outcome_results`는 `entry_id` FK `ON DELETE CASCADE`로
  함께 정리되지만, 삭제되는 행은 같은 트랜잭션에서 막 만들어진 당일 pending
  행(실제 성과 데이터 없음)뿐이라 데이터 손실 없음.
- CLAUDE.md 18항의 `top30_entries` "불변 원칙"에 새 좁은 예외로 추가 기록 —
  DELETE 대상이 오늘 날짜로 한정되어 과거 확정 기록은 절대 건드리지 않으므로
  불변 원칙과 충돌하지 않음(기존 entry_price 백필 예외와 동일한 논리).
- 배포 방식: 이 리포에는 자동 마이그레이션 러너가 없어(다른 schema.sql류와
  동일하게 "Supabase SQL Editor에서 실행" 관례), 이 함수를 실제 프로덕션에
  반영하려면 `supabase/top30-entries-outcomes.sql`의
  `CREATE OR REPLACE FUNCTION public.upsert_top30_with_entries` 블록을
  Supabase SQL Editor에서 직접 실행해야 함 — 아직 미실행 상태.
- 실제 2회 연속 실행 테스트는 위 SQL을 프로덕션에 적용한 뒤
  `/api/admin/run?job=top30`(CRON_SECRET 인증)을 두 번 호출해 검증 예정 —
  다음 작업 예정 참고.

### 다음 작업 예정
- `top30-entries-outcomes.sql`의 `upsert_top30_with_entries()` 갱신본을
  Supabase SQL Editor에서 실행(사용자 확인 필요) → 이후 같은 날 2회 연속
  `top30` 잡 실행으로 무오류·정합성 확인.

## 2026-07-11 · 세션 93

### 어드민 내부용 TOP30 스코어링에 자격 필터(최소주가/시총/거래소) 추가 — 저가·마이크로캡·OTC 종목의 스마트머니 점수 편향 방지

**`src/lib/collect/scoring.ts` 수정**
- 배경: "티커플로우 스크리너(TickerFlow Screener)" 화면(`src/app/admin/page.tsx`,
  524행 안내)의 TOP30 선정 로직에서 CUEN(종가 $0.48, 시가총액 약 $98만)이
  소액 내부자 매수만으로 스마트머니 점수가 올라 TOP30 1위로 진입하는 현상을
  확인. 실제 라이브 데이터로 재현한 결과 CUEN 외에도 DLHC·SNSE·RCG·COE·CRT·
  EPSN·BGDE·FMBM·NYC·ANIX·POWW·CBKM 등 현재 TOP30(30개 중 13개, 43%)이
  저가·마이크로캡·거래소 미확인 종목이었음.
  - 실제 스코어링 위치 확인: 요청서에 언급된 "AdminWatchSection"·"기업 동향
    (내부용)"이라는 이름은 현재 코드에 존재하지 않음(세션56 이후 리팩터링).
    화면은 `src/app/admin/page.tsx`(타이틀: 티커플로우 스크리너), 실제 후보
    풀 구성·스코어링은 `src/lib/collect/scoring.ts`의 `computeScores()`,
    가중치 정의는 `src/lib/scoring/weights.ts`의 `SCREENER_WEIGHTS`(CLAUDE.md
    18항, 13개 항목/8개 활성)로 세션56 당시의 "4영역(Event/SmartMoney/
    Earnings/Market)" 구조에서 이미 세분화되어 있었음.
- `computeScores()`의 `allCandidates`(후보 풀) 구성 직후, Phase 2(stock_prices
  30일치 조회) 완료 지점에 자격 필터를 추가. 4영역 가중치 스코어링 로직 자체는
  변경하지 않음.
  - 최근 종가(30일 내 최신값) ≥ $2
  - 시가총액(`tickers.market_cap`, 기존 컬럼 그대로 사용 — 스키마 추가 불필요)
    ≥ $3억(300,000,000)
  - 거래소(`tickers.exchange`) = Nasdaq 또는 NYSE만 허용(대소문자 무관 비교).
    NYSE MKT·NYSE ARCA·OTC·null은 모두 제외(요청서의 "그 외 전부 제외" 원칙).
    `exchange`는 SEC `company_tickers_exchange.json` 기반으로
    `seed-tickers.ts`(등재 시)·`filings.ts`(신규 종목 발견 시) 두 경로로
    채워지는데, 후자는 거래소 필터 없이 아무 CIK나 그대로 받아써서 OTC·미상장
    종목이 `tickers` 테이블에 유입되는 경로였음이 확인됨 — 이번 필터가 그
    유입을 스코어링 단계에서 차단.
  - 3개 조건 중 하나라도 데이터가 없으면(시총 미수집, 거래소 null 등) 통과
    실패로 처리(불확실하면 배제).
  - 필터 통과 후 30개 미만이어도 억지로 채우지 않음 — `top30.ts`의
    `scored.slice(0, 30)`이 있는 그대로 자름(코드 변경 없음).
  - 제외 사유별 카운트(가격/시총/거래소 미달, 데이터 없음 포함)를
    `console.log`로 기록(한 종목이 여러 조건에 동시에 걸릴 수 있어 합계가
    실제 제외 수보다 클 수 있음을 로그에 명시).
- 적용 범위: 어드민 전용(`computeScores()` → `top30.ts` → `top30_daily`).
  사용자 노출 와치리스트(`src/app/(dashboard)/watchlist/page.tsx`)의
  TrendingCarousel은 별도 데이터 경로라 이번 변경의 영향을 받지 않음(코드
  미수정, 확인만 함).
- 필터 적용 전/후 실측(진단 스크립트로 실제 프로덕션 후보 풀 조립 로직을
  동일하게 재현해 라이브 DB에 대해 실행, 확인 후 스크립트는 삭제):
  적용 전 953개 후보 → 적용 후 615개 후보(가격 미달 131개/시총 미달
  328개/거래소 제외 49개, 중복 집계 가능). CUEN은 3개 조건 모두 실패로 확인,
  제외됨.

## 2026-07-11 · 세션 92

### SNS용 AI 생성 고지 문구(SHORT_DISCLAIMER) 확정 적용

**`src/lib/collect/blog-draft.ts` 수정**
- 배경: 세션 91 이후 블로그 하단 `DISCLAIMER`를 인공지능 자동 요약 고지
  문구로 교체했으나, X/Threads·LinkedIn용 SNS 요약본에 붙는 축약 문구
  `SHORT_DISCLAIMER`는 이전 문구("정보 제공 목적이며 투자 권유가
  아닙니다...")로 남아있어 불일치 상태였음.
- `SHORT_DISCLAIMER` 값을 사용자 확정 문구 "※ 인공지능 자동 요약 | 투자
  권유 아님 | TickerFlow"로 교체(어미·구두점 변경 없이 그대로 적용).
- 사용처 확인: `generateBlogDraft()` 반환값 `snsX`/`snsLinkedIn` 필드
  생성 시 각각 `${sns.x}${SHORT_DISCLAIMER}`, `${sns.linkedin}${SHORT_DISCLAIMER}`
  형태로 실제 append됨(`src/lib/collect/blog-draft.ts:773-774`). 이 두
  필드는 어드민 화면(`src/app/admin/ops/blog-draft/page.tsx`)의 "X /
  Threads 요약", "LinkedIn 요약" 텍스트영역에 그대로 표시되어 수동 게시
  시 복사되는 경로 — 상수 교체가 실제 출력에 반영됨을 확인.

## 2026-07-11 · 세션 91

### 일일 블로그 포스팅 생성 프롬프트 전면 개선 (리포트형 → 기사형)

**`src/lib/collect/blog-draft.ts`, `src/app/admin/ops/blog-draft/page.tsx` 수정**
- 배경: 기존 `buildUnifiedPrompt()`가 생성하는 글이 TOP30·내부자거래·실적 등
  데이터를 슬라이스별로 순서대로 나열하는 "리포트" 형태에 가까웠음. 데이터
  수집량은 그대로 유지한 채, 경제신문 "오늘의 시장 브리핑" 형식의 "기사"로
  재구성.
- 글 구조 템플릿 7단계를 명문화(`ARTICLE_STRUCTURE_GUIDE`): ①제목(SEO)
  →②한줄요약→③오늘 가장 주목할 변화 3가지→④오늘 가장 눈에 띈 기업→⑤실적·
  공시·내부자거래로 보는 오늘 데이터→⑥오늘 시장에서 읽을 포인트→⑦TickerFlow
  함께 확인. ⑦과 내부 링크(관련 글 추천)는 모델 표현 편차·과장 리스크를
  없애기 위해 LLM이 아니라 코드가 고정 문구로 이어붙임(`buildFollowUpBlock`,
  `buildRelatedArticlesBlock` + `GLOSSARY_TOPIC_MAP`로 오늘 태그 기반 3개 선정).
- 종목 나열 최소화(`TICKER_LISTING_GUIDE`, 3~5개 이내 실명 언급, 나머지는
  "여러 기업/다수 종목" 등으로 요약), 기업 소개 간결화(`COMPANY_INTRO_GUIDE`,
  150~200자, "오늘 왜 주목받았는가" 중심), 데이터 해석 지침
  (`DATA_INTERPRETATION_GUIDE`, 건수 나열이 아니라 "다수 확인/동시에 관측"
  같은 사실 서술체 특징 설명 — 투자 의견성 해석은 계속 금지) 신규 추가.
- SEO 메타 자동생성: `[TITLE]`(SEO 고려) 외에 `[META_DESCRIPTION]`(120~160자),
  `[SLUG_KEYWORDS]`(영문 키워드, LLM 제안 → 코드가 날짜와 결합해 최종 슬러그
  생성, `buildSlug`/`slugify`/`parseKstDateToIso`)을 새 출력 섹션으로 추가.
  `BlogDraft`에 `metaDescription`/`slug` 필드 추가, 어드민 화면에 입력·복사 UI
  추가.
- `BANNED_BLOCK`에 금지 표현 보강: 투자 추천/투자 인사이트/투자 전략/매수
  기회/급등 예상/저평가/고평가/종목 분석/투자 분석 추가(요청서 6번 사용금지
  목록 반영).
- `parseDraft()` 파싱 섹션 6개로 확장(`[TITLE]→[META_DESCRIPTION]→
  [SLUG_KEYWORDS]→[BODY]→[CATEGORIES]→[HASHTAGS]`), `FOOTER_RULES`도 동일하게
  갱신.

## 2026-07-10 · 세션 90

### 금융위원회 법령해석 요청 접수 — TickerFlow 유사투자자문업 해당여부

- 금융규제·법령해석포털(better.fsc.go.kr)을 통해 자본시장법 제101조제1항 관련 법령해석 요청 제출
- 고유번호: 7909
- 요청 구분: 법령해석 (비조치의견서 아님)
- 현재 상태: 요청 (접수 완료, 회신 대기 중)
- 첨부: TickerFlow 서비스 운영 정책서(수정본 — AI 표현 제거, 투자의견 삭제 반영)
- 배경: PG사(한국결제네트웍스) 계약 진행 과정에서 유사투자자문업 해당여부 근거자료 확보 필요성 확인, 선제적으로 금융위 유권해석 요청

### 다음 작업 예정
- 금융위 법령해석 회신 확인 및 대응 (고유번호 7909)

## 2026-07-10 · 세션 89

### 개인정보처리방침에 포트원(결제 대행) 위탁업체 고지 추가

**`src/app/privacy/page.tsx` 수정**
- 배경: 포트원(PortOne) PG 계약 체크리스트 필수 요건 — "포트원을 통한 결제 연동 시, 고객사의 개인정보처리방침에 결제 업무 수탁자인 '포트원'을 위탁업체로 고지해야 합니다"
- 기존 문서에는 "개인정보 처리업무 위탁" 섹션이 없어("개인정보 제3자 제공" 섹션만 존재, Polar.sh만 언급) `SECTIONS` 배열에 동일 문체·구조로 신규 섹션 추가 — 수탁업체(포트원/PortOne/아임포트), 위탁업무 내용(전자결제 대행 및 결제 데이터 처리), 위탁 기간(회원 탈퇴 시 또는 위탁계약 종료 시까지) 3항목 포함
- 기존 "개인정보 제3자 제공" 섹션(Polar.sh 언급)은 삭제하지 않고 그대로 유지, "문의" 섹션 앞에 새 섹션만 추가
- 실질적 내용 변경이라 하단 "최종 업데이트"를 2026년 6월 24일 → 2026년 7월 10일로 갱신

## 2026-07-10 · 세션 88

### policy 페이지 부록 A 제거 — 최초 요청 시 누락 반영 수정

**`src/app/policy/page.tsx` 수정**
- 원인: 세션 87 최초 요청문에 "푸터에 데이터출처 메뉴가 이미 별도로 있으니 부록은 페이지에 포함하지 않는다"는 지시가 있었으나, 실제 작업 시 반영되지 않아 "부록 A. 데이터 출처" 섹션이 그대로 커밋·배포됨
- 수정: `SECTIONS` 배열에서 "부록 A. 데이터 출처" 항목(1~7번 출처 목록 + "데이터 제공 원칙" 문단 포함)을 통째로 삭제. 11번 "결론" 조항까지만 남도록 정리, 빈 섹션 잔여 없음
- 본문 1~11항, HSL 토큰, 레이아웃 등 나머지 구조는 변경하지 않음. `footer.tsx`는 이미 정상 반영되어 있어 수정 대상에서 제외
- `pnpm build` 통과(postbuild 웹훅 검증 포함), `/policy` 페이지 소스에 "부록" 문자열이 더 이상 존재하지 않음을 grep으로 재확인

## 2026-07-10 · 세션 87

### 운영정책 페이지 신규 생성 및 푸터 메뉴 추가

**신규 페이지 (`src/app/policy/page.tsx`)**
- PG사(PortOne) 심사용으로 정리한 "TickerFlow 서비스 운영 정책" 문서를 공개 페이지로 신규 생성 — `terms/page.tsx`, `privacy/page.tsx`와 동일한 레이아웃/스타일 패턴(SECTIONS 배열 + `whitespace-pre-line`) 그대로 적용, 랜딩 디자인 규칙(HSL 토큰만 사용)에 맞춰 작성
- 본문 11개 조항 + 부록 A(데이터 출처)를 원문 그대로 반영, 하단에 "최종 업데이트: 2026년 7월" 표기

**푸터 메뉴 (`src/components/footer.tsx`)**
- '요금제' 링크 바로 앞에 '운영정책'(`/policy`) 링크 추가. 기존 메뉴(요금제, 데이터 출처, 개인정보처리방침, 이용약관, 환불정책) 순서는 그대로 유지
- `src/app/page.tsx`에서 `Footer`가 실제로 랜딩 페이지에 마운트되어 있음을 확인

## 2026-07-09 · 세션 86

### Resend 포워딩 빈 메일 버그 완전 해결(API 키 권한 검증 포함), Finnhub Free 플랜 실측 검증 및 CLAUDE.md 오기 정정, insider_trades 12일 정체 근본 원인 발견·수정(수집 파이프라인 안정성 전반 개선), 랜딩 히어로 문구 2차 수정

**Resend 포워딩 이메일 "빈 내용" 버그 후속 — API 키 권한 검증 (`src/app/api/webhooks/resend/route.ts`)**
- 전 세션에서 파싱 로직은 수정했으나, 당시 API 키가 "발송 전용" 권한이라 본문 조회(`GET /emails/receiving/{id}`)가 거부되는 것을 확인해 사용자에게 권한 승격 요청
- 사용자가 Resend 대시보드에서 Full access로 전환 후, 토큰 값이 바뀌었는지(안 바뀜 확인 — `.env.local`/Vercel 값 그대로 사용 가능) + 실제 수신 목록 조회(`receiving.list()`)로 권한 정상 작동을 실측 확인
- 실제 테스트 메일을 `support@tickerflow.net`으로 발송해 Resend 인바운드 수신 확인 → 프로덕션 웹훅에 실제 email_id로 직접 요청해 `{"ok":true}` 응답 확인. 최종 수신함 확인은 사용자에게 위임(에이전트가 Gmail 접근 불가)

**TickerFlow 월간 비용 구조 추산**
- 실제 프로덕션 DB(유저 4명, Pro 2명, 티커 8,604개, 최근 7일 뉴스 1,934건)와 Claude/Finnhub/FMP/Supabase/Vercel/Resend 최신 가격을 조합해 추산 — Claude API는 번역 파이프라인 위주로 월 $15~25 수준, 병목은 Finnhub·FMP 외부 데이터 구독료(월 $100~250 추정, 실제 계약 확인 필요)

**Finnhub 요금제 실측 검증 + CLAUDE.md 오기 정정**
- 사용자가 Finnhub 대시보드에서 실제로는 Free 플랜임을 확인 — CLAUDE.md 자체에는 "Finnhub Premium" 문구가 없었고, 전 턴 비용 추산 답변에서 에이전트가 임의로 추측해 언급한 표현이었음을 확인 후 정정
- 사용 중인 6개 엔드포인트(`insider-transactions`/`company-news`/`calendar/earnings`/`news`/`recommendation`/`profile2`) 전부 Free 플랜에서 정상 호출 실측 확인, 분당 60회 제한을 `x-ratelimit-remaining` 헤더로 실측
- CLAUDE.md 5번 섹션에 Finnhub를 "Free 플랜"으로 명시, 경제지표는 Finnhub가 아니라 FRED API가 제공한다는 것도 함께 바로잡음(같은 표를 보다가 발견한 별도 오류)

**insider_trades 12일 정체 근본 원인 발견·수정 (`src/lib/collect/insider.ts`, `news.ts`, `earnings.ts`, 신규 `limits.ts`)** — 이번 세션 핵심 작업
- 증상: `insider_trades` 최신 데이터가 2026-06-26 이후 갱신 안 됨. Finnhub 요금제 문제로 의심됐으나, 실측 결과 `/api/collect/insider`를 직접 호출하면 120초+ 무응답 — `maxDuration`(300초) 타임아웃이 원인
- 정확한 원인: Finnhub `/stock/insider-transactions`는 종목당 전체 Form 4 거래 히스토리를 반환(NVDA·TSLA 등 대형주는 100건 이상) — 2026-07-03 추가된 SEC Form 4 직책 조회(`insider-form4.ts`)가 거래 건마다 실행되면서 대형주 몇 개만으로 종목당 수십 초 누적. 2026-07-04 거래량·섹터 상위 종목까지 수집 대상에 합류해 대상 풀이 150개 이상으로 커진 것도 함께 작용. `/api/collect/insider` 라우트가 `withCollectRunLog`를 안 써서 크론 실행 결과가 `collect_runs`에 전혀 기록되지 않아 조기 발견도 늦어졌음
- 수정: `limits.ts` 신설(`INSIDER_LOOKBACK_DAYS=30`, `MAX_TICKERS_PER_RUN=30` 중앙 관리, insider.ts·news.ts 공유), 최근 공시 종목을 최우선으로 채운 뒤 상한을 적용하도록 순서 재정렬(공시 트리거 종목이 배열 끝에 밀려 상한에서 잘리지 않도록)
- 같은 원인 계열로 `news`·`earnings` 크론도 `collect_runs`에 `running` 상태로 영구 정체돼 있던 것을 함께 발견·수정: `earnings.ts`는 30일 캘린더 1,500건을 행 단위 순차 upsert하던 것을 배치 upsert(500건 청크)로 전환(라우트에 `maxDuration` 설정 자체도 누락돼 있었음). 배치 전환 중 Finnhub가 동일 (ticker, report_date)를 중복 반환해 `ON CONFLICT DO UPDATE command cannot affect row a second time` 오류가 발생 — Map으로 사전 dedupe해 해결
- 실측 개선: insider 37초, earnings 3.5초, news 131초(전부 300초 이내로 안정화)
- 부가 개선: `/api/collect/insider`·`watchlist-ticker`·`watchlist-tickers` 라우트에 `withCollectRunLog` 적용해 크론 결과가 `collect_runs`에 기록되도록 통일, Finnhub 비200 응답을 rate_limit/auth_error/not_found/server_error로 세분화(`classifyHttpSkipReason`)해 이후 "스킵"이 rate limit 때문인지 진짜 데이터 없음인지 구분 가능하도록 개선
- 코드 리뷰 피드백 반영: `RECENT_DAYS`/`MAX_TICKERS` 하드코딩값을 `limits.ts`로 즉시 분리(운영 중 조정 시 이 파일만 수정하면 됨). 대상 종목 우선순위에 "최근 실적 발표 종목" 추가하는 안과 SEC 직책 조회 영속 캐시는 스코프가 커서 백로그로 보류(CLAUDE.md에 기록)

**랜딩 히어로 라벨 문구 2차 수정 (`src/app/page.tsx`)**
- "미국 기업 변화" → "미국 기업 변화 탐지 플랫폼"

**빌드 검증**: 매 단계 `pnpm build` 통과(postbuild 웹훅 검증 포함). insider/earnings/news 세 엔드포인트 모두 로컬에서 실제 Finnhub/SEC API로 재현·수정 확인 후 배포, Vercel 배포 로그·프로덕션 curl로 반영 여부 재확인.

### 다음 작업 예정
- 대상 종목 우선순위 재편(최근 공시 → watchlist → 최근 실적 발표 → TOP30 → 거래량 → 섹터) — 현재는 최근 실적 발표 카테고리가 없음
- `insider-form4.ts`의 SEC 직책 조회 결과를 (이름, 티커) 기준으로 실행 간 영속 캐시 — 현재는 한 번의 `collectForTicker` 호출 내에서만 캐시되고 다음 날 실행에서는 다시 SEC를 조회함. 다음 병목 후보
- Finnhub Free 플랜 분당 60회 제한 — 지금은 종목 상한(30)으로 여유 있지만, 와치리스트·공시 증가 시 재발 가능성 있어 모니터링 필요

---

## 2026-07-08 · 세션 85

### 어드민 "Pro 수동 부여" 미구현 버그 수정(기간별 만료 관리 포함), 블로그 초안 생성 "오늘의 기업동향" 통합 포스팅으로 전환(SNS 요약 추가), Resend 웹훅 트레일링 슬래시 308 리다이렉트 버그 수정 + 재발 방지 자동 검증, 랜딩 히어로 라벨 문구 수정

**어드민 "Pro 수동 부여" 버튼 무반응 버그 수정 (`src/app/admin/users/pro-grant/`, `src/app/api/admin/pro-grant/route.ts`)**
- 원인: git log로 확인한 결과 이 버튼은 2026-06-24 최초 생성 시점부터 `onClick` 자체가 없는 목업 UI였음("Mock UI for all sections pending real data integration" 커밋 메시지로 확인) — "예전엔 됐는데 갑자기 안 된다"가 아니라 처음부터 미구현 상태였던 케이스
- `profiles.pro_expires_at`(timestamptz, null=무기한) 컬럼 신규 추가(`supabase/pro-expires-at.sql` + `schema.sql` 19번 섹션), `/api/admin/pro-grant`에서 이메일+기간(1/3/6/12개월/무기한) 받아 만료일 계산·저장
- 만료 자동 강등: `src/lib/collect/pro-expiry.ts` + `/api/collect/pro-expiry`(매일 00:45 UTC cron 신규 등록) + 어드민 트리거 페이지에 수동 실행 버튼 추가
- 폼을 정적 마크업에서 클라이언트 컴포넌트(`pro-grant-form.tsx`)로 분리해 실제 API 호출·`router.refresh()`로 목록 갱신되도록 연결, 목록 표에 만료일 컬럼 추가

**블로그 초안 생성 기능 전면 개편 (`src/lib/collect/blog-draft.ts`)**
- 기존 5개 타입(daily-summary/insider-buying/earnings-surprise/new-entries/macro) 개별 생성 방식을 폐지하고 "오늘의 기업동향" 통합 포스팅 단일 생성으로 전환 — 데이터가 없는 섹션(예: 오늘 내부자 매수 없음)은 LLM이 자연스럽게 생략하도록 프롬프트 재설계, 목표 분량 1,600자 내외
- 제목 생성 지침 강화(질문형·리스티클형·궁금증 유발형으로 클릭 유도, 단순 수치 나열 금지), 카테고리 선택 1~3개→1~2개로 축소
- 신규: 본문 생성 완료 후 2차 Claude Haiku 호출로 X/Threads·LinkedIn용 300자 내외 SNS 요약본 생성(플랫폼별 톤 구분, 축약 면책 문구는 코드에서 고정 삽입)
- 실제 생성 테스트 중 SNS 요약에 `---`, `##` 같은 마크다운 구분선이 섞여 나오는 버그 발견 — 2차 프롬프트에 마크다운 금지 지시가 누락됐던 게 원인, 프롬프트 보강 + 파싱 단계에 기호만으로 된 줄을 걸러내는 방어 로직(`stripMarkdownArtifacts`) 추가
- 어드민 UI(`/admin/ops/blog-draft`)도 5개 버튼 → 단일 생성 버튼으로 교체, SNS 요약 2종을 각각 복사 버튼과 함께 표시. 사용자 요청으로 본문 textarea에 `no-scrollbar` 적용(휠 스크롤은 유지)

**Resend 웹훅 트레일링 슬래시 308 리다이렉트 버그 수정 (`next.config.ts`) + 재발 방지 자동 검증 (`scripts/verify-webhooks.ts`)**
- 신고: `support@tickerflow.net` 문의 메일이 관리자에게 포워딩 안 됨, URL을 www로 바꿔도 308 계속 발생
- curl 실측으로 원인 특정: 정확한 URL(`https://www.tickerflow.net/api/webhooks/resend`, 슬래시 없음)은 이미 200이었지만, 끝에 슬래시가 붙은 변형(`.../resend/`)은 www에서도 여전히 308 — Resend 같은 웹훅 발신자는 리다이렉트를 따라가지 않아 계속 실패
- 이 308이 middleware.ts보다 먼저 실행되는 Next.js 저수준 라우팅 단계에서 발생한다는 걸 middleware에 디버그 로그를 심어 실측으로 확인(middleware 자체는 원인이 아니었음) — `middleware.ts`로는 가로챌 수 없어 `next.config.ts`에서 `skipTrailingSlashRedirect: true` + `/api/webhooks/*`는 rewrite로 통과, 그 외 전체 경로는 기존과 동일한 308 동작을 커스텀 redirect로 재현
- 재발 방지: `scripts/verify-webhooks.ts` 신규(웹훅 라우트 자동 탐지 → 슬래시 유무 두 버전으로 요청해 3xx 감지 시 실패) + `postbuild`로 `pnpm build`마다 자동 실행되어 회귀 시 빌드·배포 자체를 막음. 실제로 next.config.ts를 예전 버그 상태로 되돌려 빌드해 가드레일이 정상 작동함을 확인 후 복구. CLAUDE.md 19항에 "웹훅 URL은 슬래시 없이 www 기준으로 등록" 원칙 문서화

**랜딩 히어로 라벨 문구 수정 (`src/app/page.tsx`)**
- 히어로 상단 라벨을 "미국 기업 동향" → "미국 기업 변화"로 변경

**빌드 검증**: 매 단계 `pnpm build` 통과(신규 postbuild 검증 포함). Resend 웹훅 수정은 curl로 프로덕션 재검증, Vercel 배포 로그에서 신규 `postbuild` 스크립트가 정상 실행됨도 직접 확인.

### 다음 작업 예정
- 배포 후 어드민에서 실제 테스트 계정에 기간별 Pro 부여 → `pro_expires_at` 저장, 만료 강등 크론 실제 동작 확인 필요
- 블로그 초안 "오늘의 기업동향" 본문에 "주목을 받은" 표현이 등장 — 금지어 목록의 "주목할 만한"과는 다른 표현이라 통과되지만, 더 엄격하게 막고 싶다면 "주목" 단독 표현도 금지어 목록에 추가 검토

---

## 2026-07-08 · 세션 84

### 랜딩/결제/이메일 카피 수정, 대시보드 MarketClock 위젯 신규 추가, 뉴스·공시 피드 버그 다발 수정(요약 누락·스크롤·로딩 지연), 어드민 블로그 초안 생성 기능 신규 추가

**랜딩 히어로 카피 수정 (`src/app/page.tsx`)** — 여러 차례 시행착오 끝에 확정
- 히어로 상단 라벨을 "정보 비대칭 해소를 위한" → "미국 기업 동향"으로 변경. 과정에서 존재하지도 않는 미사용 파일(`src/components/hero.tsx`)을 여러 번 잘못 수정하다가 실제 렌더링되는 파일이 `src/app/page.tsx`에 인라인으로 있다는 걸 뒤늦게 발견 — 미사용 `hero.tsx`는 삭제
- 사업자 정보: 푸터·이메일 템플릿의 통신판매업신고 번호 플레이스홀더(`XXXX`)를 실제 번호(`제 2026-서울강남-03723 호`)로 교체

**Paddle 결제 미승인 대응 + 무통장입금 안내 (`billing-plans-client.tsx`, `src/lib/pricing.ts`)**
- Paddle 도메인 미승인으로 체크아웃 클릭 시 "Something went wrong" 에러가 그대로 노출되던 문제 — `PADDLE_CHECKOUT_ENABLED` 플래그로 분기해 승인 전까지는 안내 모달만 표시(플래그 하나만 `true`로 바꾸면 원상 복구되도록 기존 로직은 보존)
- 이후 요구사항 변경: 결제 연동 완료 전까지 무통장입금 + 수동 확인으로 Pro 전환 지원 — `BANK_TRANSFER_INFO` 상수(카카오뱅크 계좌) 추가, 안내 모달에 계좌 정보 표시(계좌번호 클릭 시 클립보드 복사) + 마이페이지 "문의하기" 안내로 문구 최종 확정

**데일리 다이제스트 이메일 헤더 배경색 (`src/lib/email/templates.ts`)**
- 헤더(TICKERFLOW PRO/날짜) 영역이 본문과 시각적으로 구분되도록 기관수급 배지와 동일한 배경색(#1e3a5f) 적용

**신규 가입 Free 유저 다이제스트 "2번만 받고 끊김" 문의 조사 (`src/lib/collect/digest.ts`)**
- `collect_runs` 로그와 `profiles` 실데이터 대조 결과 코드 버그 아님으로 결론 — Free 7일 체험 발송 기능 자체가 2026-07-03에 배포되어, 그 이전에 가입한 유저는 가입일 기준 7일 창 중 이미 지난 기간만큼만 발송받는 게 정상 동작. 재문의 방지를 위해 코드에 이 의도를 주석으로 명시

**대시보드 우측 하단 MarketClock(실시간 시계) 위젯 신규 추가 (`src/components/dashboard/market-clock.tsx`)**
- KOSPI(KRX)·S&P 500(NYSE) 개장 상태 + 현지 시각(1초 갱신)을 보여주는 위젯, `Intl.DateTimeFormat` 타임존 기능만으로 구현(서머타임 자동 반영, 별도 라이브러리 불필요). 실제 지수 포인트는 표시하지 않고 클라이언트 시계·개장상태 계산만 수행("실시간 시세" 오인 방지)
- 전역 `ScrollToTop` 버튼과 위치가 겹치는 문제를 세 차례 반복 수정 끝에 해결: 처음엔 화살표만 CSS 변수로 위젯 위에 띄우는 방식이었으나 위젯 자체 위치는 그대로라 화면 하단에 빈 공백이 남는 문제 발견 → MarketClock이 스크롤 버튼을 자체적으로 함께 그리도록 통합, `fixed bottom-6 right-6` 컨테이너 하나 안에서 화살표+위젯이 쌓이고 그룹 전체 하단이 항상 화면 끝에 붙도록 재구성. 전역 `scroll-to-top.tsx`는 `--tf-scroll-display` CSS 변수로 대시보드에서는 스스로 숨고 그 외 페이지에서는 그대로 동작

**뉴스 피드 버그 진단 및 수정**
- 필터 탭(가이던스 변경/CEO·임원 등)은 최초 커밋부터 실제 필터링에 연결된 적 없는 장식 UI였음을 git log로 확인 — 정식 구현 대신 제거(실제 동작하는 티커 필터는 유지)
- "섹터별 뉴스 활동" 차트가 비어있던 원인: `src/lib/collect/news.ts`가 Finnhub `category=general` 뉴스만 수집했는데, 이 엔드포인트는 `related`(티커) 필드가 거의 항상 비어있어 최근 뉴스 240건 전부 `ticker=null`이었음 — 와치리스트+TOP30/거래량/섹터 상위+최근 7일 공시 종목 대상으로 Finnhub `company-news`를 종목별 추가 호출하도록 수집 파이프라인 보강(기존 크론에 통합, 종목당 250ms 딜레이). 실행 후 최근 7일 뉴스 ticker 보유율 0% → 81%로 개선
- 한글 요약(summary_kr) 누락 발견: company-news 수집 추가로 뉴스 유입량이 급증(240→1295건/7일)하면서 번역 배치(시간당 80건)가 못 따라가 77%가 미번역 상태로 누적 — `summarize.ts`의 `BATCH_LIMIT`을 20→40으로 상향(시간당 160건), 미번역 카드에는 "번역 준비 중" 안내 표시

**공시 피드/뉴스 피드 3열 매이슨리(masonry) 레이아웃 전환**
- `grid grid-cols-1 md:grid-cols-2` → `columns-1 sm:columns-2 lg:columns-3 + break-inside-avoid` 패턴으로 양쪽 피드 모두 교체, 홀수 카드 `col-span` 보정 로직 제거, 뉴스 카드 텍스트 `line-clamp` 제거(콘텐츠 길이대로 카드 높이 자유화)

**페이지네이션 스크롤 안 되던 문제 수정 (`feed-scroll-anchor.tsx`)**
- `useEffect(fn, [])`가 최초 마운트 시 1회만 실행돼 `page`만 바뀌고 서브트리가 리마운트 안 되는 경우 2페이지부터 스크롤이 멈췄음 — 현재 페이지 번호를 `watch` prop으로 받아 의존성 배열에 추가

**공시 인사이트 "데이터 출처" 카드 누락 버그 (`analysis/page.tsx`)** — 반복 요청이었으나 이전에 미반영됐던 건
- 원인: 다른 Pro 페이지(어닝콜/내부자거래/섹터 히트맵)는 `DataSources`를 `ProGate` 바깥에 둬 Free 사용자에게도 노출하는데, 공시 인사이트만 유일하게 `ProGate` 안쪽에 있어 Free 계정에서는 카드 자체가 렌더링되지 않았음
- 지난 수정(`2aa5c3c`)이 반영 안 됐던 이유: 그 커밋은 문구·날짜 버그만 고쳤을 뿐 위치(ProGate 안쪽)는 그대로 두고 넘어감 — ProGate 밖으로 이동, 페이지 실제 데이터 소스 기준으로 문구도 새로 작성

**페이지네이션 로딩 지연 진단 및 수정 (`src/lib/collect/target-tickers.ts`)**
- "2·3페이지 이동 시 로딩이 오래 걸린다" 신고 — 실측 결과 news/filings 목록+count 쿼리는 150~180ms로 문제 없었고(오늘 뉴스량 5배 증가는 체감 지연과 무관), 진짜 원인은 종목 뱃지 계산용 `getTargetTickerSets()`가 8,213개 tickers를 `while` 순차 루프(페이지당 왕복을 하나씩 대기)로 긁어오는 데 실측 5.2초가 걸렸던 것 — 뉴스/공시 피드뿐 아니라 종목 스냅샷·와치리스트 페이지에서도 페이지 로드마다 매번 재실행되고 있었음
- 1차: count만 먼저 조회해 페이지 수를 구한 뒤 `Promise.all`로 병렬 발사하도록 변경(로직·결과 동일, 5.2초 → 약 1.8초)
- 2차: `unstable_cache`로 5분 TTL 캐싱 추가(해당 데이터는 크론 단위로만 갱신되므로 신선도 손실 없음) — 로컬 실측 1차 호출 1331ms(캐시 미스) → 이후 호출 0~1ms(캐시 히트)

**어드민 "블로그 초안 생성" 기능 신규 추가 (`src/lib/collect/blog-draft.ts`, `/admin/ops/blog-draft`)**
- 데일리 다이제스트와 동일한 데이터 소스를 재사용하기 위해 `digest.ts`의 이메일 발송 로직에서 데이터 수집부만 `gatherDigestData()`로 분리(이메일 발송·블로그 초안 양쪽이 공유), `top30Full`(1~30위 전체+원본 태그)·`earningsTotal` 필드 추가
- 1차: 단일 타입(데일리 요약) 초안(제목/본문/카테고리) 생성 — CLAUDE.md 6항·14항 기준 금지 표현 프롬프트 적용, 면책 문구 자동 삽입
- 2차 개선: 5개 타입으로 분리(daily-summary/insider-buying/earnings-surprise/new-entries/macro), 각 타입 관점 완전 분리(내부자 매수·TOP30은 개념 설명 포함, 실적·매크로는 해당 주제만 집중) + 어드민에 5개 개별 버튼으로 원하는 타입만 생성 가능하도록 UI 구성. 타입별 분량 기준, 카테고리 고정 6종, 해시태그 자동 생성(+코드에서 티커 해시태그 보강), 이미지 프롬프트는 LLM 미사용·코드 템플릿 조합 방식(Headline/Theme/Accent 고정 + 그날의 키워드만 삽입)으로 구현
- 검증 중 금지 표현("포착" 등)이 실제로 출력에 섞여 나온 걸 발견 — 프롬프트에 "제출 전 금지 표현 자가 점검" 지시 추가 및 누락됐던 금지어("매수 신호", "실적 우수" 등) 보강 후 재검증
- 면책 문구를 대시보드 화면용 표준 문구에서 블로그 콘텐츠 맥락에 맞는 "TickerFlow Note" 문구로 교체(CLAUDE.md 14항에 콘텐츠 성격별 면책 문구 구분 원칙 신설 문서화)

**빌드 검증**: 매 단계 `pnpm build` 성공. 실데이터 기준 로컬 임시 테스트 라우트로 각 기능 실제 동작 확인 후 라우트 삭제하는 방식으로 검증(뉴스 수집, 캐시 성능, 블로그 초안 5종 전부).

### 다음 작업 예정
- 블로그 초안 생성 결과의 콘텐츠 품질(예: "검토할 가치가 있습니다" 류의 애매한 표현)은 발행 전 매번 수동 검수 필요 — LLM 출력이라 금지 표현 100% 배제는 보장 불가
- insider-buying 타입은 매수 확인 종목이 많은 날 분량이 목표(700~1200자) 상한을 초과하는 경향 — 필요시 상위 N종목만 나열하도록 프롬프트 조정 검토
- 블로그 콘텐츠 이력 저장(재사용·이력 관리 목적)은 이번 범위에서 제외 — 필요해지면 별도 테이블 추가 검토

---

## 2026-07-07 · 세션 83

### 티커플로우 스크리너 13개 팩터 재설계 + 2단계(재무 데이터 수집)·2.5단계(검증 인프라) + stock_prices 수집 회귀 버그 긴급 수정·전체 백필 + Top 30 Ticker Overlay 실데이터 연동

**UI 소소한 수정**
- 위로가기 버튼 위치를 `bottom-[4.5rem]` → `bottom-6`으로 조정 — 텔레그램 채널/봇 운영 중단(세션 82)으로 그 자리에 있던 텔레그램 아이콘이 사라져 버튼이 빈 공간 위에 떠 있던 문제
- 상단 네비게이션에서 "요금제" 메뉴 제거 — 푸터에 이미 동일 메뉴가 있어 중복

**Top 30 Ticker Overlay 어드민 차트 신규 추가 (`src/components/admin/top30-ticker-overlay.tsx`)**
- v0로 프로토타입 제작한 다중 라인 오버레이 차트(순수 React/SVG, 외부 차트 라이브러리 불필요)를 어드민 페이지 스크리너 섹션 하단에 mock 데이터 상태로 우선 이식, 이후 세션에서 실데이터 연동(아래 참고)

**스크리너 가중치 구조 전면 재설계 — 13개 팩터 확정 (`src/lib/scoring/weights.ts` 신규, `scoring.ts`, `top30.ts`)**
- 기존 5분류(Smart Money 45%/Earnings 30%/Events 15%/Market 5%/News 5%)를 13개 확정 팩터(활성 8개: earnings 18%·institution 15%·insider 10%·target 9%·filing 12%·news 5%·short 5%·momentum 4% = 78%, 비활성 5개: revision 12%·revenueGrowth 4%·epsGrowth 3%·fcf 2%·roic 1% = 22%)로 재설계
- `SCREENER_WEIGHTS`(가중치+active 플래그+라벨) + `getActiveWeightSum()`(활성 비중 합계, 하드코딩 금지) + `FactorLog` 타입(`Record<ScreenerFactor, number|null>`) 도입 — 비활성 항목은 `null`("계산 안 함")로 활성 항목 계산결과 0과 구분
- `computeFinalScore()`: 활성 팩터만 가중합산 후 활성 비중 합계로 정규화해 100점 만점 산출 — 비활성 항목이 나중에 활성화돼도 다른 항목 비중은 그대로 유지되는 구조
- `top30_daily.factor_log`(jsonb) 컬럼 신규 — 팩터별 raw score 내부 로그, 사용자 비노출
- 어드민 화면 점수 라벨을 "Internal Score"로 명확화 + 툴팁("종목 간 상대 비교용, 절대값 무의미, 향후 팩터 활성화에 따라 범위 변경될 수 있음") 추가 — 별도 Display Score 변환 함수는 만들지 않기로 결정(raw÷활성비중×100 공식 그대로 노출, 결과적으로 기존 대비 점수 스케일이 커짐)
- CLAUDE.md 18항에 최종 목표 구조 표·비중 고정 원칙·4단계(신규 팩터는 최소 수개월 실운영 검증 후)·5단계(예측 경로 시각화는 4단계 검증 완료 후) 방침 기록

**스크리너 2단계 — 재무 품질 팩터 원시 데이터 수집 인프라 (`financial_metrics` 테이블, `src/lib/collect/financials.ts` 신규)**
- FMP `/stable/income-statement`·`/stable/cash-flow-statement`·`/stable/key-metrics`·`/stable/profile` 엔드포인트를 실제 API 호출로 필드명 검증(공식 문서 403 차단으로 라이브 검증 대체) 후 구현
- 매출성장률/EPS성장률(YoY, fiscalYear-period 키로 전년 동기 매칭, 배열 위치 의존 안 함)·FCF(OCF+Capex)·ROIC/ROE 계산, `raw_payload`는 해당 분기 단일 객체만 저장(배열 전체 저장 금지)
- UNIQUE(ticker, period_type, period_end) 전체 컬럼 UPSERT, 실패 종목/사유는 `CollectResult.failedTickers`로만 반환하고 `financial_metrics`에는 저장하지 않음(실행 로그와 재무 데이터를 명확히 분리 — 사용자 운영 원칙 확정)
- 실행 결과: 30종목 223개 분기 행 정상 수집, UPSERT 재실행 시 행 수 불변·전체 컬럼 갱신 확인. `weights.ts`의 해당 4개 팩터는 계속 `active:false` 유지(스코어링 미반영)

**스크리너 2.5단계 — TOP30 선정 검증 인프라 (`top30_entries`/`top30_outcome_results` 신규, `src/lib/scoring/version.ts`, `src/lib/outcomes/config.ts` 신규)**
- 배점 설계가 아니라 검증 인프라 구축 — TOP30 선정 시점 `factor_log` 스냅샷을 불변 기록으로 남기고 이후 30/60/90일(`TRACKED_DAYS`) 가격 성과를 추적, 2~3개월 데이터 축적 후 4단계(배점 설계) 근거로 사용
- `SCORING_MODEL_VERSION`("v1", weights.ts 변경 시 사람이 직접 갱신하는 단일 관리 지점)을 `top30_daily`·`top30_entries` 양쪽에 스냅샷
- Postgres RPC 함수 `upsert_top30_with_entries`로 top30_daily upsert + 신규 Entry + outcome_results pending 행 생성을 하나의 트랜잭션으로 원자적 처리(PostgREST가 여러 요청 간 클라이언트 트랜잭션을 지원하지 않아 채택)
- 신규 Entry 판정: 어제 top30_daily에 없었던 티커만 판정(재진입 시 독립된 새 Entry로 처리 — synthetic 테스트로 검증), `top30_entries`는 생성 후 UPDATE하지 않는 불변 테이블로 취급
- entry_price 장중 선정 이슈 발견: TOP30 선정이 13:35 UTC(미 장중)에 실행돼 당일 종가가 없어 entry_price가 null로 생성됨 → 별도 백필 단계가 null인 행만 최초 1회 채우는 방식으로 해결(이미 채워진 값은 절대 재수정 안 함 — 불변 원칙의 유일한 예외로 CLAUDE.md 18항에 명시)
- `top30_entries`/`top30_outcome_results` 모두 운영 중 DELETE 안 함, 수정 필요 시 기존 행 대신 새 Entry/Event 생성 우선 원칙 확정(관리자 수동 보정만 예외)

**stock_prices 수집 회귀 버그 발견 및 긴급 수정 (`src/lib/collect/prices.ts`)** — 이번 세션 최대 이슈
- 증상: NVDA 등 다수 종목 `stock_prices`가 10일 이상 정체. 사용자 지시로 원인 조사 착수
- 원인 1: 세션 78 커밋 `f0661a3`(Yahoo Finance→FMP 전환) 때 FMP `/stable/historical-price-eod/full` 응답이 순수 배열로 오는데 코드가 여전히 v3 형태(`{historical:[]}`)를 참조 → 6/28부터 **모든 티커가 "no data"로 스킵**되고 있었음. `{ok:true, saved:0}` 형태로 겉보기 성공처럼 보여 발견이 늦어짐 — `Array.isArray()` 분기로 수정(seed-prices.ts에 이미 있던 동일 패턴 재사용), 다른 FMP 호출 파일(profile/price-targets/short-interest/calls/financials)은 이미 안전 처리돼 있음을 전수 확인
- 원인 2(1차 수정 후 재검증 중 추가 발견): `collected_at ASC NULLS FIRST` 우선순위 큐가 stock_prices row 단위였는데, 한 티커가 수백 개 날짜별 row를 갖고 최근 35일치만 매일 갱신되다 보니 35일보다 오래된 row의 collected_at이 영원히 안 바뀌어 방금 정상 수집된 티커도 "가장 오래된 티커"로 계속 오판되던 구조적 결함 — `tickers.prices_last_attempted_at`(티커당 단일 값) 컬럼으로 교체해 근본 해결
- "성공으로 위장된 실패" 재발 방지: `processed>0 && saved===0`이면 `ok:false`로 반환하도록 가드 추가
- BATCH_SIZE 조정: FMP Ultimate 플랜(3,000req/min)은 실측 티커당 826ms 기준 75req/min 수준이라 전혀 병목이 아님을 확인, 실제 제약은 Vercel `maxDuration=300s` — 250 × 826ms ≈ 207초(약 31% 안전마진)로 계산해 50→250 상향, 실측 210초로 계산치와 거의 일치 확인
- 전체 잔여 백필(6,644개 티커) 완료 — 총 saved 약 147,972건, skipped 246건, 에러 0건. NVDA/A/FDX/SWBI 등 목표 종목 최신 거래일(07-06) 데이터 갱신 확인, `top30-outcomes`의 entry_price 자동 백필도 정상 동작 확인(entryPriceFilled:4, entryPriceStillMissing:0)

**Top 30 Ticker Overlay mock → 실데이터 연동 (`src/app/admin/top30-overlay-data.ts` 신규, `top30-overlay-types.ts` 신규, `top30-ticker-overlay.tsx`, `admin/page.tsx`)**
- 오늘자 top30_daily 30개(rank 기준 정렬) + 어제 대비 이탈 최대 5개 조회, stock_prices를 52주 그리드로 as-of 리샘플링(그리드 시작 이전 데이터 없으면 최이른 종가로 전방 채움)
- color는 순위 기반 대신 티커 심볼 해시로 고정 배정(순위는 매일 바뀌어 같은 종목 색이 흔들리는 문제 방지) — 판단해서 제안 후 적용
- 버그 1(배포 전 자체 검증 중 발견): `stock_prices` 조회가 PostgREST 기본 1,000행 응답 상한에 걸려 date 오름차순 정렬 특성상 최근 데이터가 잘려나가던 문제 — `range()` 페이지네이션 적용
- 버그 2(배포 후 사용자가 devtools로 발견): 라인 `<path>`에 `stroke` 속성 자체가 누락 — 서버 코드(`top30-overlay-data.ts`)가 `"use client"` 파일에서 `PALETTE` 값을 import하고 있어 Next.js가 클라이언트 경계 참조로 취급해 undefined가 되던 문제. `PALETTE`/`Ticker`/`DataSet`을 `"use client"` 없는 `top30-overlay-types.ts`로 분리해 해결
- `/stocks/[symbol]` 종목 스냅샷 가격 차트도 실제 백필 데이터로 정상 표시될지 쿼리 재현으로 검증(로그인이 OAuth 전용이라 브라우저 스크린샷은 이번에도 불가 — NVDA 최신 종가/등락률 계산 결과가 정상임을 서버 쿼리 재현으로 확인)

**빌드 검증**: 매 단계 `pnpm build` 성공, 에러 0건. 커밋 다수(weights.ts 리팩터, financial_metrics, 2.5단계 인프라, prices.ts 버그 수정 2건, BATCH_SIZE 조정, Top30Overlay 연동 2건 등) 전부 배포 후 실제 프로덕션 데이터로 검증.

### 다음 작업 예정
- 사용자가 로그인 후 `/admin`에서 Top 30 Ticker Overlay 라인이 정상 렌더링되는지 최종 육안 확인 필요
- `financial_metrics`(revenueGrowth/epsGrowth/fcf/roic)와 `top30_entries`/`top30_outcome_results`(2.5단계) 모두 아직 스코어링 미반영 상태 — 2~3개월 데이터 축적 후 4단계(배점 설계) 진행 예정

---

## 2026-07-06 · 세션 82

### 환불 정책 확정(월간/연간 차등 + Paddle 청약철회 14일 반영) 및 텔레그램 채널/봇 운영 완전 중단

**환불 정책 재정의 (`legal-modal.tsx`, `refund/page.tsx`)**
- 기존 "이용 이력 있으면 비례 환불"이라는 애매한 문구를 월간/연간 플랜별로 명확히 분리: 월간은 청약철회 기간 경과 후 환불 없음(자동 갱신만 중단, 이미 결제한 기간은 계속 이용), 연간은 해지 신청월을 제외한 잔여 개월 수를 월 단위로 일할 환불(연간 결제액 ÷ 12 × 잔여 개월 수, 1개월 미만 잔여일수는 미산정)
- Paddle이 환불을 자체 검토 절차로 처리하며 승인까지 시일이 소요될 수 있다는 점을 고객 기대치 관리 차원에서 명시
- 청약철회 기간을 최초 7일(국내 전자상거래법 기준)로 반영했다가, Paddle Buyer Terms가 전세계 공통 14일을 요구한다는 사용자 지적에 따라 즉시 14일로 재수정 — 근거 문구도 "Paddle 14일이 국내 7일보다 길어 상충 없음"을 드러내는 톤으로 조정
- 국문(`legal-modal.tsx`, `refund/page.tsx`) + 영문(`refund/page.tsx` Refunds 섹션) 3곳 동기화, 매 수정 후 `pnpm build` 통과 및 grep 재검색으로 누락 여부 확인

**텔레그램 채널/봇 운영 완전 중단**
- 작업 전 저장소 전체 "telegram" 대소문자 무관 grep + `t.me/` 링크 재검색으로 전수조사를 먼저 수행하고 목록을 사용자에게 제시한 뒤, 확정된 범위로 진행 — 관리자 화면 처리 방식·DB 컬럼 처리·API disable 방식 3가지는 AskUserQuestion으로 확인 후 결정
- 프론트엔드: 전역 텔레그램 플로팅 버튼(`telegram-float-button.tsx`) 삭제, 대시보드 헤더 알림 드롭다운·`/alerts` 페이지의 텔레그램 채널 카드 제거(알림 페이지는 이메일 다이제스트 카드만 남아 단일 컬럼으로 재구성), 이메일 다이제스트 템플릿 푸터의 텔레그램 SVG 아이콘 제거("telegram" 텍스트가 없어 1차 grep에서는 누락되고 `t.me/` 재검색으로 추가 발견된 부분)
- 크론/관리자: `vercel.json`에서 텔레그램 cron 2건 제거, 관리자 트리거 페이지·`COLLECT_JOBS`·admin run dispatcher에서 텔레그램 job 완전 삭제(사용자 결정: 내부 운영 화면이라도 완전 제거)
- API route(`/api/collect/telegram`, `/api/collect/telegram-digest`)는 삭제하지 않고 즉시 disabled 응답만 반환하도록 처리, `lib/notify/telegram*.ts`는 미사용 상태로 보존(사용자 결정 — BotFather 봇 계정 삭제 전까지 파일은 남겨둠)
- `filings.notified_telegram` DB 컬럼은 자동 생성 타입이라 건드리지 않고 그대로 둠(사용자 결정)

**빌드 검증**: 각 단계마다 `pnpm build` 성공, 에러 0건.

### 다음 작업 예정
- 사용자가 BotFather에서 텔레그램 봇 계정 비활성화/삭제 예정 — 완료 후 `lib/notify/telegram*.ts` 파일 삭제 여부 재검토

---

## 2026-07-06 · 세션 81

### Paddle 결제사 전환: Polar 전수조사, 공개 요금제/약관 페이지 신설, Paddle.js 체크아웃·웹훅 정식 연동

**Polar → Paddle 전환 전수조사**
- 저장소 전체 "polar" occurrence 16개 파일을 grep으로 전수조사 후 삭제/수정/데드코드 대상을 먼저 제시하고 사용자 확인을 받는 방식으로 진행 — `checkout-button.tsx`(미사용 데드코드)는 사용자 판단으로 보존 결정
- Paddle 체크아웃 방식은 Paddle.js 오버레이 체크아웃으로 확정(호스팅 체크아웃 링크 대비 Paddle Billing 표준 권장 방식)

**`/billing` 로그인 리다이렉트 원인 확인 → 공개 `/pricing` 페이지 신규 (`src/app/pricing/page.tsx`, `src/components/pricing-plans.tsx`)**
- `middleware.ts`의 `PROTECTED_PATHS`에 `/billing`이 포함돼 비로그인 방문자가 `/login`으로 리다이렉트되는 것이 Paddle 심사 크롤러가 가격을 못 본 원인으로 추정 → `/billing`은 로그인 유저 전용으로 유지하고, 로그인 불필요한 `/pricing`을 랜딩 디자인 시스템(HSL 토큰)으로 신규 생성
- `navbar.tsx`/`footer.tsx`에 "요금제" 링크 추가

**가격 상수 중앙화 (`src/lib/pricing.ts` 신규)**
- `PRO_MONTHLY_PRICE_KRW`/`PRO_ANNUAL_PRICE_KRW`/월 환산가/할인 개월수/`formatKrw()`/`TAX_NOTICE_KO`(VAT 포함 안내문)를 한 곳에 정의, `pricing-plans.tsx`·`billing-plans-client.tsx` 양쪽이 참조하도록 통일해 가격 변경 시 두 화면이 어긋나지 않게 함
- 가격 옆 "(VAT 포함)" 병기 + 하단 세금 안내 문구 추가(Paddle tax transparency 요건 대응)

**이용약관/환불정책 정적 페이지 분리 (`src/app/terms/page.tsx`, `src/app/refund/page.tsx` 신규)**
- 개인정보처리방침은 이전 세션에 Google OAuth 크롤러 이슈로 이미 `/privacy` 정적 페이지로 분리돼 있었으나, 이용약관·환불정책은 여전히 JS 모달(`legal-modal.tsx`)이라 Paddle 심사 크롤러도 인식 못 할 위험이 있음을 확인 → 동일 패턴으로 정적 페이지 신규 생성, `footer.tsx` 링크를 모달 트리거에서 페이지 링크로 교체
- `legal-modal.tsx`는 로그인 페이지·로그인 모달의 인라인 팝업(`terms`/`privacy`)에서 여전히 사용 중이라 삭제하지 않고, 아무 데서도 트리거되지 않게 된 `refund` 관련 죽은 분기(`REFUND_SECTIONS`, `MODAL_CONFIG.refund`, `LegalType`의 `"refund"`)만 제거

**Paddle 도메인 심사 반복 반려 원인 조사 — curl 기반 실증**
- apex(`tickerflow.net`) 접근 시 `www.tickerflow.net`으로 308 리다이렉트되는 것을 확인 — Paddle에 apex URL을 제출했다면 크롤러가 리다이렉트를 안 따라갔을 가능성
- `/pricing`의 월간/연간 탭이 `useState` 기본값 `"monthly"`라 연간 가격(₩142,800)이 서버 렌더링 raw HTML에 전혀 존재하지 않는 것을 `curl`+grep으로 실증 확인 — 가장 유력한 반려 원인으로 판단

**`/pricing` 탭 제거, 월간·연간 항상 동시 노출로 변경 (`pricing-plans.tsx`)**
- `useState` 탭 전환 로직 제거(상태가 없어져 서버 컴포넌트로 전환), Pro 카드 내부를 좌우 분할해 월간/연간 가격·CTA를 항상 함께 노출
- 배포 후 `curl -sL`로 raw HTML에 `14,900`/`142,800` 둘 다 포함되는 것 재확인
- `/billing`은 로그인 후 페이지라 Paddle 크롤러가 도달할 수 없어 탭 구조 그대로 유지(사용자 확인)

**Paddle.js 오버레이 체크아웃 `/billing` 정식 연동 (`billing-plans-client.tsx`, `package.json`)**
- `@paddle/paddle-js` npm 패키지 도입(Paddle 공식 React/Next.js 권장 방식) — CDN 스크립트 방식 대비 App Router 클라이언트 컴포넌트에 자연스럽게 맞아 선택
- 기존 "결제 준비 중" 안내 모달과 주석 처리된 Polar 로직을 제거하고 `paddle.Checkout.open()`으로 교체, 로그인 유저 이메일을 `customer.email`/`customData.email`로 전달, 결제 성공 시 `/billing?success=true`로 리다이렉트(기존 성공 배너 로직 재사용), `theme: dark`/`locale: ko` 적용
- 환경변수 3종(`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY`, `NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL`) `.env.local`·Vercel·`.env.local.example`(키 이름만) 등록

**Paddle 구독 웹훅 신규 구현 (`src/app/api/webhooks/paddle/route.ts` 신규)**
- Paddle 공식 문서를 WebFetch로 직접 확인(추정 없이 진행) — `Paddle-Signature: ts=...;h1=...` 헤더 형식과 `"{ts}:{raw body}"` 문자열의 HMAC-SHA256 서명 검증 방식 그대로 구현, `crypto.timingSafeEqual`로 비교 + 5분 타임스탬프 허용 오차로 리플레이 방지
- 구독 웹훅 payload엔 이메일이 없고 `customer_id`만 존재한다는 사실을 문서에서 확인 → 체크아웃 시 실어 보낸 `custom_data.email`로 유저를 식별하도록 체크아웃 코드도 함께 보완
- `subscription.created`/`updated`(status active) → `profiles.plan='pro'` + 기존 `proUpgradeEmail()` 재사용, `subscription.canceled`(또는 `updated`+status canceled) → `profiles.plan='free'`
- `PADDLE_WEBHOOK_SECRET` 환경변수 신규 추가, `middleware.ts`는 기존 `/api/webhooks/` 전체 통과 로직이 범용적이라 수정 불필요함을 확인만 하고 그대로 둠
- 배포 후 서명 없는 POST 요청에 404가 아닌 401(Invalid signature) 응답을 확인해 라우트 정상 배포 검증

**보안 점검**
- `.env.local.example`은 실제 시크릿 없이 커밋된 정상 템플릿 파일임을 확인, `.env.local`(실제 값)은 `git log --all --full-history` 기준 전체 히스토리에서 커밋된 적 없음을 검증

**빌드 검증**: 각 단계마다 `pnpm build` 성공, 에러 0건. `pnpm lint` 신규 이슈 없음(기존 무관 경고/에러는 그대로 유지).

### 다음 작업 예정
- Paddle 도메인 재심사 결과 대기 중(사용자 문의 접수 완료)
- Paddle Simulations로 `subscription.created`/`canceled` 이벤트를 시뮬레이션 발송해 `profiles.plan`이 실제로 동기화되는지 검증 필요
- `<title>` 중복 표시 문제(`layout.tsx`의 title template과 각 페이지 metadata title이 겹쳐 "요금제 | TickerFlow | TickerFlow"처럼 보임) 별도 처리 예정
- `billing/page.tsx`의 구독 해지 링크가 여전히 `https://polar.sh/tickerflow/portal`을 가리킴 — Paddle 고객 포털 URL로 교체 필요
- Polar 관련 코드·웹훅(`/api/webhooks/polar`, `/api/polar/checkout`, `@polar-sh/sdk` 등) 완전 삭제 작업은 전수조사만 하고 착수 전 상태로 보류 중

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

