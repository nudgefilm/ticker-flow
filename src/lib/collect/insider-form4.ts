// Finnhub insider-transactions API 응답에는 title(직책) 필드가 없어(현재 플랜 기준
// 항상 비어 있음), SEC EDGAR Form 4 원문에서 직접 파싱해 채운다.
//
// 흐름: 티커의 최근 Form 4 제출 목록(atom feed) 조회
//      → filingDate와 가까운 후보 필터링
//      → 각 후보의 인덱스 페이지에서 원문 XML 링크 추출
//      → XML의 reportingOwner 블록에서 이름·직책 파싱
//      → Finnhub가 알려준 내부자 이름과 매칭되는 직책을 반환

const SEC_USER_AGENT = "TickerFlow support@tickerflow.net";

export interface Form4Filing {
  accessionNumber: string;
  filingDate: string; // YYYY-MM-DD
  indexUrl: string;
}

export interface Form4Owner {
  name: string;
  title: string | null;
}

function normalizeName(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[.,]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

// 이름 표기 순서·중간이니셜 유무가 달라도(Finnhub "LEVINSON ARTHUR D" vs SEC 원문
// "Newstead Jennifer") 매칭되도록 순서 무관 토큰 집합으로 비교한다. 짧은 쪽의 토큰이
// 모두 포함돼야 매칭으로 인정해 오탐(동명이인 등)을 줄인다.
export function namesMatch(a: string, b: string): boolean {
  const tokensA = normalizeName(a);
  const tokensB = normalizeName(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const [small, big] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  const bigSet = new Set(big);
  const overlap = small.filter((t) => bigSet.has(t)).length;

  return overlap === small.length && overlap >= Math.min(2, small.length);
}

function relationshipToTitle(rel: {
  officerTitle: string | null;
  isDirector: boolean;
  isOfficer: boolean;
  isTenPercentOwner: boolean;
  isOther: boolean;
  otherText: string | null;
}): string | null {
  if (rel.officerTitle) return rel.officerTitle;
  if (rel.isDirector) return "Director";
  if (rel.isTenPercentOwner) return "10% Owner";
  if (rel.isOfficer) return "Officer";
  if (rel.isOther) return rel.otherText || "Other";
  return null;
}

// SEC Form 4 XML은 스키마가 단순·고정적이라 정규식 파싱으로 충분하며
// 별도 XML 파서 의존성을 추가하지 않는다 (프로젝트 기존 관행과 동일).
export function parseForm4Xml(xml: string): Form4Owner[] {
  const owners: Form4Owner[] = [];
  const blocks = xml.match(/<reportingOwner>[\s\S]*?<\/reportingOwner>/g) ?? [];

  for (const block of blocks) {
    const nameMatch = block.match(/<rptOwnerName>([^<]*)<\/rptOwnerName>/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (!name) continue;

    const relMatch = block.match(/<reportingOwnerRelationship>([\s\S]*?)<\/reportingOwnerRelationship>/);
    const rel = relMatch ? relMatch[1] : "";

    const officerTitleMatch = rel.match(/<officerTitle>([^<]*)<\/officerTitle>/);
    const officerTitle = officerTitleMatch
      ? officerTitleMatch[1].replace(/\s+/g, " ").trim() || null
      : null;
    const otherTextMatch = rel.match(/<otherText>([^<]*)<\/otherText>/);
    const otherText = otherTextMatch ? otherTextMatch[1].trim() || null : null;

    const isTrue = (tag: string) => new RegExp(`<${tag}>\\s*(1|true)\\s*</${tag}>`, "i").test(rel);

    const title = relationshipToTitle({
      officerTitle,
      isDirector: isTrue("isDirector"),
      isOfficer: isTrue("isOfficer"),
      isTenPercentOwner: isTrue("isTenPercentOwner"),
      isOther: isTrue("isOther"),
      otherText,
    });

    owners.push({ name, title });
  }

  return owners;
}

// 티커의 최근 Form 4 제출 목록 조회. EDGAR browse-edgar는 CIK 파라미터에 티커 심볼도
// 그대로 받아주므로 별도 CIK 매핑 없이 조회 가능하다.
export async function fetchForm4Filings(ticker: string, count = 40): Promise<Form4Filing[]> {
  const url =
    `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(ticker)}` +
    `&type=4&dateb=&owner=include&count=${count}&output=atom`;

  const res = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];

  const text = await res.text();
  const entries = text.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const filings: Form4Filing[] = [];

  for (const entry of entries) {
    const accMatch = entry.match(/<accession-number>([^<]*)<\/accession-number>/);
    const dateMatch = entry.match(/<filing-date>([^<]*)<\/filing-date>/);
    const hrefMatch = entry.match(/<filing-href>([^<]*)<\/filing-href>/);
    if (!accMatch || !dateMatch || !hrefMatch) continue;
    filings.push({ accessionNumber: accMatch[1], filingDate: dateMatch[1], indexUrl: hrefMatch[1] });
  }

  return filings;
}

// 인덱스 페이지에서 실제 원문 XML 링크 추출. xslF345X.. 하위 경로는 뷰어(스타일 적용본)라 제외.
export async function fetchForm4PrimaryXmlUrl(indexUrl: string): Promise<string | null> {
  const res = await fetch(indexUrl, {
    headers: { "User-Agent": SEC_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;

  const html = await res.text();
  const links = [...html.matchAll(/href="([^"]+\.xml)"/g)].map((m) => m[1]);
  const primary = links.find((l) => !l.includes("/xsl")) ?? links[0];
  if (!primary) return null;

  return primary.startsWith("http") ? primary : `https://www.sec.gov${primary}`;
}

export async function fetchForm4Owners(indexUrl: string): Promise<Form4Owner[]> {
  const xmlUrl = await fetchForm4PrimaryXmlUrl(indexUrl);
  if (!xmlUrl) return [];

  const res = await fetch(xmlUrl, {
    headers: { "User-Agent": SEC_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];

  return parseForm4Xml(await res.text());
}

// filingDate와 가까운 순으로 후보를 정렬 (기본 ±3일 이내만)
export function rankForm4Candidates(filings: Form4Filing[], targetDate: string, maxDays = 3): Form4Filing[] {
  const target = new Date(targetDate + "T00:00:00Z").getTime();
  return filings
    .filter((f) => Math.abs(new Date(f.filingDate + "T00:00:00Z").getTime() - target) <= maxDays * 86_400_000)
    .sort(
      (a, b) =>
        Math.abs(new Date(a.filingDate + "T00:00:00Z").getTime() - target) -
        Math.abs(new Date(b.filingDate + "T00:00:00Z").getTime() - target)
    );
}

// 티커 단위로 Form 4 목록·소유자 XML을 캐싱하며 이름 매칭 직책을 조회하는 헬퍼.
// 같은 종목의 여러 거래가 동일 accession(공동 제출)을 참조하는 경우 중복 조회를 피한다.
export function createInsiderTitleLookup(ticker: string) {
  let filingsPromise: Promise<Form4Filing[]> | null = null;
  const ownersCache = new Map<string, Form4Owner[]>();

  return async function lookupTitle(insiderName: string, filingDate: string): Promise<string | null> {
    try {
      filingsPromise ??= fetchForm4Filings(ticker);
      const filings = await filingsPromise;
      const candidates = rankForm4Candidates(filings, filingDate).slice(0, 5);

      for (const candidate of candidates) {
        let owners = ownersCache.get(candidate.accessionNumber);
        if (owners === undefined) {
          owners = await fetchForm4Owners(candidate.indexUrl);
          ownersCache.set(candidate.accessionNumber, owners);
          await new Promise((r) => setTimeout(r, 150)); // SEC rate limit 배려
        }
        const match = owners.find((o) => namesMatch(o.name, insiderName));
        if (match?.title) return match.title;
      }
      return null;
    } catch {
      return null;
    }
  };
}
