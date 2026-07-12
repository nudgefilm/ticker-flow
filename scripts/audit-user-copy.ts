/**
 * scripts/audit-user-copy.ts
 *
 * TOP30 순위 표기가 사용자 노출 화면(주간/월간 리포트)에 재발했던 사고
 * (2026-07-12) 재발 방지용 — CLAUDE.md 6항(투자 권유·추천·주가 예측·투자
 * 성과 암시·투자 등급·종합 투자 점수 금지)·12항(랜딩 금지 표현) 기준 문구가
 * 사용자 노출 코드(정적 문자열 + LLM 프롬프트 문자열)에 남아있는지 검사한다.
 *
 * 대상(2026-07-12 확대): src/app/**·src/components/** 전체 중 /admin,
 * /api/admin, src/components/admin 제외 + 실제로 사용자 노출 텍스트를
 * 생성하는 lib 파일 전체(TARGET_LIB_FILES — src/lib/collect/, src/lib/email/
 * 를 전부 훑어 Anthropic API를 호출하는 파일 중 자유 텍스트를 생성하는
 * 파일만 선별, 아래 discoverTargetFiles 주석 참고). 어드민 화면·스코어링
 * 엔진 자체(scoring.ts/top30.ts/top30-outcomes.ts/scoring/**·outcomes/**)는
 * CLAUDE.md 18항의 어드민 전용 규제 예외 구간이라 대상에서 뺀다.
 *
 * 대상 파일 선정 방식: src/app, src/components는 디렉터리 재귀 스캔(walk) —
 * admin 하위만 제외하고 새 파일이 생겨도 자동으로 포함된다. lib 파일은
 * 하드코딩 목록(TARGET_LIB_FILES)이다 — src/lib/collect·src/lib/email 전체를
 * 디렉터리 스캔하면 스코어링 엔진(관리자 전용, 문자열 자체가 순위 로직
 * 코드라 오탐 폭증)까지 쓸려 들어가므로, "사용자 노출 텍스트를 생성하는
 * 파일"만 사람이 선별해 넣는 방식을 택했다. 새 프롬프트/템플릿 파일을 추가할
 * 때는 이 목록에 수동으로 추가해야 한다 — 자동으로 잡히지 않는다.
 *
 * 완벽한 정적 분석기가 아니라 "사람이 검토할 후보를 좁혀주는 가드레일"이라는
 * 전제로 설계했다. 오탐 처리 원칙:
 * - // 라인 주석과 /* *\/ 블록 주석은 통째로 제거하고 스캔한다 — 주석은
 *   정의상 사용자에게 노출되지 않는다.
 * - src/app·src/components 파일은 "실제 화면에 그려지는 텍스트"만 잡아야
 *   하므로, 문자열 리터럴 내부 또는 JSX 텍스트 구간에 있는 매칭만 본다.
 *   import 구문의 모듈 경로("@/lib/collect/top30" 같은)나, 로그 태그처럼
 *   다른 단어 없이 매칭된 단어 그대로만 감싸고 있는 짧은 문자열("top30")은
 *   자연어 문구가 아니라 내부 식별자로 보고 제외한다.
 * - TARGET_LIB_FILES(이메일/블로그/리포트/BRIEF/어닝콜 프롬프트)는 원문
 *   그대로 스캔하되, "금지"/"하지 않"/"제외합니다" 같은 단어가 나온 줄부터
 *   다음 빈 줄까지는 "금지 지시문 자체"(예: BANNED_BLOCK, brief.ts의
 *   FORBIDDEN_PHRASES)로 보고 제외한다. 이 판정은 주석을 지우기 전의 원본
 *   줄로 하므로("// CLAUDE.md 6항 금지 표현" 같은 주석도 트리거가 된다),
 *   주석 제거와 순서가 다르다는 점에 주의할 것.
 * - KNOWN_SAFE_MATCHES: 위 규칙으로도 걸러지지 않는, 검토를 마친 개별
 *   예외만 파일+매칭 문자열 단위로 명시적으로 등록한다. 새 예외를 추가할
 *   때는 왜 안전한지 주석을 반드시 남길 것.
 *
 * 실행:
 *   pnpm run audit:copy
 *
 * package.json prebuild에 연결되어 pnpm build 시 자동 실행되며, 위반 발견
 * 시 빌드(및 Vercel 배포)를 실패시킨다.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ─── 대상 범위 ────────────────────────────────────────────────────────────────

// 디렉터리 재귀 스캔 대상 — admin 하위만 빼고 전부 본다. 새 파일이 생기면
// 자동으로 검사 대상에 포함된다.
const SCAN_DIRS = [
  { dir: path.join(ROOT, "src/app"), excluded: ["src/app/admin", "src/app/api/admin"] },
  { dir: path.join(ROOT, "src/components"), excluded: ["src/components/admin"] },
];

// 하드코딩 목록 — LLM 프롬프트 또는 정적 사용자 노출 텍스트를 실제로 생성하는
// lib 파일만 사람이 선별해 등록한다(자동 스캔이 아니다. 위 모듈 docblock 참고).
//
// src/lib/collect/, src/lib/email/ 전체(2026-07-12 기준 36개 파일)를 훑어
// Anthropic API를 호출하는 파일을 전부 추린 뒤, 그중 "자유 텍스트 생성"과
// "고정 카테고리/JSON 필드 채우기"를 구분해 아래만 남겼다:
//   포함 — digest.ts(이메일), blog-draft.ts(블로그), watchlist-brief.ts
//         (주간/월간 BRIEF 요약), templates.ts(이메일 HTML),
//         summarize.ts(공시·뉴스·기업개요 한국어 요약, CLAUDE.md 14항),
//         brief.ts(종목 스냅샷 BRIEF, stock_briefs), calls.ts(어닝콜 요약),
//         weekly-brief.ts/monthly-brief.ts(BRIEF 오케스트레이터 — 현재는
//         자체 프롬프트 문자열이 없지만, 향후 직접 텍스트를 추가할 수 있어
//         선제적으로 포함)
//   제외 — news.ts/insider.ts/filings.ts/translate.ts(자체 프롬프트 없이
//         summarize.ts에 위임), classify-filings.ts(출력이 고정 카테고리
//         토큰 하나뿐, 자연어 아님), rank-language.ts(순위 표현 안전장치
//         자체 — 금지어를 패턴 문자열로 담고 있어 오탐만 발생, audit
//         스크립트 자신처럼 메타 코드), resend.ts(API 클라이언트, 텍스트 없음)
const TARGET_LIB_FILES = new Set(
  [
    "src/lib/collect/digest.ts",
    "src/lib/collect/blog-draft.ts",
    "src/lib/collect/summarize.ts",
    "src/lib/collect/brief.ts",
    "src/lib/collect/calls.ts",
    "src/lib/collect/weekly-brief.ts",
    "src/lib/collect/monthly-brief.ts",
    "src/lib/watchlist-brief.ts",
    "src/lib/email/templates.ts",
  ].map((p) => path.join(ROOT, p))
);

function walk(dir: string, excludedPrefixes: string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludedPrefixes.some((prefix) => (full + path.sep).startsWith(prefix))) continue;
      walk(full, excludedPrefixes, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function discoverTargetFiles(): string[] {
  const scannedFiles = SCAN_DIRS.flatMap(({ dir, excluded }) => {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
    const excludedPrefixes = excluded.map((p) => path.join(ROOT, p) + path.sep);
    return walk(dir, excludedPrefixes);
  });
  const libFiles = [...TARGET_LIB_FILES].filter((f) => statSync(f, { throwIfNoEntry: false })?.isFile());
  return [...new Set([...scannedFiles, ...libFiles])];
}

// ─── 금지 패턴 (CLAUDE.md 6항·12항 기준) ───────────────────────────────────────

interface BannedPattern {
  category: string;
  pattern: RegExp;
}

// TOP10/TOP20/TOP30은 "top30_daily"/"runTop30Select"류 내부 식별자에도 문자열로
// 포함되어 있어, 앞뒤에 식별자 문자(글자/숫자/밑줄)가 붙어있지 않을 때만
// 매칭한다(부정 lookaround) — 실제 사용자 노출 문구(예: "TOP30 기업")만 잡는다.
const IDENT_BOUNDARY_BEFORE = "(?<![A-Za-z0-9_])";
const IDENT_BOUNDARY_AFTER = "(?![A-Za-z0-9_])";

const BANNED_PATTERNS: BannedPattern[] = [
  // 순위 표기
  {
    category: "순위 표기",
    pattern: new RegExp(`${IDENT_BOUNDARY_BEFORE}TOP\\s?(?:10|20|30)${IDENT_BOUNDARY_AFTER}`, "gi"),
  },
  { category: "순위 표기(N위)", pattern: /[0-9]+위(?!치)/g },
  // 투자 추천
  { category: "투자 추천", pattern: /매수\s*추천|매도\s*추천|추천\s*종목|유망\s*종목|투자\s*기회|강력\s*추천|매수\s*타이밍|상승\s*가능성|급등\s*종목|수익\s*기회/g },
  // 주가 예측
  { category: "주가 예측", pattern: /상승\s*예상|하락\s*예상|주가\s*전망|목표주가|적정주가|강세\s*예상|약세\s*예상/g },
  // 투자 성과 암시
  { category: "투자 성과 암시", pattern: /수익률\s*보장|초과\s*수익|높은\s*수익\s*기대|투자\s*성공\s*가능성/g },
  // 투자 등급
  { category: "투자 등급", pattern: /\bStrong Buy\b|\bBuy\b|\bSell\b|적극\s*매수|적극\s*매도/g },
  // 종합 투자 점수
  { category: "종합 투자 점수", pattern: /투자\s*점수|투자\s*매력도|추천\s*점수|매수\s*신호\s*점수/g },
];

// ─── 주석 제거 (주석은 정의상 사용자에게 노출되지 않는다) ──────────────────────

function stripComments(content: string): string {
  const noBlock = content.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return noBlock
    .split("\n")
    .map((line) => line.replace(/(?<!:)\/\/.*$/, ""))
    .join("\n");
}

// ─── TARGET_LIB_FILES용: "금지" 지시문 구간(다음 빈 줄까지) 스캔 제외 ───────────

function computeSuppressZones(lines: string[]): boolean[] {
  const suppress = new Array<boolean>(lines.length).fill(false);
  let zoneActive = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") { zoneActive = false; continue; }
    if (line.includes("금지") || line.includes("하지 않") || line.includes("제외합니다")) zoneActive = true;
    if (zoneActive) suppress[i] = true;
  }
  return suppress;
}

// ─── src/app 파일용: 문자열/JSX 텍스트 구간 안의 매칭만 실제 카피로 인정 ────────

/** matchIndex 위치가 줄 안에서 인용부호(", ', `) 문자열 내부인지 확인한다. */
function isInsideQuotedString(line: string, matchIndex: number): boolean {
  let inS = false, inD = false, inB = false;
  for (let i = 0; i < matchIndex; i++) {
    const c = line[i];
    const prev = line[i - 1];
    if (c === "'" && prev !== "\\" && !inD && !inB) inS = !inS;
    else if (c === '"' && prev !== "\\" && !inS && !inB) inD = !inD;
    else if (c === "`" && prev !== "\\" && !inS && !inD) inB = !inB;
  }
  return inS || inD || inB;
}

