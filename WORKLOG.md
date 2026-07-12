# TickerFlow — 개발 작업 기록

> 아카이브:
> - [세션 1–30](docs/worklog-archive/sessions-01-30.md)
> - [세션 31–60](docs/worklog-archive/sessions-31-60.md)
> - [세션 61–91](docs/worklog-archive/sessions-61-91.md)

---

## 2026-07-12 · 세션 101

### 데일리 다이제스트/블로그 데이터 정확성 버그 3건 + TOP30 순위 표현 재발 방지 구조화

**배경**: 일요일(휴장일) 실행분 블로그 초안·이메일을 스크린샷으로 검토하다가
"TOP30 데이터가 없습니다" 에러(블로그), "1건 STDN STDN" 표시 버그, "거래량이
가장 많았으며" 오표현, CPI 단위 누락을 순서대로 발견 → 수정 도중 "TOP30/N위"
순위 표기가 랜딩·대시보드·리포트에 재발한 근본 원인까지 구조적으로 막기로 확장.

**1. blog-draft.ts "TOP30 데이터가 없음" 원인 조사** (커밋 없음, 진단만)
- 실제 원인은 top30_daily가 아니라 `gatherDigestData()`가 세션97 리팩터 이후
  더 이상 top30_daily를 조회하지 않는데도 에러 문구만 예전 그대로 남은 것.
  진짜 원인은 `fetchTopCompanies()`가 보는 "오늘 UTC 1일" 창에 그날 신규
  filings/news/insider_trades가 0건(일요일)이라 `[]`가 반환된 것.

**2. 일간 다이제스트/블로그 1일 집계 UTC 자정 정렬 → rolling 24h** (커밋 `8fdda8b`)
- `computeRange(1)`이 UTC 자정 고정이라 10:00 KST(=01:00 UTC) 발송 시점엔 당일
  구간이 시작한 지 1시간 뿐이라 그날 수집분을 거의 반영하지 못하던 문제 수정.
  `days=1`만 `now-24h~now` rolling으로 분기, `days=7/30`(주간·월간 BRIEF)·랜딩
  TOP10은 기존 자정 정렬 그대로 유지.

**3. STDN 표시 버그 + 거래량 오표현 + CPI 단위 + 초보자 배려** (커밋 `ecad1f1`)
- STDN처럼 `tickers.name_en`이 아직 없어 티커 문자열 그대로 들어간 종목이
  이메일/블로그에 "STDN STDN"으로 중복 노출되던 버그 — 이름이 티커와 같으면
  이름 표시를 생략(`digestStockLink`/`tickerLabel`).
- "활동"(공시·뉴스·내부자매수 언급 건수)을 "거래량"으로 서술하는 LLM 오표현을
  금지 목록에 추가하고 데이터 정의를 프롬프트에 명시.
- CPI(소비자물가지수) 단위가 빈 문자열이라 "전월 대비 +1.57"처럼 단위 없이
  노출되던 문제 — `" 포인트"`로 수정.
- 이메일 배지(기관수급/실적/내부자/시장변화) 아래 초보자용 범례 한 줄 추가,
  프롬프트에 "데이터에 없는 지수·통계를 지어내지 말 것" 가드 추가.

**4. TOP30/TOP10/N위 순위 표현 전수 제거 → 안전장치 재설계** (커밋 `aa6c8ee`)
- 1차 시도(문장 통째 삭제, `stripRankSentences`)는 실제 생성 샘플로 검증한 결과
  주변 맥락이 끊기는 부작용 확인 → 폐기.
- `src/lib/collect/rank-language.ts` 신설: 관용구("TOP30 신규진입" 등)는 어미까지
  맞춰 중립 표현으로 치환하고, 그 외 단독 사용은 표현+조사만 제거해 나머지
  문장을 보존하는 `neutralizeRankLanguage()`로 교체(제목/해시태그용
  `stripRankTerms()`는 유지). digest.ts/blog-draft.ts/watchlist-brief.ts
  프롬프트에는 "이 금지 목록은 예시일 뿐이니 절대 쓰지 말 것"이라는 1차
  방어선 지시를 추가.

**5. 어드민 스코어링 import 경계 + 사용자 노출 문구 감사 스크립트** (커밋 `18bedda`, `cc81bd9`)
- `eslint.config.mjs`: `scoring.ts`/`top30.ts`/`top30-outcomes.ts`/
  `scoring/**`/`outcomes/**`를 어드민 화면·해당 크론 라우트·자기 자신 외에서
  import하면 lint/build가 실패하도록 `no-restricted-imports` 경계 추가.
