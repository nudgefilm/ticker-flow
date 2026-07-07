import { gatherDigestData } from "./digest";
import type { DigestData, Top30TagItem } from "@/lib/email/templates";

// 이 모듈이 생성하는 텍스트는 어드민 내부 도구 결과물이 아니라, 검수 후 그대로
// 외부(네이버 블로그 등)에 게시될 콘텐츠다. CLAUDE.md 18항의 "어드민 전용
// 규제 예외" 대상이 아니므로, 일반 CLAUDE.md 원칙(6항 투자 권유 금지, 8항
// "AI" 단어 금지, 14항 사실 서술체 원칙)을 다른 사용자 노출 화면과 동일하게
// 그대로 적용해야 한다.

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// 대시보드 화면용 표준 면책 문구("본 서비스는...")는 서비스 UI를 지칭하는
// 표현이라 블로그 콘텐츠 맥락에 맞지 않는다. 블로그·유튜브 쇼츠 등 서비스
// 화면 밖으로 나가는 콘텐츠는 이 "TickerFlow Note" 문구를 사용한다
// (CLAUDE.md 14항 참고 — 콘텐츠 성격별 면책 문구 구분 원칙).
const DISCLAIMER =
  "TickerFlow Note\n" +
  "이 글은 미국 기업의 공시와 시장 데이터를 기반으로 주요 변화를 정리한 콘텐츠입니다.\n" +
  "TickerFlow는 공개된 데이터를 바탕으로 기업 활동과 시장 흐름을 모니터링하며, 특정 종목에 대한 투자 권유나 투자 자문을 제공하지 않습니다.\n" +
  "투자 판단은 다양한 정보를 함께 검토한 뒤 본인의 책임하에 결정하시기 바랍니다.";

export type BlogDraftType =
  | "daily-summary"
  | "insider-buying"
  | "earnings-surprise"
  | "new-entries"
  | "macro";

export const BLOG_DRAFT_TYPES: { id: BlogDraftType; label: string; desc: string }[] = [
  { id: "daily-summary",     label: "데일리 요약",       desc: "뉴스레터 스타일 · 오늘 전체 핵심 변화" },
  { id: "insider-buying",    label: "내부자 매수",       desc: "내부자 매수 개념 설명 + 오늘의 매수 기업" },
  { id: "earnings-surprise", label: "실적 서프라이즈",   desc: "오늘 실적 발표·예상치 상회 기업에 집중" },
  { id: "new-entries",       label: "TOP30 신규 진입",   desc: "TOP30(스크리너) 개념 설명 + 오늘 신규 진입 종목" },
  { id: "macro",             label: "경제지표",          desc: "CPI·금리 등 시장 전체 거시 지표" },
];

const LENGTH_RANGE: Record<BlogDraftType, [number, number]> = {
  "daily-summary":     [1200, 1800],
  "insider-buying":    [700, 1200],
  "earnings-surprise": [700, 1200],
  "new-entries":       [600, 1000],
  "macro":             [600, 900],
};

// 카테고리는 자유 생성이 아니라 반드시 이 6개 중에서만 선택하도록 프롬프트에서 강제한다.
const FIXED_CATEGORIES = ["기업 동향", "시장 흐름", "실적 발표", "경제지표", "TOP30 변동", "내부자 거래"];

const INSIDER_TAGS = ["insider_buy", "insider_buy_large"];
const EARNINGS_TAGS = ["eps_beat", "revenue_beat", "both_beat"];

function filterByTags(items: Top30TagItem[], tags: string[]): Top30TagItem[] {
  return items.filter((item) => item.tags.some((t) => tags.includes(t)));
}

// ─── 이미지 프롬프트 (LLM 미사용 — 코드 템플릿 조합) ────────────────────────────

