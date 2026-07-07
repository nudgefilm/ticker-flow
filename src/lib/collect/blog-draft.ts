import { gatherDigestData } from "./digest";
import type { DigestData } from "@/lib/email/templates";

// 이 모듈이 생성하는 텍스트는 어드민 내부 도구 결과물이 아니라, 검수 후 그대로
// 외부(네이버 블로그 등)에 게시될 콘텐츠다. CLAUDE.md 18항의 "어드민 전용
// 규제 예외" 대상이 아니므로, 일반 CLAUDE.md 원칙(6항 투자 권유 금지, 8항
// "AI" 단어 금지, 14항 사실 서술체 원칙)을 다른 사용자 노출 화면과 동일하게
// 그대로 적용해야 한다.

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const DISCLAIMER =
  "본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다. 특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다. 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.";

export interface BlogDraft {
  title: string;
  body: string;
  categories: string[];
  kstDate: string;
}

export interface GenerateBlogDraftResult {
  ok: boolean;
  draft?: BlogDraft;
  error?: string;
}

function buildPrompt(data: DigestData): string {
  const top10Lines = [...data.top3, ...data.top4to10]
    .map((item) => `${item.rank}위 ${item.ticker}(${item.name}) — ${item.descriptions.join(", ")}`)
    .join("\n");

  const newEntrantLines = data.newEntrants.length > 0
    ? data.newEntrants.map((e) => `${e.ticker}(${e.name}) — ${e.description}`).join("\n")
    : "없음";

  const droppedLine = data.dropped.length > 0
    ? data.dropped.map((d) => `${d.ticker}(${d.name})`).join(", ")
    : "없음";

  const macroLines = data.macros.length > 0
    ? data.macros.map((m) => `${m.label}: ${m.value ?? "—"}${m.unit}`).join("\n")
    : "없음";

  return `다음은 ${data.kstDate} 미국 나스닥 주요 기업 동향 데이터입니다. 이 데이터를 바탕으로 네이버 블로그 등에 게시할 블로그 포스트 초안을 작성하세요.

[기업동향 TOP10]
${top10Lines}

[TOP30 신규 진입 종목]
${newEntrantLines}

[TOP30 이탈 종목]
${droppedLine}

[오늘 시장 변화]
- 기관 관련 공시: ${data.marketChange.institutionalCount}건
- 내부자 거래: ${data.marketChange.insiderCount}건
- 실적 예상치 상회: ${data.marketChange.earningsBeatCount}건
- 관련 공시: ${data.marketChange.filingsCount}건

[시장 분위기]
${data.marketMood}

[시장 요약]
${data.marketSummary}

[주요 경제지표]
${macroLines}

작성 지침
- 분량은 본문 800~1200자 내외로 작성하세요 (공백 포함, 한국어 기준). 이메일
  다이제스트보다 길고 자세하게 서술하세요.
- 아래 형식을 정확히 지켜 응답하세요.

[TITLE]
(블로그 제목 1줄, 30자 내외, 과장 없이 사실 위주)

[BODY]
(본문. 문단 구분은 빈 줄로. 마크다운 기호(#, **, - 등) 사용 금지, plain text만)

[CATEGORIES]
(쉼표로 구분된 카테고리 1~3개. 예: 기업 동향, 시장 흐름, 실적)

원칙
- 사실 기반 서술만 사용할 것. 분석·해설·의견·전망은 추가하지 말 것.
- "~했습니다", "~확인됐습니다", "~집계됐습니다" 형태의 사실 서술체로만 작성할 것.
- 투자 판단과 관련된 표현은 중립적으로 서술할 것.

절대 금지 표현 (아래 표현 및 이와 유사한 표현 사용 금지 — 종목 매수·매도를
권유·제안하거나 주가 방향을 예측하는 뉘앙스는 형태를 바꿔서도 사용하지 말 것)
- 포착, 선정, 추천, 추천 종목, 유망 종목, 투자 기회, 강력 추천
- 상승 신호, 하락 신호, 상승 예상, 하락 예상, 주가 전망, 목표주가, 적정주가, 강세 예상, 약세 예상
- 수익률 보장, 초과 수익, 높은 수익 기대, 투자 성공 가능성
- Strong Buy, Buy, Sell, 적극 매수, 적극 매도, 매수 추천, 매도 추천, 매수하세요, 매도하세요, 지금 매수, 지금 매도
- 투자 점수, 투자 매력도, 추천 점수, 매수 신호 점수
- 주목할 만한, 눈여겨볼, 관심이 집중된, 이목을 끄는, 활발한 움직임
- 강세, 약세, 상승 기대, 하락 우려, 투자 매력, 긍정적 신호, 부정적 신호
- 호조, 부진, 선전, 고전 (실적을 좋다/나쁘다로 평가하는 표현 — "예상치 상회/하회"처럼 수치 비교로만 서술할 것)
- 투자 권유

허용 표현 예시 (참고: "내부자 매수/매도 확인"처럼 공시에 기록된 거래 유형을
사실 그대로 서술하는 것은 금지 대상이 아니다 — 위에서 금지하는 것은 특정
종목을 사라거나 팔라고 권유하는 뉘앙스다)
- ~가 관측됐습니다 / ~가 확인됐습니다 / ~공시가 제출됐습니다 / ~건이 집계됐습니다 / ~변화가 있었습니다
- 최근 공시에서 다음 변화가 확인되었습니다 / 최근 30일 동안 관련 공시가 증가했습니다 / 과거 유사 사례가 존재합니다

기타 규칙
- 점수, 가중치, 알고리즘, 스코어링 로직, 내부 선정 기준 언급 금지
- "TickerFlow" 서비스명은 본문에서 1회 이내로만 언급, 과도한 홍보 문구 금지
- "AI" 단어 사용 금지 (Claude, Anthropic 등 생성 도구명도 언급 금지)
- 기관명·개인명 비노출
- 반드시 [TITLE], [BODY], [CATEGORIES] 세 섹션 헤더를 그대로 포함해 응답할 것`;
}

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
        max_tokens: 1800,
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