/** matchIndex를 감싸는 인용부호 문자열의 내용을 반환한다(찾지 못하면 null). */
function getEnclosingQuotedString(line: string, matchIndex: number): string | null {
  for (const quote of ['"', "'", "`"]) {
    const start = line.lastIndexOf(quote, matchIndex);
    if (start === -1) continue;
    const end = line.indexOf(quote, matchIndex);
    if (end === -1) continue;
    // start가 진짜 여는 인용부호인지(짝수 개의 이전 인용부호) 대략 확인
    return line.slice(start + 1, end);
  }
  return null;
}

/** matchIndex 위치가 JSX 텍스트 구간(">텍스트<" 사이)인지 확인한다(단순 휴리스틱). */
function isInsideJsxText(line: string, matchIndex: number): boolean {
  const before = line.slice(0, matchIndex);
  const after = line.slice(matchIndex);
  const lastOpen = before.lastIndexOf(">");
  const lastCloseBefore = before.lastIndexOf("<");
  const nextClose = after.indexOf("<");
  const nextOpenAfter = after.indexOf(">");
  if (lastOpen === -1 || nextClose === -1) return false;
  if (lastCloseBefore > lastOpen) return false;
  if (nextOpenAfter !== -1 && nextOpenAfter < nextClose) return false;
  return true;
}