- `scripts/audit-user-copy.ts` 신설 + `package.json` `prebuild`에 연결 —
  CLAUDE.md 6항·12항 금지 표현(순위 표기 + 투자 추천/주가 예측/투자 성과
  암시/투자 등급/종합 투자 점수)을 사용자 노출 코드에서 검사, 위반 시 빌드
  실패. 최초 190개 파일 스캔까지 확대(`src/app`·`src/components` 재귀 스캔
  + `summarize.ts`/`brief.ts`/`calls.ts` 등 실제 텍스트 생성 lib 파일 추가) 후
  위반 0건 확인. CLAUDE.md 10항에 19번 규칙으로 명문화.

**6. 스크롤 최상단 버튼 위치 수정** (커밋 `c7c0ee6`)
- `scroll-to-top.tsx`: 화살표 아이콘이 원형 배경 정중앙에 오도록
  `absolute inset-0 m-auto`로 교체.

**7. 운영 정책 페이지 v1.1 반영** (커밋 `269ada8`)
- `/policy` 본문을 v1.1(2026-07-12) 텍스트로 교체 — 1번(목적)·11번(결론) 문구와
  상단 버전 표기만 실질적 차이가 있어 두 섹션 + 헤더만 수정.

**검증**: `tsc --noEmit`/`eslint` 통과(신규 회귀 0), `pnpm build` 전체 통과
(prebuild 감사 190개 파일 위반 0건 → next build 60개 라우트 컴파일·정적생성
성공 → postbuild 웹훅 검증 통과). 서로 다른 관심사가 같은 파일(digest.ts/
blog-draft.ts)에 섞여 있어 커밋 분리 시 파일 내 훅 단위로 잘라 4개 커밋
(`fix(ui)`/`fix(data)`/`fix(compliance)`/`content(policy)`)으로 나눠 각각
롤백 가능하게 구성.

## 2026-07-11 · 세션 100

### 랜딩 히어로 실데이터 연동 + 랜딩 캐시 태그 통일 + 정책 페이지 정리

**1. 랜딩 히어로 목업 실데이터 연동** (커밋 `ae36e3b`)
- `src/app/page.tsx` 우측 대시보드 목업 3개 차트를 하드코딩 배열 → 실 DB
  집계로 교체: 공시유형분포 도넛(최근 7일 filings.form_type), 트렌드 바(일별
  건수, 빈 날짜 0), 섹터별 활동(tickers.sector 조인 상위 5개).
- 도넛/섹터 모두 데이터 부족 시 "데이터 없음" 정적 폴백. 부분 카테고리(일부
  form_type 0건) 케이스 로컬 렌더로 확인.

**2. 환불정책 페이지 로고 클릭 로딩 조사 → 랜딩 캐시 전면 재설계**
- 최초 문제 제기: "환불정책 페이지 로고 클릭 시 로딩 발생". 조사 결과 원인이
  개별 페이지가 아니라 Footer를 공유하는 6개 페이지(privacy/policy/terms/
  pricing/data-sources/refund) 전체에 해당 — 단, Footer 자체엔 로고 링크가
  없고(`footer.tsx` "TickerFlow"는 무링크 텍스트), 실제로는 이 페이지들이 함께
  렌더하는 `Navbar`의 로고가 원인.
- `Navbar`의 로고(`handleLogoClick` → `router.push("/")`)는 **하드 리로드가
  아닌 정상 소프트 내비게이션**으로 확인(`<a href>`/`window.location.href`
  아님) → `<Link>` 교체는 불필요 판단, 적용하지 않음.
- 체감 지연의 실제 원인: `/`가 `force-dynamic`이라 매 요청마다 Supabase 쿼리
  최소 17건(히어로 2 + 통계 7 + LandingTop10 4 + 실시간피드/주간집계 4)을
  재실행하는데, 앱 전체에 `loading.tsx`가 0개였음 — 대기 중 화면이 멈춘
  것처럼 보이는 게 "로딩 먹통"으로 체감된 원인.
- **조치 1**: `src/app/loading.tsx` 신규(전역 라우트 전환 스피너 폴백) —
  지연 자체를 없애는 게 아니라 대기 중 시각 피드백 제공.
- **조치 2**: 히어로 차트(2쿼리) + 통계 카운트(7쿼리) + LandingTop10(4쿼리)를
  하나의 캐시 태그(`LANDING_DATA_CACHE_TAG = "landing-data"`,
  `src/lib/landing-cache.ts` 신규)로 통일. 최초엔 시간 기반
  `revalidate: 3600`(1시간)으로 구현했으나, 최종적으로 **태그 전용
  (`revalidate: false`) + `/api/revalidate/landing` 크론(매일 04:00 KST =
  `"0 19 * * *"` UTC)** 방식으로 재교체(중복 캐시 전략 미유지).
  - `revalidateTag`가 이 Next.js 버전(16.2.9)에서 2번째 profile 인자를
    요구하는 것을 타입 에러로 발견 — `unstable_cache`의 `revalidate:false`와
    의미가 맞는 `"max"` 프로필 사용.
  - 신규 크론은 `admin/system/trigger/page.tsx`에 등록하지 않음(내부 배관성,
    수동 즉시실행 불필요 — 사용자 명시 지시).
  - 히어로 안내 문구 "매시간 업데이트" → "매일 새벽 업데이트"로 갱신.
  - 커밋 `3951379`.

