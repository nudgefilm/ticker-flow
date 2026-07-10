import { gatherDigestData } from "./digest";
import type { DigestData } from "@/lib/email/templates";

// 이 모듈이 생성하는 텍스트는 어드민 내부 도구 결과물이 아니라, 검수 후 그대로
// 외부(네이버 블로그, X/Threads/LinkedIn 등)에 게시될 콘텐츠다. CLAUDE.md 18항의
// "어드민 전용 규제 예외" 대상이 아니므로, 일반 CLAUDE.md 원칙(6항 투자 권유
// 금지, 8항 "AI" 단어 금지, 14항 사실 서술체 원칙)을 다른 사용자 노출 화면과
// 동일하게 그대로 적용해야 한다.

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// 대시보드 화면용 표준 면책 문구("본 서비스는...")는 서비스 UI를 지칭하는
// 표현이라 블로그 콘텐츠 맥락에 맞지 않는다. 블로그·유튜브 쇼츠 등 서비스
// 화면 밖으로 나가는 콘텐츠는 이 "TickerFlow Note" 문구를 사용한다
// (CLAUDE.md 14항 참고 — 콘텐츠 성격별 면책 문구 구분 원칙). 두 문구 모두
// 모델이 생성하지 않고 코드에서 고정 상수로 삽입한다.
//
// 2026-07-11: 시사·경제 매체 게재는 관련법 해석상 어려울 것으로 판단해 보류하고,
// 대신 콘텐츠 생성 과정에 인공지능 기반 자동 요약 시스템이 쓰였다는 사실을
// 명시적으로 고지하는 문구로 교체했다("AI" 표기 대신 CLAUDE.md 10항에 맞춰
// "인공지능"이라는 완전한 표현을 사용).
const DISCLAIMER =
  "TickerFlow Note\n" +
  "본 콘텐츠는 공개된 기업 데이터(SEC 공시, 기업 공시, 실적 발표, 내부자 거래 등)를 바탕으로 인공지능 기반 자동 요약 시스템을 통해 정보 제공을 목적으로 생성된 초안을 참고하여 작성되었으며, 특정 종목에 대한 투자 권유, 투자 자문 또는 매매를 유도하기 위한 목적을 갖지 않습니다. 투자 판단은 다양한 정보를 함께 검토한 뒤 본인의 책임하에 결정하시기 바랍니다.\n\n" +
  "데이터 제공 : TickerFlow";

// SNS 요약본은 글자수 제약이 커서 위 전체 문구 대신 축약 문구를 사용한다.
// 2026-07-11: DISCLAIMER와 동일하게 인공지능 자동 요약 고지를 포함하는
// 축약형으로 교체(사용자 확정 문구, 어미·구두점 변경 금지).
const SHORT_DISCLAIMER = "\n\n※ 인공지능 자동 요약 | 투자 권유 아님 | TickerFlow";

// 본문 목표 분량 — "오늘의 기업동향" 통합 포스팅 기준 1,600자 내외.
const BODY_LENGTH_RANGE: [number, number] = [1400, 1900];
const BODY_LENGTH_TARGET = 1600;

// 카테고리는 자유 생성이 아니라 반드시 이 6개 중에서만 선택하도록 프롬프트에서 강제한다.
// 2026-07-11: "TOP30 변동" → "관측 종목 변동"으로 교체 — 자본시장법 유사투자
// 자문업 리스크 점검(세션97)에 따라, TickerFlow 자체 스코어링 기반 "TOP30"
// 표현을 공개 노출 지면에서 전부 제거하는 조치의 일부.
const FIXED_CATEGORIES = ["기업 동향", "시장 흐름", "실적 발표", "경제지표", "관측 종목 변동", "내부자 거래"];

// ─── 이미지 프롬프트 (LLM 미사용 — 코드 템플릿 조합) ────────────────────────────

const IMAGE_TEMPLATE = {
  headline: "오늘의 나스닥 기업동향",
  theme:    "종합 대시보드 스타일, 다크 테마, 미니멀 금융 UI",
  accent:   "블루 (#60a5fa)",
};

/** 고정 구조(Headline/Subtitle/Theme/Accent)에 그날의 핵심 키워드만 삽입한다. */
function buildImagePrompt(kstDate: string, dashboardKeyword: string): string {
  return [
    `Headline: ${IMAGE_TEMPLATE.headline}`,
    `Subtitle: ${kstDate}`,
    `Theme: ${IMAGE_TEMPLATE.theme}`,
    `Accent: ${IMAGE_TEMPLATE.accent}`,
    `Dashboard: ${dashboardKeyword || "데이터 없음"}`,
  ].join("\n");
}

// ─── ⑦ "TickerFlow에서 함께 확인해 보세요" 섹션 (요청 사항 8번 — LLM 미사용) ───────
//
// 이미지 프롬프트와 같은 이유로 코드 고정 문구를 사용한다: 모델이 매번 다른
// 표현으로 서비스 소개를 생성하면 과장된 홍보 문구가 섞이거나, 사이드바에
// 실재하지 않는 기능명을 언급할 위험이 있다. 실제 사이드바 메뉴(CLAUDE.md 8항
// — 공시 피드/뉴스 피드/실적 캘린더/인사이더/와치리스트)만 자연스러운 문장
// 흐름으로 언급하고, "지금 가입하세요" 류의 CTA는 쓰지 않는다.
function buildFollowUpBlock(): string {
  return [
    "TickerFlow에서 함께 확인해 보세요",
    "",
    "오늘 언급된 기업들의 관련 SEC 공시 원문과 최신 뉴스, 다가오는 실적 발표 " +
      "일정, 내부자 거래 내역은 공시 피드와 뉴스 피드, 실적 캘린더에서 이어서 " +
      "확인할 수 있습니다. 관심 종목으로 등록해두면 새로운 공시나 뉴스가 " +
      "등록될 때마다 해당 종목의 변화를 놓치지 않고 추적할 수 있습니다.",
  ].join("\n");
}