function parseDraft(text: string): { title: string; body: string; categories: string[] } | null {
  const titleMatch = text.match(/\[TITLE\]\s*([\s\S]*?)(?=\[BODY\]|$)/);
  const bodyMatch = text.match(/\[BODY\]\s*([\s\S]*?)(?=\[CATEGORIES\]|$)/);
  const categoriesMatch = text.match(/\[CATEGORIES\]\s*([\s\S]*)$/);

  const title = titleMatch?.[1]?.trim();
  const body = bodyMatch?.[1]?.trim();
  if (!title || !body) return null;

  const categoriesRaw = categoriesMatch?.[1]?.trim();
  const categories = categoriesRaw
    ? categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 3)
    : [];

  return { title, body, categories };
}

/**
 * 오늘의 TOP30/시장 변화 데이터(gatherDigestData — 이메일 다이제스트와 동일한
 * 데이터 소스)를 바탕으로 블로그 포스트 초안(제목/본문/제안 카테고리)을
 * 생성한다. 발행은 이미지 첨부 포함 전체 수동으로 진행하므로, 이 함수는
 * 초안 텍스트 생성까지만 담당하고 별도 저장은 하지 않는다.
 */
export async function generateBlogDraft(): Promise<GenerateBlogDraftResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not set" };
  }

  const digestData = await gatherDigestData();
  if (!digestData) {
    return { ok: false, error: "TOP30 데이터가 없습니다. 스크리너(top30) 실행 후 다시 시도하세요." };
  }

  const text = await callHaikuForDraft(buildPrompt(digestData));
  if (!text) {
    return { ok: false, error: "초안 생성에 실패했습니다 (Claude 호출 오류)." };
  }

  const parsed = parseDraft(text);
  if (!parsed) {
    return { ok: false, error: "생성된 응답 형식을 파싱하지 못했습니다. 다시 시도해주세요." };
  }

  return {
    ok: true,
    draft: {
      title: parsed.title,
      body: `${parsed.body}\n\n${DISCLAIMER}`,
      categories: parsed.categories,
      kstDate: digestData.kstDate,
    },
  };
}