**3. 환불정책 페이지 영문 표기 제거** (커밋 `bcde839`에 포함)
- `src/app/refund/page.tsx`의 영문 "Cancellation"/"Refunds" 섹션 삭제, 한글
  섹션만 유지.

**검증**: `pnpm dev` 렌더 확인(히어로 3차트 실값, 문구 위치, 캐시 무효화 API
401/200 동작), `pnpm build` exit 0(postbuild 웹훅 검증 포함), `tsc --noEmit`
클린. lint는 이 세션 내내 확인된 사전 존재 이슈(Date.now impure 3 + any 4 +
미사용 import 1, 총 8건)만 남고 신규 회귀 없음.

**커밋 순서**: `ae36e3b`(히어로 실데이터) → `3951379`(랜딩 캐시 태그 통일) →
`bcde839`(환불정책 영문 제거 + 전역 로딩 폴백).

## 2026-07-11 · 세션 99

### 스코어링 엔진 v2 — analyst_ratings·재무4팩터 활성화, 종목별 동적 정규화, 비보통주 필터

**배경**: 어드민 스크리너 3개 섹션(티커플로우 스크리너 / Top30 Ticker Overlay /
TOP30 Entry·Outcome)에 데이터를 공급하는 단일 엔진(`computeScores()`) 재설계.
세션56 개편 때 `analyst_ratings` 반영이 사용자 확인 없이 누락된 사고가 발단.
CLAUDE.md 10-18항 대상(가중치 체계 재설계)이라 Opus 전환 후 진행. 커밋 `3171c5b`.

**Phase 1 — 사전 조사 (읽기 전용)**
- `financial_metrics`: 값(revenue_growth_yoy·eps_growth_yoy·fcf·roic·roe)이 수집
  시점에 컬럼으로 이미 계산·저장됨 → 스코어링은 조회만. ROIC/ROE는 **소수·분기값**
  (실측 roic p50 0.011 / p90 0.047, roe p50 0.022), tiny denominator 이상치 존재
  (roic max 176 / roe min −3718).
- 정규화 구조 판단: 기존 `computeFinalScore()`는 **전역 고정 분모**(`getActiveWeightSum`,
  0.78)라 활성 팩터가 종목별 null이면 분자 0·분모 유지 = 0점 페널티. 사용자 요구
  ("null이면 미반영, 데이터 쌓이면 자동 반영")를 충족하려면 **종목별 동적 정규화
  리팩터링 선행 필요**로 판단·승인.

**Phase 2 — 가중치 설계 (승인)**
- analyst = 독립 팩터 8%(Estimate Revision 12% 슬롯 중 8% 승계, 4%는 보류).
  내부자거래(10%)보다 낮게 — sell-side 편향·후행성 반영.
- 공시이벤트 6종: cfo_change +4·guidance +3·dividend +3·lawsuit −4 편입,
  earnings/other는 제외(실적 팩터와 중복 / 무방향 volume 보상 방지).
- discoveryBonus 비활성 유지(정규화 밖 가산이라 별도 팩터 설계 필요), TODO만 정정.

**Phase 3 — 구현 / Phase 4 — 문서·문구 동기화**
- `weights.ts`: 13개 활성 팩터 재정의(합 96% + 보류 4%), `revision` 제거·`analyst`
  추가, `getActiveWeightSum` 제거·`RESERVED_WEIGHT` 추가.
- `scoring.ts`: 종목별 동적 정규화, analyst/재무4 raw 계산(analyst 최신 1건·최소
  3명, ROIC/ROE 이상치 가드 `|roic|≤1`·`|roe|≤2`), EVENT_WEIGHTS 4종 추가,
  비보통주 정규식 `-(WT[A-Z]?|U|R|RT|P[A-Z]?)$` 자격 필터, analyst/재무 쿼리
  (자격통과 종목 한정 chunk 조회), factorLog 재구성, 내부 주석 % 갱신.