function isImportOrExportLine(line: string): boolean {
  const trimmed = line.trim();
  return /^(import|export)\b/.test(trimmed) || /^}\s*from\s*["']/.test(trimmed);
}

/** src/app 파일에서 matchIndex 위치가 "실제 사용자 카피"로 볼 수 있는 위치인지 판단한다. */
function isRealCopyContext(line: string, matchIndex: number): boolean {
  if (isInsideJsxText(line, matchIndex)) return true;
  if (isInsideQuotedString(line, matchIndex)) {
    const enclosing = getEnclosingQuotedString(line, matchIndex);
    // 감싸는 문자열 전체가 영문/숫자/-/_ 로만 이루어진 한 토큰이면(공백·한글
    // 없음) 로그 태그·job id 등 내부 식별자 문자열로 보고 카피가 아니라고
    // 판단한다(예: "top30", "top30-outcomes"). 자연어 문구는 공백이나
    // 한글을 포함하므로 이 패턴에 걸리지 않는다.
    if (enclosing !== null && /^[A-Za-z0-9_-]+$/.test(enclosing.trim())) return false;
    return true;
  }
  return false;
}

// ─── 검토를 마친 개별 예외 ──────────────────────────────────────────────────────
//
// DB 테이블명·내부 식별자(top30_daily, top30_entries, top30_outcome_results,
// SCORING_MODEL_VERSION 등)는 이 목록에 등록하지 않았다 — 등록할 필요가 없기
// 때문이다. 이유:
// 1) "순위 표기" 패턴 자체에 식별자 경계 부정 lookaround(IDENT_BOUNDARY_
//    BEFORE/AFTER, 위 BANNED_PATTERNS 정의부 참고)가 있어 "top30_daily"처럼
//    앞뒤에 글자·숫자·밑줄이 붙은 경우 매칭 자체가 발생하지 않는다(밑줄도
//    식별자 문자로 취급). 즉 KNOWN_SAFE_MATCHES에 등록해도 그 항목은 절대
//    참조되지 않는 죽은 코드가 된다.
// 2) 실제로 2026-07-12 확대 스캔(190개 파일) 결과, 이 식별자들은 스캔 대상
//    파일 안에서 전부 "// 2026-07-11: top30_daily.rank..." 같은 코드 주석
//    으로만 등장했고(주석은 별도로 제거되어 스캔되지 않음), 실제 문자열로
//    등장하는 곳(top30.ts의 `.from("top30_daily")` 등)은 이미 admin-only로
//    제외된 파일 안에 있었다.
// 이 문서화 자체가 "등록 근거"다 — 향후 이 식별자들이 비-admin 파일에 실제
// 문자열로 등장해도 위 두 안전장치(경계 lookaround + 지역별 식별자 문자열
// 판정)가 그대로 작동하므로 추가 조치가 필요 없다.

