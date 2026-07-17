# TickerFlow — 개발 작업 기록

> 아카이브:
> - [세션 1–30](docs/worklog-archive/sessions-01-30.md)
> - [세션 31–60](docs/worklog-archive/sessions-31-60.md)
> - [세션 61–91](docs/worklog-archive/sessions-61-91.md)

---

## 2026-07-18 · 세션 106

### insider_trades 캐시 무효화 도입 + Form 4 오귀속 버그 발견·근본 수정 완료

**배경**: NVDA 종목 스냅샷에서 BRIEF·Form 4 캐시가 재수집 이전 오염 데이터로
남아있던 사고를 조사·수정하는 과정에서, `invalidateInsiderDerivedCaches()`
(신설, `src/lib/collect/cache-invalidation.ts`)를 만들어 `refetch-insider-trades.ts`/
`resume-refetch-insider-trades.ts` 종료 시 호출하도록 연결했다(CLAUDE.md 5항에
규칙 기록). 이 함수를 테스트하는 도중 별개의 새 버그를 발견해 즉시 안전
조치(21건을 일반 템플릿으로 원복)만 하고 근본 수정은 별도 요청문으로
남겼는데, 같은 세션 106 안에서 사용자가 그 요청문을 그대로 다시 제출해
근본 수정까지 완료했다 — 처리 결과는 요청문 아래 "→ 처리 완료" 참고.

### 처리된 요청문 (기록용, 실행 완료)

```
Claude Code 요청문
사용자 원문

Form 4 같은 날 여러 명 제출 시 매칭 오귀속 버그 — 근본 수정 필요.
현재 NVDA 5건·MSFT 10건·AMZN 6건(총 21건)이 안전한 일반 템플릿으로
후퇴한 채 남아있음.

배경

resolveFilingSummary()의 fetchMatchingInsiderTrades()(src/lib/collect/
summarize.ts)가 insider_trades를 ticker+filed_at 날짜로만 매칭하고,
filing이 실제로 어느 SEC 제출자(accession)의 것인지는 구분하지 않는다.
같은 종목이 같은 날 여러 명의 Form 4를 낸 경우(이사회 전원 정기 보고
등), 그중 1명이라도 insider_trades에 데이터가 있으면 그 사람의 거래
문장이 다른 제출자들의 filing에도 그대로 복제·오귀속된다.

2026-07-18 invalidateInsiderDerivedCaches() 테스트 중 실측 확인:
- NVDA 2026-06-23: 6명이 제출(Stevens/Teter/Kress/Puri/Shoquist/Huang).
  insider_trades에는 Stevens 거래만 있어, 나머지 5명의 filing에도
  Stevens의 "885,000주 매도" 문장이 그대로 복제됨.
- MSFT 2026-06-12: 11명(이사회) 중 Numoto 1명만 insider_trades에 있어,
  나머지 10명에게 Numoto의 "4,500주 매도" 문장이 오귀속됨.
- AMZN 2026-05-26: 6명(Jassy/Garman/Herrington/Zapolsky/Olsavsky/Reynolds)
  전원의 filing이 5명(Olsavsky 제외)을 나열한 동일한 통합 문장을 그대로
  복제해서 보여줌 — 어느 filing.id를 봐도 "이 사람 한 명의 거래"가 아니라
  다른 사람들 거래까지 섞인 문단이 나옴.

위 21건은 발견 즉시 안전한 일반 템플릿으로 원복해뒀다(오귀속된 채로
방치하지 않음). 근본 수정 없이 재생성하면 같은 오귀속이 재발한다.

작업 지시

filings 테이블에 SEC accession number(또는 최소한 어느 reporting
person의 filing인지 식별할 값)를 저장할 수 있는지 확인 — 없다면
insider-form4.ts의 fetchForm4Owners()를 재사용해 filing.url로부터
직접 조회하는 방식 검토
fetchMatchingInsiderTrades()가 ticker+날짜뿐 아니라 (가능하다면)
reporting person 이름까지 매칭하도록 수정 — 이름을 특정할 수 없는
경우엔 지금처럼 안전하게 일반 템플릿으로 폴백 유지
근본 수정 완료 후, 위 21건(NVDA 5·MSFT 10·AMZN 6)을 정확한 문장으로
재생성
같은 날 2명 이상 제출 케이스가 filings 테이블 전체에 몇 건이나 있는지
전수 조사해서, 이번에 발견 못한 다른 종목에도 같은 오귀속이 있는지 확인
정기 크론(summarizeFilingsForTicker) 경로에도 근본 수정이 자동으로
적용되는지 확인 — invalidateInsiderDerivedCaches()만 방어하고 크론
경로는 여전히 무방비 상태였음

검증

pnpm build, tsc --noEmit 통과
수정 후 NVDA/MSFT/AMZN 21건이 각각 실제 제출자 본인의 거래만 정확히
서술하는지 재확인
전수조사로 찾은 다른 종목도 샘플 확인

출력 형식

원인 재확인 근거(SEC 원문 대조) 포함해서 보고
변경 파일명과 diff 요약, 파일 전체 출력 금지
```

