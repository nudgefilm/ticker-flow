// SEC EDGAR 공시 원문을 요약 생성 시점에만 fetch한다. filings 테이블에는 원문을
// 저장하지 않으며, 이 모듈이 반환하는 텍스트는 호출자가 Haiku 요약 입력으로만
// 쓰고 즉시 버려야 한다.

const SEC_USER_AGENT = "TickerFlow support@tickerflow.net";

// 10-K 본문(iXBRL 포함)이 수 MB에 달할 수 있어 다운로드된 HTML 자체를 이 길이
// 에서 자른다. Item 7~7A는 통상 문서 중반부에 있어 대부분의 실제 파일링이
// 이 범위 안에 들어온다.
const MAX_HTML_CHARS = 3_000_000;

// Haiku 입력으로 넘기는 최종 본문 길이 상한(추출 성공/폴백 공통).
const MAX_BODY_CHARS = 12_000;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    // 인라인 XBRL 문서 상단의 <ix:header>(문맥·단위 정의 등 숫자/코드 위주 메타데이터,
    // 화면에는 보이지 않음)를 제거하지 않으면, 본문 섹션 추출이 실패했을 때 쓰는
    // "문서 앞부분" 폴백이 이 메타데이터 덩어리를 그대로 요약 입력으로 넘기게 된다
    // (2026-07-16 ARTW 10-Q 등에서 Haiku가 "이건 XBRL 메타데이터라 요약할 수 없다"고
    // 응답하는 사례로 확인).
    .replace(/<ix:header[\s\S]*?<\/ix:header>/gi, " ")
    .replace(/<ix:hidden[\s\S]*?<\/ix:hidden>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&") // 다른 엔티티를 모두 디코딩한 뒤 마지막에 처리(그래야 &amp;#39; 같은 이중 인코딩도 안전)
    .replace(/\s+/g, " ")
    .trim();
}

function resolveHref(href: string): string {
  // 인덱스 페이지의 본문 링크는 보통 iXBRL 뷰어(/ix?doc=...)로 감싸져 있어
  // 실제 문서 경로는 doc= 파라미터 안에 있다.
  const ixMatch = href.match(/[?&]doc=([^&]+)/);
  const path = ixMatch ? decodeURIComponent(ixMatch[1]) : href;
  return path.startsWith("http") ? path : `https://www.sec.gov${path}`;
}

/** "DEF 14A" vs "DEF14A"처럼 공백 유무만 다른 표기를 동일하게 취급 */
function normalizeFormType(s: string): string {
  return s.toUpperCase().replace(/\s+/g, "");
}