const IMAGE_TEMPLATE: Record<BlogDraftType, { headline: string; theme: string; accent: string }> = {
  "daily-summary": {
    headline: "오늘의 나스닥 핵심 동향",
    theme:    "종합 대시보드 스타일, 다크 테마, 미니멀 금융 UI",
    accent:   "블루 (#60a5fa)",
  },
  "insider-buying": {
    headline: "내부자 매수 스포트라이트",
    theme:    "내부자 거래 리포트 스타일, 다크 네이비 배경",
    accent:   "에메랄드 그린 (#34d399)",
  },
  "earnings-surprise": {
    headline: "실적 서프라이즈 브리핑",
    theme:    "실적 발표 차트 스타일, 막대그래프·화살표 그래픽",
    accent:   "퍼플 (#c084fc)",
  },
  "new-entries": {
    headline: "TOP30 신규 진입 종목",
    theme:    "랭킹보드 스타일, 순위표 그래픽",
    accent:   "앰버 (#fbbf24)",
  },
  "macro": {
    headline: "이번 주 경제지표 브리핑",
    theme:    "게이지 차트 스타일, 매크로 대시보드",
    accent:   "레드 (#f87171)",
  },
};

/** 글 타입별 고정 구조(Headline/Subtitle/Theme/Accent)에 그날의 핵심 키워드만 삽입한다. */
function buildImagePrompt(type: BlogDraftType, kstDate: string, dashboardKeyword: string): string {
  const t = IMAGE_TEMPLATE[type];
  return [
    `Headline: ${t.headline}`,
    `Subtitle: ${kstDate}`,
    `Theme: ${t.theme}`,
    `Accent: ${t.accent}`,
    `Dashboard: ${dashboardKeyword || "데이터 없음"}`,
  ].join("\n");
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
- 투자 권유

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

function outputFormatBlock(min: number, max: number): string {
  return `[TITLE]
(블로그 제목 1줄, 30자 내외, 과장 없이 사실 위주)

[BODY]
(본문 ${min}~${max}자 내외(공백 포함, 한국어 기준). 문단 구분은 빈 줄로. 마크다운 기호(#, **, - 등) 사용 금지, plain text만)

[CATEGORIES]
(반드시 다음 목록 중에서만 1~3개 선택, 쉼표로 구분. 목록에 없는 새 카테고리를 만들지 말 것: ${FIXED_CATEGORIES.join(", ")})

[HASHTAGS]
(5~8개 내외, #으로 시작하는 해시태그를 공백으로 구분. 예: #미국주식 #나스닥 #TickerFlow. 본문에 언급된 종목이 있으면 관련 티커·기업명 해시태그도 포함할 것)`;
}

const FOOTER_RULES = `기타 규칙
- 점수, 가중치, 알고리즘, 스코어링 로직, 내부 선정 기준 언급 금지
- "TickerFlow" 서비스명은 본문에서 1회 이내로만 언급, 과도한 홍보 문구 금지
- "AI" 단어 사용 금지 (Claude, Anthropic 등 생성 도구명도 언급 금지)
- 기관명·개인명 비노출
- 반드시 [TITLE], [BODY], [CATEGORIES], [HASHTAGS] 네 섹션 헤더를 그대로 포함해 응답할 것
- 응답을 제출하기 전에, 본문에 위 "절대 금지 표현" 목록에 있는 단어나 그와
  유사한 표현이 단 하나라도 남아있지 않은지 스스로 다시 확인하고, 있다면
  전부 사실 서술체(예: "~가 확인됐습니다", "~건이 집계됐습니다")로 고친 뒤
  응답할 것 ("포착"도 금지 표현이다 — "확인됐습니다"로 대체할 것)`;

function macroLinesOf(data: DigestData): string {
  return data.macros.length > 0
    ? data.macros.map((m) => `${m.label}: ${m.value ?? "—"}${m.unit}`).join("\n")
    : "없음";
}

// ─── 타입별 프롬프트 빌더 ───────────────────────────────────────────────────────
//
// 각 타입은 관점을 완전히 분리한다 — 같은 데이터라도 어떤 슬라이스를 쓰는지,
// 개념 설명을 포함하는지가 타입마다 다르다. 데이터가 부족하면(예: 오늘
// 내부자 매수 공시가 없음) unavailable 메시지를 반환해 Haiku를 호출하지 않는다.

type BuildResult =
  | { ok: true; prompt: string; tickers: string[]; dashboardKeyword: string }
  | { ok: false; reason: string };

function buildDailySummary(data: DigestData): BuildResult {
  const [min, max] = LENGTH_RANGE["daily-summary"];
  const top10Lines = [...data.top3, ...data.top4to10]
    .map((item) => `${item.rank}위 ${item.ticker}(${item.name}) — ${item.descriptions.join(", ")}`)
    .join("\n");
  const newEntrantLines = data.newEntrants.length > 0
    ? data.newEntrants.map((e) => `${e.ticker}(${e.name}) — ${e.description}`).join("\n")
    : "없음";
  const droppedLine = data.dropped.length > 0
    ? data.dropped.map((d) => `${d.ticker}(${d.name})`).join(", ")
    : "없음";

  const prompt = `다음은 ${data.kstDate} 미국 나스닥 주요 기업 동향 데이터입니다. 이 데이터를 바탕으로
네이버 블로그 등에 게시할 "데일리 요약" 블로그 포스트 초안을 작성하세요.

관점: 뉴스레터 스타일. 오늘 하루 전체의 핵심 변화를 훑어주는 글입니다.
개별 주제(내부자 매수, 실적, TOP30 신규 진입, 경제지표)를 깊게 파고들지
말고, 오늘 하루를 조망하는 요약으로 작성하세요.

[기업동향 TOP10]
${top10Lines}

[TOP30 신규 진입 종목]
${newEntrantLines}

[TOP30 이탈 종목]
${droppedLine}

[오늘 시장 변화]
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
- 분량은 본문 ${min}~${max}자 내외로 작성하세요. 이메일 다이제스트보다 길고 자세하게 서술하세요.

${outputFormatBlock(min, max)}

${SHARED_PRINCIPLES}

${BANNED_BLOCK}

${FOOTER_RULES}`;

  const tickers = [...data.top3, ...data.top4to10].slice(0, 3).map((i) => i.ticker);
  return { ok: true, prompt, tickers, dashboardKeyword: tickers.join(" · ") };
}

function buildInsiderBuying(data: DigestData): BuildResult {
  const filtered = filterByTags(data.top30Full, INSIDER_TAGS);
  if (filtered.length === 0) {
    return { ok: false, reason: "오늘은 TOP30 내에서 내부자 매수 관련 공시가 확인되지 않았습니다. 다른 타입을 선택해보세요." };
  }

  const [min, max] = LENGTH_RANGE["insider-buying"];
  const lines = filtered
    .map((item) => `${item.rank}위 ${item.ticker}(${item.name}) — ${item.tags.includes("insider_buy_large") ? "대규모 내부자 매수 확인" : "내부자 매수 확인"}`)
    .join("\n");

  const prompt = `다음은 ${data.kstDate} 미국 나스닥 TOP30 중 내부자 매수 관련 공시가 확인된
종목 데이터입니다. 이 데이터를 바탕으로 네이버 블로그 등에 게시할 "내부자 매수"
블로그 포스트 초안을 작성하세요.

관점: 교육 중심. 이 글을 처음 읽는 독자도 이해할 수 있도록, 도입부에서
"내부자 매수(Insider Buying)"가 무엇이고 왜 시장 참여자들이 주목해서
지켜보는 지표인지를 사실 기반으로 간결하게 설명하세요 (예: 임원·이사·주요
주주가 SEC에 자사주 매수를 신고하는 Form 4 공시 제도라는 사실 설명 —
"이것이 곧 주가 상승을 의미한다"는 식의 해석은 금지). 이후 본문에서
오늘 확인된 내부자 매수 기업들을 사실 기반으로 정리하세요.

[오늘 내부자 매수 확인 종목 (TOP30 내 ${filtered.length}건)]
${lines}

[참고: 오늘 전체 내부자 거래 공시 건수]
${data.marketChange.insiderCount}건

작성 지침
- 분량은 본문 ${min}~${max}자 내외로 작성하세요.

${outputFormatBlock(min, max)}

${SHARED_PRINCIPLES}

${BANNED_BLOCK}

${FOOTER_RULES}`;

  const tickers = filtered.slice(0, 3).map((i) => i.ticker);
  return { ok: true, prompt, tickers, dashboardKeyword: tickers.join(" · ") };
}

function buildEarningsSurprise(data: DigestData): BuildResult {
  const filtered = filterByTags(data.top30Full, EARNINGS_TAGS);
  if (filtered.length === 0) {
    return { ok: false, reason: "오늘은 TOP30 내에서 실적 예상치 상회가 확인된 종목이 없습니다. 다른 타입을 선택해보세요." };
  }

  const [min, max] = LENGTH_RANGE["earnings-surprise"];
  const lines = filtered
    .map((item) => {
      const desc = item.tags.includes("both_beat") ? "EPS·매출 예상치 상회"
        : item.tags.includes("revenue_beat") ? "매출 예상치 상회"
        : "EPS 예상치 상회";
      return `${item.rank}위 ${item.ticker}(${item.name}) — ${desc}`;
    })
    .join("\n");

  const prompt = `다음은 ${data.kstDate} 미국 나스닥 TOP30 중 실적 예상치 상회가 확인된
종목 데이터입니다. 이 데이터를 바탕으로 네이버 블로그 등에 게시할 "실적
서프라이즈" 블로그 포스트 초안을 작성하세요.

관점: 실적 발표에만 집중하세요. 다른 주제(내부자 매수, TOP30 개념 설명,
경제지표)는 다루지 마세요.

[오늘 실적 예상치 상회 종목 (TOP30 내 ${filtered.length}건)]
${lines}

[참고: 오늘 전체 실적 발표 현황]
- 총 실적 발표: ${data.earningsTotal}건
- 예상치 상회: ${data.marketChange.earningsBeatCount}건

작성 지침
- 분량은 본문 ${min}~${max}자 내외로 작성하세요.

${outputFormatBlock(min, max)}

${SHARED_PRINCIPLES}

${BANNED_BLOCK}

${FOOTER_RULES}`;

  const tickers = filtered.slice(0, 3).map((i) => i.ticker);
  return { ok: true, prompt, tickers, dashboardKeyword: tickers.join(" · ") };
}

function buildNewEntries(data: DigestData): BuildResult {
  if (data.newEntrants.length === 0) {
    return { ok: false, reason: "오늘은 TOP30 신규 진입 종목이 없습니다. 다른 타입을 선택해보세요." };
  }

  const [min, max] = LENGTH_RANGE["new-entries"];
  const lines = data.newEntrants.map((e) => `${e.ticker}(${e.name}) — ${e.description}`).join("\n");
  const droppedLine = data.dropped.length > 0
    ? data.dropped.map((d) => `${d.ticker}(${d.name})`).join(", ")
    : "없음";

  const prompt = `다음은 ${data.kstDate} 미국 나스닥 TOP30 신규 진입 종목 데이터입니다. 이
데이터를 바탕으로 네이버 블로그 등에 게시할 "TOP30 신규 진입" 블로그
포스트 초안을 작성하세요.

관점: 교육 중심. 도입부에서 "TOP30"이 무엇을 의미하는지 사실 기반으로
간결하게 설명하세요 — 공시·실적·내부자 거래 등 공개된 여러 지표를 종합해
매일 갱신되는, 최근 주요 변화가 있었던 나스닥 상장 기업 목록이라는 사실만
서술하고, 구체적인 산출 방식(가중치·점수·알고리즘)은 언급하지 마세요.
이후 오늘 신규 진입한 종목들을 사실 기반으로 정리하세요.

[오늘 TOP30 신규 진입 종목]
${lines}

[오늘 TOP30 이탈 종목 (참고)]
${droppedLine}

작성 지침
- 분량은 본문 ${min}~${max}자 내외로 작성하세요.

${outputFormatBlock(min, max)}

${SHARED_PRINCIPLES}

${BANNED_BLOCK}

${FOOTER_RULES}`;

  const tickers = data.newEntrants.slice(0, 3).map((e) => e.ticker);
  return { ok: true, prompt, tickers, dashboardKeyword: tickers.join(" · ") };
}

function buildMacro(data: DigestData): BuildResult {
  if (data.macros.length === 0) {
    return { ok: false, reason: "오늘은 표시할 경제지표 데이터가 없습니다. 다른 타입을 선택해보세요." };
  }

  const [min, max] = LENGTH_RANGE.macro;
  const macroLines = macroLinesOf(data);

  const prompt = `다음은 ${data.kstDate} 기준 미국 주요 경제지표 데이터입니다. 이 데이터를
바탕으로 네이버 블로그 등에 게시할 "경제지표" 블로그 포스트 초안을
작성하세요.

관점: 개별 종목이 아니라 금리·물가 등 시장 전체 거시 지표 관점으로
작성하세요. 특정 종목명은 다루지 마세요.

[주요 경제지표]
${macroLines}

[참고: 오늘 시장 분위기]
${data.marketMood}

작성 지침
- 분량은 본문 ${min}~${max}자 내외로 작성하세요.

${outputFormatBlock(min, max)}

${SHARED_PRINCIPLES}

${BANNED_BLOCK}

${FOOTER_RULES}`;

  const dashboardKeyword = data.macros.map((m) => `${m.label.split(" ")[0]} ${m.value ?? "—"}${m.unit}`).join(" · ");
  return { ok: true, prompt, tickers: [], dashboardKeyword };
}

const BUILDERS: Record<BlogDraftType, (data: DigestData) => BuildResult> = {
  "daily-summary":     buildDailySummary,
  "insider-buying":    buildInsiderBuying,
  "earnings-surprise": buildEarningsSurprise,
  "new-entries":       buildNewEntries,
  "macro":             buildMacro,
};

// ─── Claude Haiku 호출 + 파싱 ───────────────────────────────────────────────────

async function callHaikuForDraft(prompt: string): Promise<string | null> {
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

function parseDraft(text: string): { title: string; body: string; categories: string[]; hashtags: string[] } | null {
  const titleMatch = text.match(/\[TITLE\]\s*([\s\S]*?)(?=\[BODY\]|$)/);
  const bodyMatch = text.match(/\[BODY\]\s*([\s\S]*?)(?=\[CATEGORIES\]|$)/);
  const categoriesMatch = text.match(/\[CATEGORIES\]\s*([\s\S]*?)(?=\[HASHTAGS\]|$)/);
  const hashtagsMatch = text.match(/\[HASHTAGS\]\s*([\s\S]*)$/);

  const title = titleMatch?.[1]?.trim();
  const body = bodyMatch?.[1]?.trim();
  if (!title || !body) return null;

  const categoriesRaw = categoriesMatch?.[1]?.trim();
  const categories = categoriesRaw
    ? categoriesRaw.split(",").map((c) => c.trim()).filter((c) => FIXED_CATEGORIES.includes(c)).slice(0, 3)
    : [];

  const hashtagsRaw = hashtagsMatch?.[1]?.trim() ?? "";
  const hashtags = hashtagsRaw
    .split(/\s+/)
    .map((h) => h.trim())
    .filter((h) => h.startsWith("#") && h.length > 1);

  return { title, body, categories, hashtags };
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
  type: BlogDraftType;
  title: string;
  body: string;
  bodyLength: number;
  categories: string[];
  hashtags: string[];
  imagePrompt: string;
  kstDate: string;
}

export interface GenerateBlogDraftResult {
  ok: boolean;
  draft?: BlogDraft;
  error?: string;
}

/**
 * 오늘의 TOP30/시장 변화 데이터(gatherDigestData — 이메일 다이제스트와 동일한
 * 데이터 소스)를 바탕으로 지정한 타입의 블로그 포스트 초안(제목/본문/카테고리/
 * 해시태그/이미지 프롬프트)을 생성한다. 발행은 이미지 첨부 포함 전체 수동으로
 * 진행하므로, 이 함수는 초안 텍스트 생성까지만 담당하고 별도 저장은 하지 않는다.
 */
export async function generateBlogDraft(type: BlogDraftType): Promise<GenerateBlogDraftResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not set" };
  }

  const builder = BUILDERS[type];
  if (!builder) {
    return { ok: false, error: `알 수 없는 타입입니다: ${type}` };
  }

  const digestData = await gatherDigestData();
  if (!digestData) {
    return { ok: false, error: "TOP30 데이터가 없습니다. 스크리너(top30) 실행 후 다시 시도하세요." };
  }

  const built = builder(digestData);
  if (!built.ok) {
    return { ok: false, error: built.reason };
  }

  const text = await callHaikuForDraft(built.prompt);
  if (!text) {
    return { ok: false, error: "초안 생성에 실패했습니다 (Claude 호출 오류)." };
  }

  const parsed = parseDraft(text);
  if (!parsed) {
    return { ok: false, error: "생성된 응답 형식을 파싱하지 못했습니다. 다시 시도해주세요." };
  }

  const body = `${parsed.body}\n\n${DISCLAIMER}`;
  const hashtags = enrichHashtags(parsed.hashtags, built.tickers);
  const imagePrompt = buildImagePrompt(type, digestData.kstDate, built.dashboardKeyword);

  return {
    ok: true,
    draft: {
      type,
      title: parsed.title,
      body,
      bodyLength: body.length,
      categories: parsed.categories,
      hashtags,
      imagePrompt,
      kstDate: digestData.kstDate,
    },
  };
}