**→ 위 요청문 처리 완료(같은 세션 106 내에서)**: `fetchMatchingInsiderTrades()`가
같은 (ticker, 날짜)에 filing이 2건 이상이면 `insider-form4.ts`의
`fetchForm4Owners()`로 이 filing의 실제 SEC 제출자를 조회해 이름까지
매칭하도록 수정(`summarize.ts`). 제출자를 특정 못하면 안전하게 일반
템플릿으로 폴백. 전수조사 결과 멀티필자 그룹은 전체 6개(MSFT×3·NVDA×1·
AMZN×1·AAPL×1) — AAPL은 원래도 오귀속 없었음을 확인, 나머지 5개 그룹
(NVDA 11건·MSFT 29건·AMZN 7건, 총 47건)을 리셋 후 필자별로 정확히
재생성해 SEC 원문과 대조 확인했다. `resolveFilingSummary`는
`summarizeFilings`(정기 크론)와 `summarizeFilingsForTicker`(온디맨드)가
공유하는 함수라 크론 경로도 자동으로 같은 보호를 받는다.
`cache-invalidation.ts`의 "멀티필자 날짜 건너뛰기" 임시 방어 로직도
근본 수정 완료로 제거(커밋 `9d1ee29`).

---

## 2026-07-14 · 세션 105

### 히어로 파티클 캔버스 — 모바일 실기기 정지 버그 원인 확정·수정

**배경**: 사용자가 안드로이드 갤럭시 크롬 실기기에서 히어로 파티클이
"TickerFlow" 글자로 모이지 못한 채 가로로 긴 흐릿한 타원형 얼룩 상태로
완전히 정지되고, 터치해도 반응이 없다고 스크린샷과 함께 제보. 이전 세션
104의 Playwright 헤드리스 모바일(390px) 테스트에서는 재현되지 않았던 문제.

**원인 조사** (수정 없이 원인 확정까지 별도 요청)
- Playwright `reducedMotion: 'reduce'` 컨텍스트 옵션으로 모바일 프로필(Pixel
  7) + 프로덕션(tickerflow.net)을 접속해 사용자 스크린샷과 픽셀 단위로
  거의 동일한 결과 재현. 같은 조건에서 `reducedMotion` 옵션만 뺀 대조
  테스트는 정상적으로 "TickerFlow" 글자로 수렴 — `prefers-reduced-motion:
  reduce`가 유일한 트리거임을 확정.
- `particle-canvas.tsx`가 `reduce=true`일 때 `renderStaticFrame()`(gpu.compute()
  60회)만 실행하고 `requestAnimationFrame(frame)` 루프를 아예 시작하지
  않는 구조였음. 60스텝으로는 전체 폭에 균등 분산된 초기 위치가 글자
  모양까지 수렴하지 못해 얼룩으로 보이고, 이후 루프가 없어 그 상태로 영구
  고정됨. `frame()` 내부에서만 터치/마우스 유니폼이 갱신되므로 터치 무반응도
  같은 원인의 증상(별개 버그 아님)으로 판명.
- 이전 헤드리스 테스트가 못 잡은 이유: Playwright 컨텍스트의 `reducedMotion`
  기본값이 `'no-preference'`라 명시적으로 켜지 않으면 이 경로를 안 탐.
- 참고: 세션 104에서 고친 "renderer.dispose() 후 재생성" 버그와는 별개의,
  같은 `reduce` 분기 아래 있던 **두 번째** reduced-motion 버그였음.

**결정 및 수정** (커밋 `b30de59`)
- 사용자 판단: "reduced-motion 배려 로직이 오히려 버그로 실사용에 역효과를
  냈고(터치 반응 상실, 브랜드 워드마크가 미완성 상태로 노출), 그 영향이
  접근성 배려보다 크다" — `prefers-reduced-motion` 분기 자체를 제거하기로
  결정. `reduce` 변수 선언, `renderStaticFrame()` 죽은 코드, 마운트/폰트로딩
  완료/리사이즈 3곳의 `if (reduce) {...} else {...}` 분기를 모두 제거하고
  모든 환경에서 동일하게 `requestAnimationFrame(frame)`만 실행하도록 통일.