- `version.ts`: SCORING_MODEL_VERSION v1 → v2.
- `admin/page.tsx`: 스크리너 라벨을 신 가중치로 재작성 + 신규 태그 라벨·색상.
- `CLAUDE.md` 18항: 표·원칙·2.5단계 노트 개정.
- `scripts/seed-financials.ts`(별도 생성): 재무 전종목 백필 + 비보통주 필터.

**최종 가중치 (활성 13개, 합 96% + 보류 4%)**

| 팩터 | 비중 | | 팩터 | 비중 |
| --- | --- | --- | --- | --- |
| 실적·가이던스 | 18% | | 공매도변화 | 5% |
| 기관수급(13F) | 15% | | 가격모멘텀 | 4% |
| 기업이벤트(공시) | 12% | | 매출성장률(YoY) | 4% |
| 내부자거래 | 10% | | EPS성장률(YoY) | 3% |
| 목표주가변화 | 9% | | FCF | 2% |
| **애널리스트 의견(신규)** | **8%** | | ROIC/ROE | 1% |
| 뉴스 | 5% | | (보류, 미배분) | 4% |

- 기존 8개 신호 팩터: 데이터 없어도 0(분모 유지). 재무4·analyst: null이면 종목별
  분자·분모 제외 → 데이터 축적 시 코드 변경 없이 자동 편입.
- Estimate Revision: 활성 제외, 3단계 로드맵으로만 유지.

**Phase 5 — 검증 (읽기 전용 `computeScores()` 실행)**
- 562종목 산출. 재무 보유 545 / analyst 보유 519 / 비보통주 결과 0개.
- 전/후: NVDA 109→219·RBRK 86→154(강한 재무+긍정 애널 상승), KMX 413→271(약한
  재무+부정 애널 하락) — 일괄 상승이 아니라 펀더멘털 기반 **재분배**.
- null 안전: 재무·애널 전무 종목(FCBM)도 정상 산출(신호팩터만으로 정규화).
- 규제: `factor_log`/`reason_tags`는 어드민 전용, 비어드민 소비처(landing-top10·
  email·blog-draft·watchlist-brief)는 팩트카운트 전환으로 미참조 — analyst 등급
  유출 없음.
- 미실행(사용자 직접): `/api/collect/top30` 트리거 + 3섹션 브라우저 확인
  (프로덕션 쓰기 + `/admin` OAuth 전용).

**발견된 부수 문제**
1. 공시이벤트 15종 중 6종(cfo_change/guidance/dividend/lawsuit/earnings/other)이
   그동안 배점에서 누락 → 4종 편입, 2종 의도적 제외.
2. `discoveryBonus` TODO가 "market_cap 컬럼 없음"을 근거로 남아있었으나 실제로는
   자격 필터에서 이미 사용 중 → 주석 현실화.
3. 스코어링 finalScore는 100 초과 가능한 상대 내부 점수(v1도 585 등 존재).
   신규 주석의 "0~100" 표기 오기를 "상대 내부 점수"로 정정. 어드민 시각화는
   점수를 텍스트로만 노출(막대/게이지 없음)이라 값 커져도 깨지지 않음 확인.
4. 우선주·워런트(-PA/-WT 등) 파생 티커가 자격 필터를 통과할 수 있던 구조 →
   정규식 필터로 스코어링·백필 양쪽에서 차단.

## 2026-07-11 · 세션 98

### 텔레그램 발송 죽은 코드 삭제 (telegram.ts, telegram-digest.ts)

**삭제: `src/lib/notify/telegram.ts`, `src/lib/notify/telegram-digest.ts`**
- 배경: 세션97 TOP10/TOP30 전수 점검에서 `telegram.ts`를 "cron/COLLECT_MAP에
  연결 안 된 비활성 코드"로 판단해 TOP10 로직만 우선 정리했으나, 사용자
  확인 결과 텔레그램 연동 자체가 의도적으로 완전히 끊긴 상태였음. 실제로
  `/api/collect/telegram`, `/api/collect/telegram-digest` 라우트 둘 다
  `runTelegramNotify()`/`runTelegramDigest()`를 호출하지 않고
  `{ok:false, disabled:true, error:"텔레그램 발송이 중단되었습니다."}`를
  즉시 반환하도록 이미 막혀 있었음(vercel.json cron 목록에도 없음) — 즉
  두 lib 파일은 어디서도 호출될 수 없는 완전한 죽은 코드였음.
- 다른 파일에서의 import 여부 확인(`@/lib/notify/telegram*` 참조 없음) 후
  두 파일 삭제. 라우트 파일(`/api/collect/telegram`,
  `/api/collect/telegram-digest`)은 이 lib를 이미 import하지 않고 있어
  삭제 영향 없음 — 라우트 자체는 이번 요청 범위가 아니라 그대로 유지.
- `tsc --noEmit` 통과 확인.

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