// ─── 내부 링크(관련 글 추천) 섹션 (요청 사항 9번 — LLM 미사용) ────────────────────
//
// 실제로 게시된 글이 있는지는 확인하지 않고, 오늘 데이터에 등장한 개념을
// 독자가 이해하는 데 도움이 될 만한 용어 설명형 글 제목만 제시한다(사용자
// 확인: "관련 글 유무는 확인할 필요 없이 제목만 제시"). 제목 자체를 모델에게
// 맡기지 않는 이유는 위 buildFollowUpBlock()과 동일 — 고정 풀에서 오늘 가장
// 많이 등장한 태그와 매칭되는 제목을 뽑아 항상 검증된 표현만 노출한다.
// 2026-07-11: 매칭 기준을 top30_daily.reason_tags(스코어링 태그) → 오늘 활동
// 기업의 descriptions에 실제로 등장하는 문구(filings.event_type 기반, 사실
// 표현)로 교체. GLOSSARY_TOPIC_MAP의 key는 태그 코드가 아니라 description
// 문자열의 부분 일치 대상이다.
const GLOSSARY_TOPIC_MAP: Record<string, string> = {
  "CEO 교체 공시":    "경영진 변경 공시란?",
  "CFO 교체 공시":    "경영진 변경 공시란?",
  "자사주 매입 공시":  "자사주 매입이란?",
  "인수합병 공시":    "M&A(인수합병) 공시란?",
  "가이던스 변경 공시": "가이던스란?",
  "대규모 계약 공시":  "대규모 계약 공시란?",
};

// 오늘 데이터에서 위 매칭이 하나도 없을 때(또는 3개를 못 채울 때) 사용하는
// 기본값 — 항상 3개를 보장한다.
const DEFAULT_GLOSSARY_TOPICS = ["EPS 예상치 상회란?", "Form4 내부자 거래란?", "가이던스란?"];

/** 오늘 실적 상회/내부자 매수/공시 유형 중 실제로 확인된 것부터 관련 글 제목 3개를 고른다. */
function pickRelatedTopics(data: DigestData): string[] {
  const picks: string[] = [];

  if (data.earningsBeatToday.some((e) => e.epsBeat)) picks.push("EPS 예상치 상회란?");
  if (data.earningsBeatToday.some((e) => e.revenueBeat) && !picks.includes("매출 예상치 상회란?")) {
    picks.push("매출 예상치 상회란?");
  }
  if (data.insiderBuyToday.length > 0 && !picks.includes("Form4 내부자 거래란?")) {
    picks.push("Form4 내부자 거래란?");
  }

  const allDescriptions = [
    ...data.top3.flatMap((i) => i.descriptions),
    ...data.top4to10.flatMap((i) => i.descriptions),
    ...data.newEntrants.map((i) => i.description),
  ];
  for (const desc of allDescriptions) {
    if (picks.length >= 3) break;
    for (const [needle, topic] of Object.entries(GLOSSARY_TOPIC_MAP)) {
      if (desc.includes(needle) && !picks.includes(topic)) { picks.push(topic); break; }
    }
  }

  for (const fallback of DEFAULT_GLOSSARY_TOPICS) {
    if (picks.length >= 3) break;
    if (!picks.includes(fallback)) picks.push(fallback);
  }
  return picks.slice(0, 3);
}

function buildRelatedArticlesBlock(topics: string[]): string {
  return ["함께 읽으면 좋은 글", "", topics.join("\n")].join("\n");
}