- **PC 회귀 없음이 반드시 확인되어야 하는 제약**이 있었음 — 이 파일은
  데스크톱/모바일 공통 코드이기 때문. PC는 원래 `reduce=false` 경로만
  탔으므로 이번 변경이 논리적으로 영향 없어야 한다는 예상을 실제
  테스트로 재확인.

**검증**
- `tsc --noEmit`/`eslint` 에러 0, `pnpm build`(prebuild 카피 감사 →
  next build → postbuild 웹훅검증) 전체 통과.
- 로컬 dev 서버 대상 Playwright 재검증: 모바일+`reduce` — 애니메이션 정상
  진행되어 "TickerFlow" 글자로 수렴, 터치 시 반발 인터랙션 정상 작동.
  데스크톱(1440px) 일반 상태 — 파티클 렌더링/마우스 반발/GATHER↔SCATTER
  토글 모두 세션 104 검증 결과와 동일(회귀 없음). 데스크톱+`reduce` 조합도
  이제 정상 애니메이션(의도된 변경 그대로).
- `main`에 푸시(`a7ea2c8..b30de59`)해 Vercel 배포, 사용자가 실기기(갤럭시
  크롬)에서 정상 동작 확인 완료.

## 2026-07-14 · 세션 104

### 히어로 파티클 캔버스 + LIVE 위젯 통합, 랜딩 리디자인 시도/롤백, 잡다한 정리

**배경**: 사용자가 Three.js 기반 파티클 텍스트 애니메이션 컴포넌트(원본
참고 코드, GPUComputationRenderer로 "TickerFlow"를 파티클로 렌더링하고
커서로 흩뜨리는 인터랙션 + 우측 레일에 실시간 시장 상태 위젯)를 히어로에
통합 요청. 이 작업 전에 랜딩 전체 리디자인 시도가 있었으나 사용자가 "스타일
개선 효과가 없다"고 판단해 롤백.

**1. 랜딩 전체 리디자인 시도 → 롤백** (커밋 `01a09dd` → `71b8b87`로 되돌림)
- 병합 대시보드 패널, 벤토 그리드, 비대칭 비교, 통계 스트립 등 11개 섹션
  개편을 EnterPlanMode로 계획하고 구현까지 완료·커밋했으나, 사용자가 실제
  화면 확인 후 "전혀 스타일 개선 효과가 없다"고 판단해 `git revert`로
  되돌림. `.gitattributes`(LF 통일, CRLF발 `audit-user-copy.ts` 오탐 방지
  — 커밋 `1567f05`)는 무관한 별개 버그 수정이라 되돌리지 않고 유지.

**2. 히어로 좌측 "TickerFlow" 워드마크 → 파티클 캔버스, 우측 목업 → LIVE
위젯** (커밋 `6f99215`, `fa76e34`)
- 사용자가 제공한 Three.js 컴포넌트에서 캔버스 조각과 위젯 조각을 분리해
  히어로 좌/우에 각각 배치(1차 시도, 이후 3번에서 원본 비율로 재조정).
- `src/lib/market-clock.ts` 신설 — 대시보드 `MarketClock` 위젯의 KR/US
  개장 상태 계산 로직(`MARKETS`/`computeState`/`statusMeta`)을 공유
  lib로 분리, 히어로 LIVE 위젯이 더미 데이터 대신 이 실제 로직을 그대로
  재사용하도록 함.
- 구현 중 실제 버그 2건 발견·수정: ① `next/dynamic(ssr:false)`는 Server
  Component에서 직접 호출 불가(Next.js 제약) — 클라이언트 경계 파일로
  분리. ② `prefers-reduced-motion` 상태에서 캔버스가 완전히 빈 화면으로
  나오는 버그 — `renderer.dispose()` 후 같은 `<canvas>`에 새
  `WebGLRenderer`를 재생성하는 패턴(원본 코드 자체의 문제)이 폰트로딩/
  리사이즈 재초기화 시 렌더를 깨뜨림. renderer를 마운트당 한 번만 만들어
  재사용하도록 구조 변경.

