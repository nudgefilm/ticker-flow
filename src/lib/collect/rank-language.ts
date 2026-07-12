// LLM(Claude Haiku/Sonnet) 프롬프트에 "TOP30/TOP10/N위" 등 순위·선정 표현을
// 쓰지 말라는 금지 지시를 넣어도, 모델이 이를 어기고 생성하는 경우가 재발할 수
// 있다. 1차 방어선은 프롬프트 지시(digest.ts/blog-draft.ts/watchlist-brief.ts의
// "절대 사용 금지" 문구)이고, 이 모듈은 그 지시를 어겼을 때 걸러내는 2차
// 안전장치다. 어드민 화면(스코어링 엔진 자체 표기)에는 적용하지 않는다 —
// CLAUDE.md 18항의 어드민 전용 예외 구간.
const RANK_TERM_PATTERN = "TOP\\s?30|TOP\\s?20|TOP\\s?10|[0-9]+위(?!치)";
const RANK_TERM_REGEX_G = new RegExp(RANK_TERM_PATTERN, "gi");

export function containsRankTerm(text: string): boolean {
  return new RegExp(RANK_TERM_PATTERN, "i").test(text);
}

/** 제목·메타설명·해시태그처럼 짧은 한 줄 텍스트에서 순위 표현만 제거하고 남은 공백을 정리한다. */
export function stripRankTerms(text: string): string {
  return text
    .replace(RANK_TERM_REGEX_G, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

// ─── 문단 텍스트용: 문장 전체 삭제 대신 표현만 치환 ───────────────────────────
//
// 2026-07-12: 문장을 통째로 제거하는 방식(구 stripRankSentences)은 순위 표현이
// 걸릴 때 주변 맥락까지 함께 사라져 글 흐름이 끊기는 부작용이 있었다. 순위
// 표현이 들어간 관용구는 자연스러운 중립 표현으로 치환하고(동사 어미까지
// 맞춰서 치환 — 아니면 "새롭게 관측된."처럼 어미가 끊긴 비문이 남는다), 그 외
// 단독 사용은 표현+뒤에 붙은 조사만 함께 제거해 나머지 문장은 그대로 보존한다.
// 정규식만으로 모든 문맥에서 완벽한 문법을 보장할 수는 없으므로, 이 함수가
// 실제로 발동하는 일 자체가 드물도록 프롬프트 쪽 금지 지시를 우선한다(아래
// 각 파일의 "절대 사용 금지" 문구가 1차 방어선).

const TOP_N = "TOP\\s?(?:10|20|30)";
// 순위 표현 뒤에 자주 붙는 한국어 조사 — 표현과 함께 제거해야 "TOP30에" → "에"처럼
// 조사만 덩그러니 남는 비문을 방지한다.
const PARTICLE = "(?:에서|에게|으로서|으로|로서|이었|였|은|는|이|가|을|를|의|로|에|와|과)";

/** "진입/편입/이탈"처럼 어미가 붙는 동사구를 어미에 맞는 중립 표현으로 치환하는 교체기를 만든다. */
function verbPhraseReplacer(attributive: string, suffixMap: Record<string, string>) {
  return (_match: string, suffix?: string) => (suffix ? suffixMap[suffix] ?? "" : attributive);
}

// 구체적인 관용구를 먼저(위에서부터) 매칭해 자연스러운 대체 표현으로 치환하고,
// 남는 단독 사용은 조사 유무에 따라 통째로 제거하거나 "주요"로 치환한다.
const PARAGRAPH_REPLACEMENTS: [RegExp, string | ((...args: string[]) => string)][] = [
  [
    new RegExp(`${TOP_N}\\s*(?:에\\s*)?신규\\s*진입(했습니다|했다|하며|하면서|한)?`, "gi"),
    verbPhraseReplacer("새롭게 관측된", {
      "했습니다": "새롭게 관측되었습니다",
      "했다":     "새롭게 관측되었다",
      "하며":     "새롭게 관측되며",
      "하면서":   "새롭게 관측되면서",
      "한":       "새롭게 관측된",
    }),
  ],
  [
    new RegExp(`${TOP_N}\\s*(?:에|으로|로)?\\s*편입(되며|되어|된|됐습니다|됐다|하며)?`, "gi"),
    verbPhraseReplacer("관측 목록에 새로 포함된", {
      "되며":     "관측 목록에 새로 포함되며",
      "되어":     "관측 목록에 새로 포함되어",
      "된":       "관측 목록에 새로 포함된",
      "됐습니다": "관측 목록에 새로 포함되었습니다",
      "됐다":     "관측 목록에 새로 포함되었다",
      "하며":     "관측 목록에 새로 포함되며",
    }),
  ],
  [
    new RegExp(`${TOP_N}\\s*(?:에서)?\\s*이탈(한|했습니다|했다|하며)?`, "gi"),
    verbPhraseReplacer("관측 목록에서 빠진", {
      "한":       "관측 목록에서 빠진",
      "했습니다": "관측 목록에서 빠졌습니다",
      "했다":     "관측 목록에서 빠졌다",
      "하며":     "관측 목록에서 빠지며",
    }),
  ],
  [new RegExp(`${TOP_N}\\s*(?:기업\\s*)?동향`, "gi"), "주요 기업동향"],
  // "TOP30입니다"처럼 서술어(계사)로 쓰이는 경우 — "주요"만 남기면 "주요입니다"처럼
  // 명사 없이 어색해지므로 "종목"을 붙여 자연스러운 서술어로 만든다.
  [new RegExp(`${TOP_N}\\s*(입니다|이다|였습니다|이었습니다|였다|이었다)`, "gi"), "주요 종목$1"],
  [new RegExp(`${TOP_N}\\s*${PARTICLE}`, "gi"), ""],
  [new RegExp(TOP_N, "gi"), "주요"],
  // "N위"는 흔히 "3위를 기록한", "1위에 오르며", "23위였던"처럼 동사구·서술어와
  // 함께 쓰이므로, 그 어구까지 함께 제거해야 조사만 남는 비문을 피할 수 있다.
  [/[0-9]+위(?!치)(?:를|을)?\s*(?:기록한|기록했습니다|기록했다|기록하며|차지한|차지했습니다|차지했다|차지하며)/g, ""],
  [/[0-9]+위(?!치)(?:에|로)\s*(?:오르며|오르면서|오른|올랐습니다|올랐다|마감하며|마감했습니다|마감했다)/g, ""],
  [/[0-9]+위(?!치)(?:이었던|였던|이었습니다|였습니다|이었다|였다|인|이다)/g, ""],
  [new RegExp(`[0-9]+위(?!치)${PARTICLE}?`, "g"), ""],
];

/**
 * 문단 텍스트(본문·요약문)에서 순위 표현을 자연스러운 중립 표현으로
 * 치환하거나(관용구), 표현+조사를 함께 제거한다(일반 케이스). 문장을 통째로
 * 지우지 않고 나머지 문맥은 그대로 보존한다.
 */
export function neutralizeRankLanguage(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PARAGRAPH_REPLACEMENTS) {
    out = typeof replacement === "string"
      ? out.replace(pattern, replacement)
      : out.replace(pattern, replacement as (substring: string, ...args: string[]) => string);
  }
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}
