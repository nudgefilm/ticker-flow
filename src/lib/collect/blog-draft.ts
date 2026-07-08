import { gatherDigestData } from "./digest";
import type { DigestData, Top30TagItem } from "@/lib/email/templates";

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
const DISCLAIMER =
  "TickerFlow Note\n" +
  "이 글은 미국 기업의 공시와 시장 데이터를 기반으로 주요 변화를 정리한 콘텐츠입니다.\n" +
  "TickerFlow는 공개된 데이터를 바탕으로 기업 활동과 시장 흐름을 모니터링하며, 특정 종목에 대한 투자 권유나 투자 자문을 제공하지 않습니다.\n" +
  "투자 판단은 다양한 정보를 함께 검토한 뒤 본인의 책임하에 결정하시기 바랍니다.";

// SNS 요약본은 글자수 제약이 커서 위 전체 문구 대신 축약 문구를 사용한다.
const SHORT_DISCLAIMER = "\n\n※ 정보 제공 목적이며 투자 권유가 아닙니다. 투자 판단은 본인 책임입니다.";

// 본문 목표 분량 — "오늘의 기업동향" 통합 포스팅 기준 1,600자 내외.
const BODY_LENGTH_RANGE: [number, number] = [1400, 1900];
const BODY_LENGTH_TARGET = 1600;

// 카테고리는 자유 생성이 아니라 반드시 이 6개 중에서만 선택하도록 프롬프트에서 강제한다.
const FIXED_CATEGORIES = ["기업 동향", "시장 흐름", "실적 발표", "경제지표", "TOP30 변동", "내부자 거래"];

const INSIDER_TAGS = ["insider_buy", "insider_buy_large"];
const EARNINGS_TAGS = ["eps_beat", "revenue_beat", "both_beat"];

function filterByTags(items: Top30TagItem[], tags: string[]): Top30TagItem[] {
  return items.filter((item) => item.tags.some((t) => tags.includes(t)));
}

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

const TITLE_GUIDE = `제목 작성 지침
- 단순히 수치나 종목명을 나열하는 제목은 금지합니다 (예: "오늘의 나스닥 동향: AAPL, MSFT 실적 발표").
- 오늘 데이터 중 가장 특징적인 지점 하나를 골라, 질문형(예: "오늘 나스닥에서
  이 기업에 무슨 일이?")·리스티클형(예: "오늘 나스닥에서 확인된 N가지
  변화")·궁금증 유발형 중 하나의 방식으로 클릭을 유도하는 제목을 작성하세요.
- 과장이나 자극적인 문구, 투자 권유로 해석될 수 있는 표현은 사용하지 마세요
  (아래 "절대 금지 표현" 목록 참고).`;

function outputFormatBlock(min: number, max: number): string {
  return `[TITLE]
(블로그 제목 1줄, 30자 내외, 위 "제목 작성 지침"을 따를 것)

[BODY]
(본문 ${min}~${max}자 내외(공백 포함, 한국어 기준). 문단 구분은 빈 줄로. 마크다운 기호(#, **, - 등)나 소제목 라벨을 그대로 쓰지 말고 자연스러운 문단으로만 구성. plain text만)

[CATEGORIES]
(반드시 다음 목록 중에서만 1~2개 선택, 쉼표로 구분. 목록에 없는 새 카테고리를 만들지 말 것: ${FIXED_CATEGORIES.join(", ")})

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

  const top10Lines = [...data.top3, ...data.top4to10]
    .map((item) => `${item.rank}위 ${item.ticker}(${item.name}) — ${item.descriptions.join(", ")}`)
    .join("\n");

  const featuredLine = data.featured
    ? `${data.featured.ticker}(${data.featured.name}) — ${data.featured.descriptionKr}`
    : "없음";

  const insiderFiltered = filterByTags(data.top30Full, INSIDER_TAGS);
  const insiderLines = insiderFiltered.length > 0
    ? insiderFiltered
        .map((item) => `${item.rank}위 ${item.ticker}(${item.name}) — ${item.tags.includes("insider_buy_large") ? "대규모 내부자 매수 확인" : "내부자 매수 확인"}`)
        .join("\n")
    : "없음";

  const earningsFiltered = filterByTags(data.top30Full, EARNINGS_TAGS);
  const earningsLines = earningsFiltered.length > 0
    ? earningsFiltered
        .map((item) => {
          const desc = item.tags.includes("both_beat") ? "EPS·매출 예상치 상회"
            : item.tags.includes("revenue_beat") ? "매출 예상치 상회"
            : "EPS 예상치 상회";
          return `${item.rank}위 ${item.ticker}(${item.name}) — ${desc}`;
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
네이버 블로그 등에 게시할 "오늘의 기업동향" 통합 블로그 포스트 초안을 작성하세요.

관점: 오늘 하루 미국 나스닥에서 확인된 주요 변화를 종합적으로 정리하는
글입니다. 아래 각 섹션의 데이터를 활용해 하나의 자연스러운 흐름으로
구성하세요. "없음"으로 표시된 섹션은 본문에서 억지로 언급하지 말고 통째로
생략하세요 (예: 내부자 매수 확인 종목이 없으면 내부자 거래 관련 문단을
아예 쓰지 않아도 됩니다).

[기업동향 TOP10]
${top10Lines}

[오늘 가장 눈에 띈 기업]
${featuredLine}

[내부자 매수 확인 종목 (TOP30 내)]
${insiderLines}

[실적 예상치 상회 종목 (TOP30 내)]
${earningsLines}

[TOP30 신규 진입 종목]
${newEntrantLines}

[TOP30 이탈 종목 (참고)]
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
- 분량은 본문 ${min}~${max}자 내외(목표 ${BODY_LENGTH_TARGET}자)로 작성하세요.
- 글의 흐름은 다음 순서를 따르되, 소제목 텍스트 자체를 본문에 쓰지 말고 각
  소주제에 맞는 문단으로 자연스럽게 이어서 구성하세요: 핵심 요약 → 오늘
  가장 눈에 띈 기업 → 내부자 거래 → 실적 → TOP30 신규 진입 → 경제지표 →
  마무리. 데이터가 "없음"인 섹션은 순서에서 통째로 건너뛰세요.

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
    ? categoriesRaw.split(",").map((c) => c.trim()).filter((c) => FIXED_CATEGORIES.includes(c)).slice(0, 2)
    : [];

  const hashtagsRaw = hashtagsMatch?.[1]?.trim() ?? "";
  const hashtags = hashtagsRaw
    .split(/\s+/)
    .map((h) => h.trim())
    .filter((h) => h.startsWith("#") && h.length > 1);

  return { title, body, categories, hashtags };
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
 * 데이터 소스)를 바탕으로 "오늘의 기업동향" 통합 블로그 포스트 초안(제목/본문/
 * 카테고리/해시태그/이미지 프롬프트)과, 이를 요약한 X·Threads/LinkedIn용 SNS
 * 요약본을 생성한다. 발행은 이미지 첨부 포함 전체 수동으로 진행하므로, 이
 * 함수는 초안 텍스트 생성까지만 담당하고 별도 저장은 하지 않는다.
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

  const body = `${parsed.body}\n\n${DISCLAIMER}`;
  const hashtags = enrichHashtags(parsed.hashtags, tickers);
  const imagePrompt = buildImagePrompt(digestData.kstDate, dashboardKeyword);

  return {
    ok: true,
    draft: {
      title: parsed.title,
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