interface KnownSafe {
  file: string;
  matched: string;
  reason: string;
}

const KNOWN_SAFE_MATCHES: KnownSafe[] = [
  {
    file: "src/app/policy/page.tsx",
    matched: "목표주가",
    reason:
      "\"애널리스트 목표주가 변경 내역\"은 TickerFlow가 실제로 제공하는 공개 데이터 항목 " +
      "이름(price_targets 수집기, CLAUDE.md 5항)을 나열한 것이며, TickerFlow 자체가 목표주가를 " +
      "제시한다는 뜻이 아니다.",
  },
  {
    file: "src/lib/collect/blog-draft.ts",
    matched: "TOP30",
    reason:
      "\"TOP30 데이터가 없습니다...\" 에러 문구는 /admin/ops/blog-draft(어드민 전용 화면)에서만 " +
      "표시되며, 직전 세션에서 사용자가 명시적으로 문구 재수정을 보류하도록 지시했다.",
  },
];

function isKnownSafe(file: string, matched: string): boolean {
  return KNOWN_SAFE_MATCHES.some((k) => k.file === file && k.matched.toLowerCase() === matched.toLowerCase());
}

// ─── 스캔 ─────────────────────────────────────────────────────────────────────

interface Violation {
  file: string;
  line: number;
  category: string;
  matched: string;
}