/** 인덱스 페이지(-index.htm)에서 form_type과 일치하는 본문 문서 URL을 찾는다. */
function extractPrimaryDocUrl(indexHtml: string, formType: string): string | null {
  const rows = indexHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const wantedType = normalizeFormType(formType);
  let fallbackHref: string | null = null;

  for (const row of rows) {
    const hrefMatch = row.match(/href="([^"]+\.htm[^"]*)"/i);
    if (!hrefMatch) continue;

    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map((c) =>
      c.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim()
    );
    const seqCell = cells[0] ?? "";
    const typeCell = normalizeFormType(cells[3] ?? "");

    if (!fallbackHref && seqCell === "1") fallbackHref = hrefMatch[1];
    if (typeCell === wantedType || typeCell.startsWith(wantedType)) {
      return resolveHref(hrefMatch[1]);
    }
  }

  return fallbackHref ? resolveHref(fallbackHref) : null;
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": SEC_USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * startRes 중 문서 안에서 "가장 마지막에 등장하는" 매치를 시작점으로 삼는다
 * (목차에 나오는 첫 언급을 건너뛰고 실제 본문 섹션을 잡기 위함). endRes 중
 * 그 이후 가장 먼저 매치되는 지점을 끝으로 자른다. 200자 미만이면 목차 등
 * 잡음으로 보고 실패 처리한다.
 */
function extractSection(text: string, startRes: RegExp[], endRes: RegExp[]): string | null {
  for (const startRe of startRes) {
    const matches = [...text.matchAll(new RegExp(startRe, "gi"))];
    if (matches.length === 0) continue;
    const last = matches[matches.length - 1];
    if (typeof last.index !== "number") continue;
    const startIdx = last.index + last[0].length;

    let endIdx = text.length;
    for (const endRe of endRes) {
      const endMatch = text.slice(startIdx).match(new RegExp(endRe, "i"));
      if (endMatch && typeof endMatch.index === "number") {
        endIdx = startIdx + endMatch.index;
        break;
      }
    }

    const section = text.slice(startIdx, endIdx).trim();
    if (section.length > 200) return section;
  }
  return null;
}

/** form_type에 맞춰 요약 입력으로 쓸 본문을 정한다. 추출 실패 시 문서 앞부분으로 폴백. */
function pickBody(text: string, formType: string): string {
  if (formType === "10-K") {
    // management\s*['’]?\s*s?: SEC 필러가 "Management's"를 문자 단위 인라인
    // 태그(span/font)로 감싸는 경우, 태그 제거 후 "Management ’ s"처럼 어포스트로피
    // 앞뒤에 공백이 끼어드는 경우가 실제로 있다(ARTW 10-Q에서 확인, 2026-07-16).
    const section = extractSection(
      text,
      [/item\s*7\.?\s*management\s*['’]?\s*s?\s+discussion/i],
      [/item\s*7a\.?/i, /item\s*8\.?/i]
    );
    if (section) return section.slice(0, MAX_BODY_CHARS);
  } else if (formType === "10-Q") {
    // 10-Q의 MD&A는 10-K와 달리 Item 7이 아니라 Part I Item 2다.
    const section = extractSection(
      text,
      [/item\s*2\.?\s*management\s*['’]?\s*s?\s+discussion/i],
      [/item\s*3\.?/i, /item\s*4\.?/i]
    );
    if (section) return section.slice(0, MAX_BODY_CHARS);
  } else if (formType === "S-1") {
    // S-1은 10-K/10-Q와 달리 Item 번호가 없어 자유 서식 제목에 의존한다. 실측
    // 결과(2026-07-16): 신규 IPO 성격의 S-1은 "Prospectus Summary" 뒤에
    // "The Offering"이 이어지는 구조가 실제로 확인됨. 반면 재판매(resale/shelf)
    // 성격의 S-1은 "Prospectus Summary"라는 문구가 본문 교차 참조("~ 섹션
    // 참고")로만 등장해 이 패턴이 안 맞고, 그 경우 200자 미만으로 걸러져
    // 자동으로 문서 앞부분 폴백으로 넘어간다(안전).
    const section = extractSection(
      text,
      [/prospectus\s+summary/i],
      [/the\s+offering/i, /risk\s+factors/i]
    );
    if (section) return section.slice(0, MAX_BODY_CHARS);
  } else if (formType === "DEF 14A" || formType === "DEF14A") {
    // DEF 14A(위임장 권유서)는 S-1보다 서식이 더 자유로워 검증할 실제 표본이
    // 없었다(2026-07-16 기준 filings 테이블에 DEF 14A 행 0건). SEC 관행상
    // 흔한 "Proxy Statement Summary" 섹션을 시도하고, 못 찾으면 문서 앞부분
    // 폴백으로 안전하게 떨어진다.
    const section = extractSection(
      text,
      [/proxy\s+statement\s+summary/i],
      [/questions\s+and\s+answers/i, /table\s+of\s+contents/i, /proposal\s+(?:no\.?\s*)?1\b/i]
    );
    if (section) return section.slice(0, MAX_BODY_CHARS);
  }
  // 8-K 또는 위 추출 실패 시: 문서 앞부분으로 폴백
  return text.slice(0, MAX_BODY_CHARS);
}

/**
 * SEC 공시 원문을 요약 입력용 텍스트로 변환해 반환한다. 반환값은 호출자가
 * Haiku 요약 생성에만 사용하고 즉시 버려야 하며, 이 함수는 DB에 아무것도
 * 저장하지 않는다. indexUrl은 filings.url(형태: ...-index.htm)을 그대로 받는다.
 */
export async function fetchFilingBodyForSummary(
  indexUrl: string,
  formType: string
): Promise<string | null> {
  const indexHtml = await fetchText(indexUrl, 10_000);
  if (!indexHtml) return null;

  const docUrl = extractPrimaryDocUrl(indexHtml, formType);
  if (!docUrl) return null;

  const docHtml = await fetchText(docUrl, 20_000);
  if (!docHtml) return null;

  const text = htmlToText(docHtml.slice(0, MAX_HTML_CHARS));
  if (!text) return null;

  return pickBody(text, formType);
}