**3. 히어로 레이아웃을 원본 참고 코드 비율로 재조정** (커밋 `1b897fa`)
- 1차 분리 배치(좌우 절반 2단 grid)가 원본 컴포넌트의 실제 비율·구성과
  달라 사용자가 원본 그대로 복원 요청. `particle-section.tsx` 신설 —
  원본의 `grid lg:grid-cols-[1fr_280px] lg:gap-6` 레이아웃을 그대로
  재현: 좌측은 캔버스가 박스 배경을 꽉 채우고 그 위 좌하단에 eyebrow/h1을
  `pointer-events-none` 오버레이로 겹침(마우스 반발 인터랙션은 캔버스가
  그대로 받음), 우측 레일은 LIVE 위젯 + 카피 카드("Every ticker is a
  living particle.") + GATHER/SCATTER 모드 버튼 원본 그대로 복원.
- `particle-canvas.tsx`에 scatter 관련 유니폼(`uScatter`/`uCenter`)과
  GLSL, `scatterCur` 보간을 복원. mode 상태는 캔버스(prop)와 버튼
  UI(로컬)가 모두 필요해 `particle-section.tsx`로 끌어올림(state
  lift-up). GLSL은 tsc가 문법을 못 잡는 순수 문자열이라 `grep -c 'vec2
  target'`로 변수 중복 선언 여부를 직접 확인하는 절차를 거침.
- 검증: Playwright로 브라우저 콘솔 셰이더 컴파일 에러 없음 확인, 참고
  이미지와 실제 스크린샷 비교, GATHER/SCATTER 클릭 인터랙션 확인.

**4. 히어로 상단 여백·폰트 미세조정** (커밋 `f427a1d`, `ed11460`)
- 파티클 섹션이 `fixed` 네비바(h-16)와 거의 맞닿는 문제 — 기존 히어로가
  쓰던 `pt-32 md:pt-40`을 적용했으나 과도하게 커서, 40% 수준인
  `pt-12 md:pt-16`(48px/64px)으로 재축소.
- eyebrow/h1 텍스트가 캔버스 대비 비중이 커서 미니멀하게 축소
  (`text-sm`/`text-4xl` → `text-xs`/`text-2xl` 기준, md도 비례 축소,
  줄간격도 `mb-3`→`mb-1`).

**5. 기타** — 히어로 아이바로우 문구 "미국 기업 변화 데이터 플랫폼" →
"미국 기업의 변화를 추적하는 데이터 플랫폼" 수정(커밋 `2d527a1`, 랜딩
리디자인 롤백 과정에서 두 번 적용됨).

**검증**: 매 커밋마다 `tsc`/`eslint`(신규 에러 0) 통과, `pnpm build`
(prebuild audit 194개 파일 위반 0 → 61개 라우트 → postbuild 웹훅검증)
전체 통과, Playwright로 데스크톱(1440px)·모바일(390px) 스크린샷 비교.

## 2026-07-13 · 세션 103

### 블로그 초안 프롬프트 — 근거 없는 해석 억제 (근거 기반 해석 원칙)

**배경**: 사용자가 어드민 블로그 초안 품질 저하를 지적. 문제는 "해석" 자체가
아니라 데이터로 뒷받침되지 않는 관성적 경제기사 관용구("시장 전반에 큰
영향을 미치는 신호로 읽혔다", "기술 업종 전반의 흐름을 시사하는 지표가 되곤
합니다")를 모델이 그대로 붙이는 것이었음 — 구체적인 좋은 예/나쁜 예를
사용자가 직접 제시.

**`src/lib/collect/blog-draft.ts` 프롬프트 수정** (커밋 `364d25f`)
- `DATA_INTERPRETATION_GUIDE`: 적용 범위를 섹션 ⑤("실적·공시·내부자거래로
  보는 오늘 데이터") 전용에서 ⑥("오늘 시장에서 읽을 포인트")까지 확장 —
  데이터를 종합하는 결론 문단이 근거 없는 일반화가 가장 잘 발생하는
  지점이라 판단. "모든 해석은 프롬프트에 주어진 데이터로 직접 뒷받침돼야
  한다"는 원칙과, "시사한다/영향을 미쳤다/시장의 관심을 받았다/신호로
  읽힌다/반영한다"는 해당 데이터만으로 설명 가능한 경우에만 쓰라는
  조건부 사용 규칙을 사용자가 준 NVIDIA·아마존 예시 그대로 추가.
- `ARTICLE_STRUCTURE_GUIDE` ⑥ 섹션에 "데이터 해석 지침을 함께 따를 것"
  참조 추가.
- `FOOTER_RULES`에 위 다섯 표현에 대한 응답 제출 전 자가검증 항목 추가
  (기존 순위 표기·나열 반복 자가검증 패턴과 동일한 방식).
- 위 다섯 표현은 조건부 사용(하드 배닝 아님)이라 `BANNED_BLOCK`에는 넣지
  않음 — `scripts/audit-user-copy.ts`의 `BANNED_PATTERNS`와도 매칭되지
  않아 `pnpm build` 사전 감사에 영향 없음을 확인.
- 검증: `tsc --noEmit` 통과. UI 변경이 아니라 LLM 프롬프트 텍스트 수정이라
  실제 생성 품질은 다음 크론 실행분(다음 날짜 블로그 초안)에서 확인 필요.

## 2026-07-13 · 세션 102

### 52주 범위 바 추가 + TICKERFLOW WEEKLY 위클리 다이제스트 신설 + 아이콘 원복

**1. 데일리 다이제스트 "이 기업" 섹션에 52주 최저·최고 범위 추가** (커밋 `2f05372`)
- 종목 스냅샷 페이지(`price-card.tsx`의 `RangeBar`)와 동일한 52주 최저/최고
  정보를 이메일에도 반영. `digest.ts`가 `stock_prices` 1년치를 추가 조회
  (기존 30일 스파크라인 쿼리와 별개), `templates.ts`에 인터랙티브 슬라이더
  대신 폭(%) 3칸 테이블로 위치를 표현하는 정적 HTML 바 추가.
- 실제 데이터로 검증: Realty Income(O) 기준 최저 $55.93~최고 $67.56 —
  스냅샷 페이지 스크린샷 수치와 정확히 일치 확인.
- 블로그 초안은 텍스트 기사 형식이라 시각 바를 넣을 화면이 없어 반영 제외
  (판단 근거 보고, 강제 아님).

**2. TICKERFLOW WEEKLY 위클리 다이제스트 신설** (커밋 `d5993ac`)
- 선행 점검(최우선 수행): `digest.ts`/`weekly-brief.ts`/`watchlist-brief.ts`
  전체에 어드민 전용 스코어링 엔진(`top30_daily`, `computeScores()` 등)
  참조가 **없음**을 재확인(남은 매치는 전부 세션97 제거 이력 주석). import
  경계 규칙(`eslint.config.mjs`)으로도 구조적으로 강제됨.
- 평일 히어로: "TICKERFLOW" → "TICKERFLOW DIGEST", 타이틀 "데일리
  다이제스트" → "미국 기업 데이터 브리핑"(배지·날짜·통계는 그대로).
- 신규 `computeThisWeekRange()`(`watchlist-brief.ts`) — "이번 주 월요일
  00:00 UTC ~ 발송 시점"으로 range 계산(기존 `computeRange(7)`은 무수정).
  신규 `weekly-digest.ts`가 `weekly-brief.ts`와 동일한 집계 함수를 이 range로
  재호출해 토요일 발송 시점에도 신선한 데이터를 확보(대시보드용
  `weekly_briefs` 캐시는 건드리지 않음). 수신 대상은 `getDigestRecipientEmails()`
  로 평일 다이제스트와 동일 쿼리 공유.
- `vercel.json`: 평일 다이제스트 크론을 월~금으로 제한, 토요일 전용
  위클리 크론 추가(일요일 미발송). 어드민 트리거 페이지에 수동 실행 버튼 +
  크론 스케줄 표 갱신. CLAUDE.md 20항에 "v5 전면 재설계 보류, 점진적 개선"
  방침 기록.
- 검증: `tsc`/`eslint`/`audit:copy`(191개 파일, 위반 0)/`pnpm build` 전체 통과,
  실제 데이터로 daily·weekly 히어로 렌더링 결과 직접 확인(시스템 시각 기준
  일요일 실행 시 "이번 주"가 지난 월~금으로 정확히 계산됨을 실측 확인).

**3. 이메일 섹션 제목 아이콘 추가 → Gmail 접힘 현상으로 원복** (커밋 `c525e26`)
- 위 2번 작업에 포함해 섹션 제목에 인라인 SVG 아이콘(`digestIcon()`/
  `SEC_ICON`)을 추가했으나, Gmail에서 본문 일부가 "···"로 접히는 현상 발생.
  HTML 용량은 16.9KB로 Gmail 공식 클리핑 임계값(~102KB)에 한참 못 미쳐
  용량 문제가 아님을 실측으로 배제(근본 원인 조사는 하지 않음, 사용자
  지시대로 아이콘 관련 코드만 원복).
- `digestIcon()`/`SEC_ICON` 삭제, daily·weekly 14곳의 `digestSecTitle()`
  호출을 텍스트 전용으로 복원. Resend로 관리자 Gmail에 실제 테스트 메일
  발송해 해소 확인(사용자 확정: "말끔히 개선됐어").
- 메모리 기록: 이메일 템플릿에 인라인 SVG 아이콘 사용 금지
  (`feedback_email_inline_svg_gmail.md`).

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