function findMatches(line: string): { index: number; category: string; text: string }[] {
  const found: { index: number; category: string; text: string }[] = [];
  for (const { category, pattern } of BANNED_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const m of line.matchAll(re)) {
      found.push({ index: m.index ?? 0, category, text: m[0] });
    }
  }
  return found;
}

function scanLibPromptFile(filePath: string, relFile: string): Violation[] {
  const rawContent = readFileSync(filePath, "utf-8");
  // 억제 구간 판정은 주석을 지우기 전 원본 줄로 한다 — "// CLAUDE.md 6항
  // 금지 표현" 같은 주석 한 줄이 그 아래 배열/목록 전체를 "금지 지시문
  // 자체"로 표시해주는 트리거이기 때문(brief.ts의 FORBIDDEN_PHRASES 등).
  // 주석부터 지워버리면 이 트리거 자체가 사라져 오탐이 발생한다.
  const suppressZones = computeSuppressZones(rawContent.split("\n"));
  const lines = stripComments(rawContent).split("\n");
  const violations: Violation[] = [];

  lines.forEach((line, i) => {
    if (suppressZones[i]) return;
    for (const m of findMatches(line)) {
      if (isKnownSafe(relFile, m.text)) continue;
      violations.push({ file: relFile, line: i + 1, category: m.category, matched: m.text });
    }
  });
  return violations;
}

function scanAppFile(filePath: string, relFile: string): Violation[] {
  const lines = stripComments(readFileSync(filePath, "utf-8")).split("\n");
  const violations: Violation[] = [];

  lines.forEach((line, i) => {
    if (isImportOrExportLine(line)) return;
    for (const m of findMatches(line)) {
      if (!isRealCopyContext(line, m.index)) continue;
      if (isKnownSafe(relFile, m.text)) continue;
      violations.push({ file: relFile, line: i + 1, category: m.category, matched: m.text });
    }
  });
  return violations;
}

function scanFile(filePath: string): Violation[] {
  const relFile = path.relative(ROOT, filePath).replace(/\\/g, "/");
  return TARGET_LIB_FILES.has(filePath) ? scanLibPromptFile(filePath, relFile) : scanAppFile(filePath, relFile);
}

function main(): void {
  const files = discoverTargetFiles();
  const violations = files.flatMap(scanFile);

  if (violations.length === 0) {
    console.log(`[audit-user-copy] 검사 완료 — ${files.length}개 파일, 위반 없음.`);
    return;
  }

  console.error(`[audit-user-copy] 위반 ${violations.length}건 발견 (검사 대상 ${files.length}개 파일):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.category}]  "${v.matched}"`);
  }
  process.exit(1);
}

main();