// ─── SEO 슬러그 (요청 사항 7번 — LLM 키워드 + 코드 조합) ───────────────────────────
//
// 모델에게 슬러그 전체를 맡기면 한글이 섞이거나 URL에 부적합한 문자를 낼 수
// 있어, 모델은 짧은 영문 키워드([SLUG_KEYWORDS])만 제안하고 코드가 검증된
// 날짜 형식과 결합해 최종 슬러그를 만든다.
function parseKstDateToIso(kstDate: string): string {
  const match = kstDate.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
  if (!match) return "0000-00-00";
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSlug(kstDate: string, rawKeywords: string): string {
  const datePart = parseKstDateToIso(kstDate);
  const keywordPart = slugify(rawKeywords);
  return keywordPart ? `${datePart}-${keywordPart}` : datePart;
}

// ─── 공용 프롬프트 블록 ─────────────────────────────────────────────────────────

const BANNED_BLOCK = `절대 금지 표현 (아래 표현 및 이와 유사한 표현 사용 금지 — 종목 매수·매도를
권유·제안하거나 주가 방향을 예측하는 뉘앙스는 형태를 바꿔서도 사용하지 말 것)
- 포착, 선정, 추천, 추천 종목, 유망 종목, 투자 기회, 강력 추천
- 상승 신호, 하락 신호, 상승 예상, 하락 예상, 주가 전망, 목표주가, 적정주가, 강세 예상, 약세 예상
- 수익률 보장, 초과 수익, 높은 수익 기대, 투자 성공 가능성
- Strong Buy, Buy, Sell, 적극 매수, 적극 매도, 매수 추천, 매도 추천, 매수하세요, 매도하세요, 지금 매수, 지금 매도
- 투자 점수, 투자 매력도, 추천 점수, 매수 신호, 매도 신호, 매수 신호 점수
- 주목할 만한, 눈여겨볼, 관심이 집중된, 이목을 끄는, 활발한 움직임
- 강세, 약세, 상승 기대, 하락 우려, 투자 매력, 긍정적 신호, 부정적 신호
- 호조, 부진, 선전, 고전, 실적 우수, 실적 부진 (실적을 좋다/나쁘다로 평가하는 표현 — "예상치 상회/하회"처럼 수치 비교로만 서술할 것)
- 투자 권유, 투자 추천, 투자 인사이트, 투자 전략, 매수 기회, 급등 예상, 저평가, 고평가
- 종목 분석, 투자 분석 (특정 종목의 투자 매력·적합성을 평가·판단하는 프레이밍 자체를 금지 — 사실 나열이 아니라 "평가"로 읽히는 문장이면 형태를 바꿔서도 쓰지 말 것)
- TOP10, TOP30, TOP20, "N위"(1위·5위 등 순위 표기), 순위, 랭킹, 선정, "OO에 진입/편입/이탈"
  (TickerFlow 자체 스코어링(가중치 기반 종합 평가) 결과를 순위·선정 형태로
  노출하는 것 자체가 금지 대상이다 — investment-advice 여부와 별개로, "가치에
  관한 조언"으로 해석될 수 있는 순위 발행 자체를 피해야 한다. "여러 기업에서
  공시가 확인되었습니다"처럼 순위 없는 사실 나열로 바꿔 쓸 것)

허용 표현 예시 (참고: "내부자 매수/매도 확인"처럼 공시에 기록된 거래 유형을
사실 그대로 서술하는 것은 금지 대상이 아니다 — 위에서 금지하는 것은 특정
종목을 사라거나 팔라고 권유하는 뉘앙스다)
- ~가 관측됐습니다 / ~가 확인됐습니다 / ~공시가 제출됐습니다 / ~건이 집계됐습니다 / ~변화가 있었습니다
- 최근 공시에서 다음 변화가 확인되었습니다 / 최근 30일 동안 관련 공시가 증가했습니다 / 과거 유사 사례가 존재합니다`;

const SHARED_PRINCIPLES = `원칙
- 사실 기반 서술만 사용할 것. 분석·해설·의견·전망은 추가하지 말 것.
- "~했습니다", "~확인됐습니다", "~집계됐습니다" 형태의 사실 서술체로만 작성할 것.
- 투자 판단과 관련된 표현은 중립적으로 서술할 것.
- 같은 개념 설명을 여러 문단에 걸쳐 반복하지 말 것. 이 글의 핵심 주제에 대한
  개념 설명은 1회만 간결하게 다루고, 이 글의 핵심 주제가 아닌 인접 개념은
  굳이 재설명하지 말고 필요하면 한 문장으로만 짧게 언급할 것.`;

const TITLE_GUIDE = `제목 작성 지침 (SEO 고려)
- 단순히 수치나 종목명을 나열하는 제목은 금지합니다 (예: "오늘의 나스닥 동향: AAPL, MSFT 실적 발표").
- 오늘 데이터 중 가장 특징적인 지점 하나를 골라, 질문형(예: "오늘 나스닥에서
  이 기업에 무슨 일이?")·리스티클형(예: "오늘 나스닥에서 확인된 N가지
  변화")·궁금증 유발형 중 하나의 방식으로 클릭을 유도하는 제목을 작성하세요.
- 검색 노출을 고려해, 제목에 오늘 가장 눈에 띈 기업명 또는 이벤트 종류(실적,
  내부자 거래, 공시 등) 중 최소 1개를 자연스럽게 포함하세요.
- 과장이나 자극적인 문구, 투자 권유로 해석될 수 있는 표현은 사용하지 마세요
  (아래 "절대 금지 표현" 목록 참고).`;

// ─── 경제기사체 톤 가이드 (가장 중요한 지침 — 문장 패턴 반복 방지) ────────────────
//
// 종결 표현만 바꿔서는("확인됐습니다"→"나타났습니다") 여전히 "주어+사실+
// 종결어미"라는 동일한 문장 구조가 문단마다 반복돼 보고서체처럼 읽힌다.
// 이 가이드는 문장 "구조" 자체를 다양화하라는 지침으로, SENTENCE_VARIETY_GUIDE
// (종결어미 다양화)보다 상위 원칙이다 — 항상 이 가이드를 먼저 적용할 것.
const ECONOMIC_ARTICLE_TONE_GUIDE = `문체 원칙 (경제기사체 — 가장 중요한 지침)
- 사실 서술 원칙은 그대로 유지하되, 문장을 단순 보고서체가 아니라 경제기사체로
  작성할 것.
- 같은 문장 패턴("~가 확인됐습니다", "~가 나타났습니다", "~가 제출됐습니다"처럼
  매 문장이 "주어 + 사실 + 종결어미" 구조로 반복되는 것)을 쓰지 말 것. 문장
  구조 자체를 다양하게 바꿀 것.
  나쁜 예: "실적 발표와 내부자 거래 공시가 같은 날 동시에 늘어난 것이 오늘
  데이터의 특징으로 확인됐습니다. 반도체 업종에 이벤트가 몰리면서, 여러
  업종에 걸쳐 기업 이벤트가 함께 나타난 하루였습니다."
  좋은 예: "오늘 데이터에서는 반도체 업종의 존재감이 특히 두드러졌습니다.
  실적 발표와 내부자 거래 공시가 같은 시점에 이어지면서 관련 데이터가
  집중됐습니다. 하루 동안 기업 이벤트가 여러 형태로 겹쳐 나타난 점도
  눈에 띄었습니다."
- 데이터를 하나씩 나열하는 방식이 아니라, "오늘 시장에서 무엇이 두드러졌는가"
  를 중심으로 문장 간 인과·흐름을 자연스럽게 연결해서 서술할 것.
- 데이터 자체(수치, 종목, 건수)는 그대로 유지하되, 독자가 끝까지 읽게 만드는
  기사 문체를 우선할 것.
- 투자 판단이나 미래 전망은 절대 포함하지 말 것(아래 "절대 금지 표현" 참고) —
  문체를 기사체로 바꾸는 것과 투자 의견을 추가하는 것은 다르다.`;

// ─── 글 구조 가이드 (요청 사항 2번 — 리포트형 → 기사형 전환의 핵심) ────────────────
//
// 예전에는 "핵심 요약 → 슬라이스별 나열 → 마무리" 순서로 소제목 없이 문단만
// 이어 붙이는 보고서 형식이었다. 지금은 경제신문 "오늘의 시장 브리핑" 기사
// 형식을 기본 템플릿으로 강제한다. ⑦ "TickerFlow에서 함께 확인하면 좋은 데이터"
// 섹션과 "함께 읽으면 좋은 글"(내부 링크) 섹션은 모델에게 맡기지 않고
// buildFollowUpBlock() / buildRelatedArticlesBlock()에서 코드가 고정 문구로
// 붙인다 — 모델이 매번 다른 표현으로 서비스 소개를 만들면 과장된 홍보 문구나
// 실재하지 않는 기능을 언급할 위험이 있기 때문이다. 모델은 아래 ②~⑥까지만
// [BODY]에 작성한다 (①제목은 [TITLE]에서 별도 작성).
const ARTICLE_STRUCTURE_GUIDE = `글 구조 (아래 순서와 소제목 문구를 그대로 따를 것 — 경제신문 "오늘의 시장 브리핑" 형식)

② 오늘 시장 한 줄 요약 (리드 문단)
- [BODY] 맨 앞에 소제목 없이 2~3문장으로 시작할 것.
- 오늘 시장에서 가장 중요한 변화 1~2가지만 먼저 전달할 것. 기업명을 여러 개
  나열하거나 수치를 여러 개 늘어놓지 말 것 — 리드는 "무슨 일이 있었는지"를
  가장 압축된 형태로 전달하는 문단이다.

③ 오늘 가장 주목할 변화 3가지
- 소제목 줄에 정확히 "오늘 가장 주목할 변화 3가지"라고 쓸 것.
- 아래 데이터를 근거로 오늘 가장 중요한 변화 3가지를 고를 것. 이때 셋을
  동등한 나열이 아니라 "가장 비중 있는 변화가 무엇이었는지" 순서를 정해서
  서술할 것 — 가장 큰 변화를 먼저 짚고, 나머지 두 가지는 "동시에", "여기에
  더해", "여기에 ~까지 겹치며"처럼 그 변화에 뒤이어 일어난 흐름으로 연결할 것.
- "첫째", "둘째", "셋째", "1)", "2)", 번호, "-" 같은 나열 기호나 순서 표시
  단어는 절대 쓰지 말 것.
  나쁜 예(동등 나열): "반도체 업종에서 실적 예상치를 상회하는 기업이 다수
  확인되었습니다. 브로드컴을 비롯한 일부 기업에서 대규모 내부자 매수 공시가
  제출되었습니다. 팔란티어와 관련된 신규 공시도 확인되었습니다."
  좋은 예(비중 있는 순서로 연결): "오늘 시장에서는 반도체 업종의 실적
  발표가 가장 큰 변화를 만들었습니다. 동시에 일부 기업에서는 내부자 매수
  공시가 이어졌습니다. 여기에 신규 공시가 겹치면서 기업 이벤트가 하루에
  집중됐습니다."

④ 오늘 가장 눈에 띈 기업
- 소제목 줄에 정확히 "오늘 가장 눈에 띈 기업"이라고 쓸 것.
- [오늘 가장 눈에 띈 기업] 데이터를 중심으로 1~3개 기업만 소개할 것. 아래
  "기업 소개 작성 지침"을 따를 것.

⑤ 실적·공시·내부자거래로 보는 오늘 데이터
- 소제목 줄에 정확히 "실적·공시·내부자거래로 보는 오늘 데이터"라고 쓸 것.
- [오늘 시장 변화 건수], [실적 예상치 상회 종목], [내부자 매수 확인 종목] 등을
  근거로 오늘 데이터의 특징을 설명할 것. 아래 "데이터 해석 지침"을 따를 것.

⑥ 오늘 시장에서 읽을 포인트
- 소제목 줄에 정확히 "오늘 시장에서 읽을 포인트"라고 쓸 것.
- 이 섹션은 기자의 결론에 해당한다. 앞서 다룬 리드·변화 3가지·대표 기업·
  데이터 섹션을 요약 재나열하지 말고, 오늘 데이터 전체를 종합했을 때 어떤
  특징이 있었는지 최소 2~3문장으로 정리할 것 — 1문장으로 짧게 끝내지 말 것.
  독자가 이 문단만 읽고 "오늘 시장이 이런 분위기였구나"를 파악할 수 있어야
  한다.
  예: "오늘은 실적 발표와 내부자 거래 공시가 같은 날 겹치며 기업 이벤트가
  집중된 하루였습니다. 특히 반도체 업종을 중심으로 관련 데이터가 이어졌고,
  일부 종목에서는 새로운 공시 활동도 함께 확인되었습니다."
- "무엇이 확인됐는지"까지만 정리하고, 투자 판단으로 이어질 수 있는 전망·예측·
  권유는 절대 덧붙이지 말 것(아래 "절대 금지 표현" 참고).

소제목 작성 규칙
- 소제목은 위에 지정된 문구를 정확히 그대로 쓸 것. 마크다운 기호(#, ** 등)를
  붙이지 말고 순수 텍스트 한 줄로만 작성할 것.
- 소제목 줄과 그 아래 본문 문단 사이는 빈 줄로 구분할 것.
- ②~⑤ 각 섹션의 마지막 문장에는, 다음 섹션 내용과 자연스럽게 이어지는 연결
  문장을 넣을 것 (예: "이러한 변화는 오늘 실적 발표 데이터에서도 이어졌습니다.",
  "공시와 함께 내부자 거래에서도 비슷한 흐름이 확인됐습니다."). 각 섹션이
  서로 무관한 데이터 조각처럼 뚝뚝 끊어지지 않고, 하나의 기사로 흐르듯 읽혀야
  한다.
- ⑦ "TickerFlow에서 함께 확인하면 좋은 데이터"와 내부 링크(관련 글 추천)는
  [BODY]에 쓰지 말 것 — 서비스 코드가 자동으로 이어붙인다.`;

// ─── 종목 나열 최소화 가이드 (요청 사항 3번) ────────────────────────────────────
//
// 데이터([오늘 활동이 활발한 기업 목록] 등)는 여전히 오늘 활동 상위 기업
// 전체를 프롬프트에 그대로 넘긴다(데이터 수집량을 줄이는 것이 아니라
// "서술 방식"만 압축하는 것이 목적).
const TICKER_LISTING_GUIDE = `종목 나열 지침
- 데이터에 있는 종목을 전부 본문에 한 줄씩 나열하지 말 것 (예: "AAPL, MSFT,
  NVDA..."처럼 티커를 줄줄이 늘어놓는 서술 금지).
- 본문 전체에서 이름을 직접 언급하는 종목은 3~5개 이내로 제한하고, 나머지는
  "여러 기업", "다수 종목", "상위 종목" 등의 표현으로 자연스럽게 묶어서
  서술할 것.
- 아래 데이터는 참고용 전체 목록이며, 이 중 어떤 종목의 이름을 실제로 본문에
  언급할지 고르는 것은 이 작성 지침에 따라 모델이 판단할 부분이다.`;

// ─── 기업 소개 간결화 가이드 (요청 사항 4번) ────────────────────────────────────
const COMPANY_INTRO_GUIDE = `기업 소개 작성 지침 ("오늘 가장 눈에 띈 기업" 섹션 전용)
- 회사 연혁, 사업 영역 설명, 창업 배경 등을 길게 서술하지 말 것.
- 기업 이름으로 바로 시작하지 말 것. 첫 문장에서 먼저 "오늘 데이터 가운데
  가장 대표적인 사례는 ○○였습니다." 또는 "오늘 가장 많은 변화가 확인된
  기업은 ○○였습니다."처럼, 이 기업을 왜 대표 사례로 소개하는지부터 밝히고
  그다음 문장에서 구체적인 내용을 이어서 작성할 것.
- "오늘 왜 이 기업이 데이터에 등장했는가"를 중심으로, 기업당 150~200자
  내외로 간결하게 작성할 것.
- 예: "오늘 데이터 가운데 가장 대표적인 사례는 OOO였습니다. 오늘 실적
  발표에서 매출이 예상치를 상회했다는 공시가 확인되며 관련 데이터가 다수
  갱신되었습니다." 형태로, 오늘의 변화 사실 위주로 서술할 것.`;

// ─── 데이터 해석 가이드 (요청 사항 5번) ────────────────────────────────────────
//
// [Hard Rule] 데이터의 "의미"는 설명할 수 있지만, 투자 판단으로 이어질 수 있는
// "해석"(상승 예상·투자 기회·유망·추천 등)은 제공하지 않는다. 이 가이드가
// 요구하는 "특징 설명"은 항상 사실 집계 표현(다수 확인/동시에 관측/집계됨)
// 범위 안에서만 허용된다 — 아래 BANNED_BLOCK과 항상 함께 적용할 것.
const DATA_INTERPRETATION_GUIDE = `데이터 해석 지침 ("실적·공시·내부자거래로 보는 오늘 데이터" 섹션 전용)
- 수치나 태그를 그대로 나열만 하지 말고("EPS 상회 5건, 내부자 매수 3건"처럼
  건수만 던지지 말고), 그 수치가 오늘 데이터에서 어떤 특징을 보여주는지 한
  문장 덧붙여 설명할 것.
  예) "실적 시즌 초반 예상치를 웃도는 기업이 다수 확인되었습니다."
  예) "여러 업종에서 내부자 매수가 동시에 관측되었습니다."
  예) "최근 관련 공시 제출이 늘어난 것으로 집계되었습니다."
- 위 예시처럼 "다수 확인/동시에 관측/집계되었습니다" 등 사실 서술체를
  유지할 것. 아래 "절대 금지 표현"에 해당하는 투자 의견성 해석(상승 예상,
  투자 기회, 유망, 추천 등)은 절대 추가하지 말 것 — 데이터의 "의미"는
  설명할 수 있지만 "투자 판단으로 이어질 수 있는 해석"은 제공하지 않는다.`;

// ─── 종결 표현 다양화 가이드 (요청 사항 4번) ────────────────────────────────────
//
// "확인되었습니다/집계되었습니다/관측되었습니다"류 사실 서술체 자체는 계속
// 유지한다(SHARED_PRINCIPLES 원칙과 충돌하지 않음) — 이 가이드는 "같은
// 종결 표현의 3회 이상 연속 반복"만 제한하는 문장 다양성 규칙이다.
const SENTENCE_VARIETY_GUIDE = `종결 표현 다양화 지침
- "확인되었습니다", "집계되었습니다", "관측되었습니다" 같은 사실 서술체
  종결 표현을 계속 사용하되, 똑같은 종결 표현을 3회 이상 연속으로 반복하지
  말 것.
- 아래처럼 사실 서술 범위 안에서 자연스럽게 표현을 바꿔가며 사용할 것:
  확인됐습니다 / 나타났습니다 / 집계됐습니다 / 제출됐습니다 / 공개됐습니다 /
  기록됐습니다 / 이어졌습니다 / 관측됐습니다 / 갱신됐습니다.
- 표현을 바꾸는 것은 문체 다양성을 위한 것일 뿐, 사실 서술체라는 원칙
  자체(SHARED_PRINCIPLES, 절대 금지 표현)는 그대로 유지할 것.`;

// ─── 문장·문단 길이 가이드 (요청 사항 7번) ────────────────────────────────────
const STYLE_GUIDE = `문체 지침
- 경제신문 기사처럼 짧고 명확한 문장을 우선 사용할 것. 여러 절을 접속사로
  길게 이어붙인 한 문장을 만들지 말 것.
- 한 문단은 2~4문장 정도로 구성할 것. 그보다 길어지면 문단을 나눌 것.`;

function outputFormatBlock(min: number, max: number): string {
  return `[TITLE]
(SEO를 고려한 블로그 제목 1줄, 30자 내외, 위 "제목 작성 지침"을 따를 것)

[META_DESCRIPTION]
(검색 결과에 노출될 메타 설명 1문장, 120~160자 내외(공백 포함). 오늘 데이터의
핵심을 압축할 것. 절대 금지 표현을 포함하지 말 것. plain text만, 마크다운
기호 금지)

[SLUG_KEYWORDS]
(URL에 쓸 영문 키워드 2~4개, 소문자와 하이픈(-)만 사용. 오늘 가장 눈에 띈
기업의 티커나 오늘의 핵심 키워드를 영문으로 표현. 예: nvda-insider-buying-earnings.
한글, 공백, 특수문자, 마크다운 기호를 쓰지 말 것)

[BODY]
(본문 ${min}~${max}자 내외(공백 포함, 한국어 기준). 아래 "글 구조" 섹션에
지정된 순서와 소제목 문구를 그대로 따를 것. 소제목 줄과 문단은 빈 줄로
구분하고, 소제목 자체를 제외한 나머지 문단에는 마크다운 기호(#, **, - 등)를
쓰지 말고 자연스러운 문단으로만 구성할 것. plain text만)

[CATEGORIES]
(반드시 다음 목록 중에서만 1~2개 선택, 쉼표로 구분. 목록에 없는 새 카테고리를 만들지 말 것: ${FIXED_CATEGORIES.join(", ")})

[HASHTAGS]
(5~8개 내외, #으로 시작하는 해시태그를 공백으로 구분. 예: #미국주식 #나스닥 #TickerFlow. 본문에 언급된 종목이 있으면 관련 티커·기업명 해시태그도 포함할 것)`;
}

const FOOTER_RULES = `기타 규칙
- 점수, 가중치, 알고리즘, 스코어링 로직, 내부 선정 기준 언급 금지
- "TickerFlow" 서비스명은 본문에서 1회 이내로만 언급, 과도한 홍보 문구 금지.
  "TickerFlow에서 함께 확인하면 좋은 데이터" 섹션과 내부 링크(관련 글 추천)는
  [BODY]에 쓰지 말 것 — 서비스 코드가 자동으로 이어붙인다.
- "AI" 단어 사용 금지 (Claude, Anthropic 등 생성 도구명도 언급 금지)
- 기관명·개인명 비노출
- 반드시 [TITLE], [META_DESCRIPTION], [SLUG_KEYWORDS], [BODY], [CATEGORIES],
  [HASHTAGS] 여섯 섹션 헤더를 그대로 포함해 응답할 것
- 응답을 제출하기 전에, [BODY]와 [META_DESCRIPTION]에 위 "절대 금지 표현"
  목록에 있는 단어나 그와 유사한 표현이 단 하나라도 남아있지 않은지 스스로
  다시 확인하고, 있다면 전부 사실 서술체(예: "~가 확인됐습니다", "~건이
  집계됐습니다")로 고친 뒤 응답할 것 ("포착"도 금지 표현이다 — "확인됐습니다"로
  대체할 것)
- 응답을 제출하기 전에, [BODY]에 "첫째/둘째/셋째"나 번호 매기기가 남아있지
  않은지, 같은 종결 표현이 3회 이상 연속으로 반복되지 않는지도 함께
  확인할 것 (아래 "종결 표현 다양화 지침" 참고)
- 응답을 제출하기 전에, [TITLE]과 [BODY]에 "TOP10/TOP30/TOP20", "N위" 같은
  순위 표기나 "선정/진입/편입/이탈" 같은 순위·선정 뉘앙스가 남아있지 않은지도
  반드시 확인할 것 — 있다면 순위 없는 사실 서술로 고친 뒤 응답할 것`;

function macroLinesOf(data: DigestData): string {
  return data.macros.length > 0
    ? data.macros.map((m) => `${m.label}: ${m.value ?? "—"}${m.unit}`).join("\n")
    : "없음";
}

// ─── 통합 프롬프트 빌더 ─────────────────────────────────────────────────────────
//
// 예전에는 타입(데일리 요약/내부자 매수/실적 서프라이즈/신규 진입/경제지표)별로
// 관점을 분리해 5개 글을 따로 생성했다. 지금은 이 모든 슬라이스를 한 번에
// 모아 "오늘의 기업동향" 통합 글 하나로 구성한다 — 그날 데이터가 없는 슬라이스는
// 프롬프트에 "없음"으로만 표시하고, 본문에서 해당 문단을 통째로 생략하도록
// LLM에게 지시한다(억지로 채우지 않음).

interface UnifiedPromptResult {
  prompt: string;
  tickers: string[];
  dashboardKeyword: string;
}

function buildUnifiedPrompt(data: DigestData): UnifiedPromptResult {
  const [min, max] = BODY_LENGTH_RANGE;

  // 2026-07-11: 프롬프트에 "N위" 순위 표기를 넣지 않는다 — 모델이 이 숫자를
  // 그대로 본문에 옮겨 "TOP30 스코어링 결과"를 노출하는 위험을 원천적으로
  // 차단하기 위함(세션97 규제 리스크 점검). 데이터 자체(활동 종목 목록)는
  // 그대로 유지하고 순위 숫자만 뺀다.
  const top10Lines = [...data.top3, ...data.top4to10]
    .map((item) => `${item.ticker}(${item.name}) — ${item.descriptions.join(", ")}`)
    .join("\n");

  const featuredLine = data.featured
    ? `${data.featured.ticker}(${data.featured.name}) — ${data.featured.descriptionKr}`
    : "없음";

  const insiderLines = data.insiderBuyToday.length > 0
    ? data.insiderBuyToday
        .map((item) => `${item.ticker}(${item.name}) — ${item.isLarge ? "대규모 내부자 매수 확인" : "내부자 매수 확인"}`)
        .join("\n")
    : "없음";

  const earningsLines = data.earningsBeatToday.length > 0
    ? data.earningsBeatToday
        .map((item) => {
          const desc = item.epsBeat && item.revenueBeat ? "EPS·매출 예상치 상회"
            : item.revenueBeat ? "매출 예상치 상회"
            : "EPS 예상치 상회";
          return `${item.ticker}(${item.name}) — ${desc}`;
        })
        .join("\n")
    : "없음";

  const newEntrantLines = data.newEntrants.length > 0
    ? data.newEntrants.map((e) => `${e.ticker}(${e.name}) — ${e.description}`).join("\n")
    : "없음";

  const droppedLine = data.dropped.length > 0
    ? data.dropped.map((d) => `${d.ticker}(${d.name})`).join(", ")
    : "없음";

  const prompt = `다음은 ${data.kstDate} 미국 나스닥 주요 기업 동향 데이터입니다. 이 데이터를 바탕으로
네이버 블로그 등에 게시할 "오늘의 기업동향" 기사를 작성하세요.

관점: 이 글은 데이터를 항목별로 나열하는 리포트가 아니라, 경제신문의
"오늘의 시장 브리핑"처럼 오늘 나스닥에서 확인된 가장 중요한 변화를 짚어주는
기사입니다. 독자가 3분 안에 오늘 시장을 파악할 수 있도록, 아래 데이터
가운데 오늘 가장 중요한 지점을 추려 하나의 자연스러운 흐름으로 구성하세요.
"없음"으로 표시된 섹션은 본문에서 억지로 언급하지 말고 통째로 생략하세요
(예: 내부자 매수 확인 종목이 없으면 내부자 거래 관련 문단을 아예 쓰지
않아도 됩니다).

[오늘 활동이 활발한 기업 목록]
${top10Lines}

[오늘 가장 눈에 띈 기업]
${featuredLine}

[내부자 매수 확인 종목]
${insiderLines}

[실적 예상치 상회 종목]
${earningsLines}

[신규로 관측된 활동 종목]
${newEntrantLines}

[관측 목록에서 빠진 종목 (참고)]
${droppedLine}

[오늘 시장 변화 건수]
- 기관 관련 공시: ${data.marketChange.institutionalCount}건
- 내부자 거래: ${data.marketChange.insiderCount}건
- 실적 발표: ${data.earningsTotal}건 (예상치 상회 ${data.marketChange.earningsBeatCount}건)
- 관련 공시: ${data.marketChange.filingsCount}건

[시장 분위기]
${data.marketMood}

[시장 요약]
${data.marketSummary}

[주요 경제지표]
${macroLinesOf(data)}

작성 지침
- 분량은 [BODY] 기준 ${min}~${max}자 내외(목표 ${BODY_LENGTH_TARGET}자)로
  작성하세요 (서비스 코드가 자동으로 이어붙이는 "TickerFlow에서 함께 확인하면
  좋은 데이터" 섹션, 내부 링크, 면책 문구는 이 분량에 포함하지 않습니다).
- 데이터가 "없음"으로 표시된 섹션은 본문에서 억지로 언급하지 말고 통째로
  생략하세요 (예: 내부자 매수 확인 종목이 없으면 관련 소제목 자체를 쓰지
  않아도 됩니다).

${ECONOMIC_ARTICLE_TONE_GUIDE}

${ARTICLE_STRUCTURE_GUIDE}

${TICKER_LISTING_GUIDE}

${COMPANY_INTRO_GUIDE}

${DATA_INTERPRETATION_GUIDE}

${SENTENCE_VARIETY_GUIDE}

${STYLE_GUIDE}

${TITLE_GUIDE}

${outputFormatBlock(min, max)}

${SHARED_PRINCIPLES}

${BANNED_BLOCK}

${FOOTER_RULES}`;

  const tickers = Array.from(
    new Set([
      ...(data.featured ? [data.featured.ticker] : []),
      ...[...data.top3, ...data.top4to10].slice(0, 3).map((i) => i.ticker),
    ])
  );

  return { prompt, tickers, dashboardKeyword: tickers.slice(0, 3).join(" · ") };
}

// ─── SNS 요약본 프롬프트 (본문 생성 후 2차 호출) ────────────────────────────────

function buildSnsPrompt(title: string, body: string): string {
  return `다음은 이미 작성이 끝난 블로그 포스트입니다. 이 내용을 바탕으로 소셜미디어
공유용 요약본 두 가지를 작성하세요.

[블로그 제목]
${title}

[블로그 본문]
${body}

작성 지침
- [X] 섹션: X(트위터)·Threads에 게시할 요약. 간결하고 캐주얼한 톤으로, 오늘
  가장 핵심적인 사실 1~2가지만 압축해서 전달하세요. 본문은 230자 내외로
  작성하세요(면책 문구는 별도로 코드에서 추가되므로 포함하지 마세요). 마지막
  줄에 X/Threads 관례에 맞는 해시태그 2~4개(예: #나스닥 #미국주식)를
  포함하세요.
- [LINKEDIN] 섹션: LinkedIn에 게시할 요약. 캐주얼한 구어체 대신 전문적이고
  정보 전달 중심의 톤으로 작성하세요. 본문은 230자 내외로 작성하세요(면책
  문구는 별도로 코드에서 추가되므로 포함하지 마세요). 마지막 줄에 LinkedIn
  관례에 맞는 해시태그 2~4개(예: #미국주식 #글로벌증시)를 포함하세요.
- 마크다운 기호(#, **, -, --- 등)나 구분선을 사용하지 마세요. 소제목 없이
  문장으로만 자연스럽게 작성하세요. [X], [LINKEDIN] 섹션 헤더 자체를
  제외하면 그 외에는 순수 텍스트와 마지막 줄의 해시태그만 있어야 합니다.

${SHARED_PRINCIPLES}

${BANNED_BLOCK}

기타 규칙
- "AI" 단어 사용 금지 (Claude, Anthropic 등 생성 도구명도 언급 금지)
- 기관명·개인명 비노출
- 반드시 [X], [LINKEDIN] 두 섹션 헤더를 그대로 포함해 응답할 것
- 응답을 제출하기 전에, 위 "절대 금지 표현" 목록에 있는 단어나 그와 유사한
  표현이 단 하나라도 남아있지 않은지 스스로 다시 확인할 것`;
}

// ─── Claude Haiku 호출 + 파싱 ───────────────────────────────────────────────────

async function callHaiku(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      body: JSON.stringify({
        model:      HAIKU_MODEL,
        max_tokens: 2400,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { content?: { text?: string }[] };
    return json?.content?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

function parseDraft(text: string): {
  title: string;
  metaDescription: string;
  slugKeywords: string;
  body: string;
  categories: string[];
  hashtags: string[];
} | null {
  const titleMatch = text.match(/\[TITLE\]\s*([\s\S]*?)(?=\[META_DESCRIPTION\]|$)/);
  const metaMatch = text.match(/\[META_DESCRIPTION\]\s*([\s\S]*?)(?=\[SLUG_KEYWORDS\]|$)/);
  const slugMatch = text.match(/\[SLUG_KEYWORDS\]\s*([\s\S]*?)(?=\[BODY\]|$)/);
  const bodyMatch = text.match(/\[BODY\]\s*([\s\S]*?)(?=\[CATEGORIES\]|$)/);
  const categoriesMatch = text.match(/\[CATEGORIES\]\s*([\s\S]*?)(?=\[HASHTAGS\]|$)/);
  const hashtagsMatch = text.match(/\[HASHTAGS\]\s*([\s\S]*)$/);

  const title = titleMatch?.[1]?.trim();
  const body = bodyMatch?.[1]?.trim();
  if (!title || !body) return null;

  const metaDescription = metaMatch?.[1]?.trim() ?? "";
  const slugKeywords = slugMatch?.[1]?.trim() ?? "";

  const categoriesRaw = categoriesMatch?.[1]?.trim();
  const categories = categoriesRaw
    ? categoriesRaw.split(",").map((c) => c.trim()).filter((c) => FIXED_CATEGORIES.includes(c)).slice(0, 2)
    : [];

  const hashtagsRaw = hashtagsMatch?.[1]?.trim() ?? "";
  const hashtags = hashtagsRaw
    .split(/\s+/)
    .map((h) => h.trim())
    .filter((h) => h.startsWith("#") && h.length > 1);

  return { title, metaDescription, slugKeywords, body, categories, hashtags };
}

// 모델이 지시를 어기고 섹션 사이에 "---", "##" 같은 마크다운 구분선을 남기는
// 경우를 대비한 방어적 정리 — 기호로만 이루어진 줄은 통째로 제거한다.
function stripMarkdownArtifacts(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^[\s#*_=-]+$/.test(line))
    .join("\n")
    .trim();
}

function parseSnsSummaries(text: string): { x: string; linkedin: string } | null {
  const xMatch = text.match(/\[X\]\s*([\s\S]*?)(?=\[LINKEDIN\]|$)/i);
  const linkedinMatch = text.match(/\[LINKEDIN\]\s*([\s\S]*)$/i);

  const x = xMatch?.[1] ? stripMarkdownArtifacts(xMatch[1]) : "";
  const linkedin = linkedinMatch?.[1] ? stripMarkdownArtifacts(linkedinMatch[1]) : "";
  if (!x || !linkedin) return null;

  return { x, linkedin };
}

/** LLM이 놓쳤을 수 있는 종목 해시태그를 보강하고, 5~8개 범위로 정리한다. */
function enrichHashtags(raw: string[], tickers: string[]): string[] {
  const normalized = new Set(raw.map((h) => h.toLowerCase()));
  const merged = [...raw];

  for (const ticker of tickers) {
    const tag = `#${ticker}`;
    if (!normalized.has(tag.toLowerCase())) {
      merged.push(tag);
      normalized.add(tag.toLowerCase());
    }
  }

  return merged.slice(0, 8);
}

export interface BlogDraft {
  title: string;
  metaDescription: string;
  slug: string;
  body: string;
  bodyLength: number;
  categories: string[];
  hashtags: string[];
  imagePrompt: string;
  kstDate: string;
  snsX: string;
  snsLinkedIn: string;
}

export interface GenerateBlogDraftResult {
  ok: boolean;
  draft?: BlogDraft;
  error?: string;
}

/**
 * 오늘의 TOP30/시장 변화 데이터(gatherDigestData — 이메일 다이제스트와 동일한
 * 데이터 소스)를 바탕으로 "오늘의 기업동향" 기사형 블로그 포스트 초안(제목/
 * 메타 설명/슬러그/본문/카테고리/해시태그/이미지 프롬프트)과, 이를 요약한
 * X·Threads/LinkedIn용 SNS 요약본을 생성한다. 발행은 이미지 첨부 포함 전체
 * 수동으로 진행하므로, 이 함수는 초안 텍스트 생성까지만 담당하고 별도 저장은
 * 하지 않는다.
 */
export async function generateBlogDraft(): Promise<GenerateBlogDraftResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not set" };
  }

  const digestData = await gatherDigestData();
  if (!digestData) {
    return { ok: false, error: "TOP30 데이터가 없습니다. 스크리너(top30) 실행 후 다시 시도하세요." };
  }

  const { prompt, tickers, dashboardKeyword } = buildUnifiedPrompt(digestData);

  const text = await callHaiku(prompt);
  if (!text) {
    return { ok: false, error: "초안 생성에 실패했습니다 (Claude 호출 오류)." };
  }

  const parsed = parseDraft(text);
  if (!parsed) {
    return { ok: false, error: "생성된 응답 형식을 파싱하지 못했습니다. 다시 시도해주세요." };
  }

  const snsText = await callHaiku(buildSnsPrompt(parsed.title, parsed.body));
  if (!snsText) {
    return { ok: false, error: "SNS 요약본 생성에 실패했습니다 (Claude 호출 오류)." };
  }

  const sns = parseSnsSummaries(snsText);
  if (!sns) {
    return { ok: false, error: "SNS 요약본 응답 형식을 파싱하지 못했습니다. 다시 시도해주세요." };
  }

  // ⑦ "함께 확인해 보세요"·내부 링크 섹션은 LLM이 아니라 코드가 붙인다
  // (buildFollowUpBlock/buildRelatedArticlesBlock 주석 참고).
  const followUpBlock = buildFollowUpBlock();
  const relatedArticlesBlock = buildRelatedArticlesBlock(pickRelatedTopics(digestData));
  const body = [parsed.body, followUpBlock, relatedArticlesBlock, DISCLAIMER].join("\n\n");

  const hashtags = enrichHashtags(parsed.hashtags, tickers);
  const imagePrompt = buildImagePrompt(digestData.kstDate, dashboardKeyword);
  const slug = buildSlug(digestData.kstDate, parsed.slugKeywords);

  return {
    ok: true,
    draft: {
      title: parsed.title,
      metaDescription: parsed.metaDescription,
      slug,
      body,
      bodyLength: body.length,
      categories: parsed.categories,
      hashtags,
      imagePrompt,
      kstDate: digestData.kstDate,
      snsX: `${sns.x}${SHORT_DISCLAIMER}`,
      snsLinkedIn: `${sns.linkedin}${SHORT_DISCLAIMER}`,
    },
  };
}
