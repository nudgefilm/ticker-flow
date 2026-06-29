/**
 * scripts/seed-13f.ts
 * SEC EDGAR에서 대형 기관 Top 20의 13F-HR 공시를 파싱해
 * institutional_holdings 테이블에 저장하는 로컬 실행 스크립트.
 *
 * 실행:
 *   npx tsx scripts/seed-13f.ts
 *
 * CIK 조회: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F-HR&dateb=&owner=include&count=40&search_text=
 * CIK 오류 시 위 주소에서 기관명 검색 후 수정.
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── .env.local 수동 파싱 ───────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local 파일을 찾을 수 없습니다.");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    const value = raw.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) as any;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// SEC EDGAR 이용약관 준수: User-Agent에 연락처 포함 필수
const EDGAR_HEADERS = {
  "User-Agent": "TickerFlow contact@tickerflow.net",
  "Accept-Encoding": "gzip, deflate",
};

// ── 수집 대상 기관 Top 20 ─────────────────────────────────────────────────
// CIK 오류 시: https://www.sec.gov/cgi-bin/browse-edgar 에서 기관명 검색 후 수정
const INSTITUTIONS: ReadonlyArray<{ name: string; cik: string }> = [
  { name: "Berkshire Hathaway",              cik: "0001067983" },
  { name: "Appaloosa Management",            cik: "0001045810" },
  { name: "Baupost Group",                   cik: "0001061219" },
  { name: "Tiger Global Management",         cik: "0001429738" },
  { name: "Bill & Melinda Gates Foundation", cik: "0001166559" },
  { name: "Bridgewater Associates",          cik: "0001569703" },
  { name: "Renaissance Technologies",        cik: "0001037389" },
  { name: "Two Sigma Investments",           cik: "0001446925" },
  { name: "Citadel",                         cik: "0001423298" },
  { name: "D.E. Shaw",                       cik: "0001009672" },
  { name: "Greenlight Capital",              cik: "0001079114" },
  { name: "Pershing Square",                 cik: "0001336528" },
  { name: "Third Point",                     cik: "0001040273" },
  { name: "Elliott Management",              cik: "0000814375" },
  { name: "Coatue Management",               cik: "0001513414" },
  { name: "Viking Global",                   cik: "0001137411" },
  { name: "Lone Pine Capital",               cik: "0001061165" },
  { name: "Maverick Capital",                cik: "0001055726" },
  { name: "Druckenmiller (Duquesne)",        cik: "0001449862" },
  { name: "Soros Fund Management",           cik: "0001029160" },
];

// ── EDGAR 제출 내역 응답 타입 ─────────────────────────────────────────────
interface EdgarSubmissions {
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
    };
  };
}

// ── reportDate("2024-12-31") → 분기("2024Q4") ─────────────────────────────
function toQuarter(reportDate: string): string {
  const d = new Date(reportDate + "T00:00:00Z");
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}Q${q}`;
}

// ── XML 태그 값 추출 (네임스페이스 프리픽스 허용) ─────────────────────────
function xmlTag(block: string, tag: string): string {
  const re = new RegExp(
    `<(?:[\\w:]*:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w:]*:)?${tag}>`,
    "i"
  );
  return re.exec(block)?.[1]?.trim() ?? "";
}

// ── infotable XML 전체 파싱 ───────────────────────────────────────────────
interface HoldingRaw {
  name: string;
  shares: number;
  value: number;
}

function parseInfoTable(xml: string): HoldingRaw[] {
  const holdings: HoldingRaw[] = [];
  const re = /<(?:[^:>]*:)?infoTable>([\s\S]*?)<\/(?:[^:>]*:)?infoTable>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const name   = xmlTag(block, "nameOfIssuer");
    const valStr = xmlTag(block, "value").replace(/,/g, "");
    const shrStr = xmlTag(block, "sshPrnamt").replace(/,/g, "");
    if (!name) continue;
    holdings.push({
      name,
      value:  (parseInt(valStr, 10) || 0) * 1000, // 단위: 천 달러 → 달러
      shares: parseInt(shrStr, 10) || 0,
    });
  }

  return holdings;
}

// ── 회사명 정규화 (ticker 매핑 전처리) ────────────────────────────────────
function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(inc\.?|corp\.?|co\.?|ltd\.?|llc|plc|class [a-z]|com|the)\b/g, "")
    .replace(/[.,\-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── tickers 테이블 전체 로드 (1000행 제한 우회) ───────────────────────────
async function loadTickerMap(): Promise<Map<string, string>> {
  const PAGE = 1000;
  const allRows: { ticker: string; name_en: string | null }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("tickers")
      .select("ticker, name_en")
      .not("name_en", "is", null)
      .order("ticker")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`tickers 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;
    allRows.push(...(data as { ticker: string; name_en: string | null }[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const map = new Map<string, string>();
  for (const t of allRows) {
    if (!t.name_en) continue;
    const norm = normalizeName(t.name_en);
    map.set(norm, t.ticker);
    const firstWord = norm.split(" ")[0];
    if (firstWord.length >= 3) map.set(firstWord, t.ticker);
  }

  return map;
}

// ── 정규화 이름으로 ticker 검색 ───────────────────────────────────────────
function findTicker(rawName: string, map: Map<string, string>): string | null {
  const norm = normalizeName(rawName);
  if (map.has(norm)) return map.get(norm)!;
  const firstWord = norm.split(" ")[0];
  if (firstWord.length >= 4 && map.has(firstWord)) return map.get(firstWord)!;
  return null;
}

// ── 기관별 13F-HR 수집 및 upsert ─────────────────────────────────────────
interface CollectResult {
  upserted: number;
  skipped: number;
  error?: string;
}

async function collectForInstitution(
  inst: { name: string; cik: string },
  tickerMap: Map<string, string>,
  instIdx: number,
  total: number
): Promise<CollectResult> {
  const label = String(instIdx + 1).padStart(2, " ");
  const prefix = `[${label}/${total}] ${inst.name}`;

  // CIK 정규화
  // - cikNum  : 선행 0 제거 (Archives 경로에 사용)  예: "1067983"
  // - cikPad  : 10자리 제로 패딩 (submissions API에 사용) 예: "0001067983"
  const cikNum = inst.cik.replace(/^0+/, "");
  const cikPad = cikNum.padStart(10, "0");

  // ① EDGAR 제출 내역 조회
  // URL: https://data.sec.gov/submissions/CIK{10자리}.json
  const subUrl = `https://data.sec.gov/submissions/CIK${cikPad}.json`;
  console.log(`${prefix} — 제출 내역: ${subUrl}`);
  const subRes = await fetch(subUrl, { headers: EDGAR_HEADERS });
  if (!subRes.ok) {
    const msg = `EDGAR 조회 실패 (HTTP ${subRes.status}) — CIK ${inst.cik}`;
    console.error(`${prefix} — ${msg}`);
    return { upserted: 0, skipped: 0, error: msg };
  }

  const sub: EdgarSubmissions = await subRes.json();
  const recent = sub.filings?.recent;
  if (!recent) {
    console.log(`${prefix} — 제출 내역 없음, 스킵`);
    return { upserted: 0, skipped: 1 };
  }

  // ② 최신 13F-HR 색인
  const idx = recent.form.findIndex((f) => f === "13F-HR");
  if (idx === -1) {
    console.log(`${prefix} — 13F-HR 없음, 스킵`);
    return { upserted: 0, skipped: 1 };
  }

  const accessionRaw = recent.accessionNumber[idx]; // "0001067983-24-000019" (dashes 포함)
  const filedAt      = recent.filingDate[idx];
  const reportDate   = recent.reportDate[idx];
  const quarter      = toQuarter(reportDate);

  // accNoDash: dashes 제거 → 디렉터리명에 사용  예: "000106798324000019"
  const accNoDash = accessionRaw.replace(/-/g, "");

  console.log(`${prefix} — 분기: ${quarter}  filed: ${filedAt}`);

  // ③ 디렉터리 목록 HTML에서 infotable XML 파일명 추출
  // URL: https://www.sec.gov/Archives/edgar/data/{cik}/{accNoDash}/
  await delay(300);
  const baseDir = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}`;
  const dirUrl  = `${baseDir}/`;
  console.log(`${prefix} — 디렉터리: ${dirUrl}`);
  const dirRes = await fetch(dirUrl, { headers: EDGAR_HEADERS });
  if (!dirRes.ok) {
    const msg = `디렉터리 조회 실패 (HTTP ${dirRes.status})`;
    console.error(`${prefix} — ${msg}`);
    return { upserted: 0, skipped: 0, error: msg };
  }

  const dirHtml = await dirRes.text();

  // href 속성에서 .xml 파일명 추출
  // 1순위: "infotable" 이름 포함
  // 2순위: primary·xsl·index 제외한 첫 번째 .xml
  let xmlFileName: string | null = null;
  const infotableMatch = dirHtml.match(/href="([^"]*infotable[^"]*\.xml)"/i);
  if (infotableMatch?.[1]) {
    xmlFileName = infotableMatch[1];
  } else {
    const allXml = [...dirHtml.matchAll(/href="([^"]+\.xml)"/gi)];
    for (const m of allXml) {
      const name = m[1];
      if (
        !name.toLowerCase().includes("primary") &&
        !name.toLowerCase().includes("xsl") &&
        !name.includes("-index")
      ) {
        xmlFileName = name;
        break;
      }
    }
  }

  if (!xmlFileName) {
    console.log(`${prefix} — infotable XML 없음, 스킵`);
    return { upserted: 0, skipped: 1 };
  }

  // ④ infotable XML 다운로드 및 파싱
  // href가 절대경로(/Archives/...)면 origin만 앞에 붙이고, 상대경로면 baseDir과 합친다
  await delay(300);
  const xmlUrl = xmlFileName.startsWith("/")
    ? `https://www.sec.gov${xmlFileName}`
    : `${baseDir}/${xmlFileName}`;
  console.log(`${prefix} — XML: ${xmlUrl}`);
  const xmlRes = await fetch(xmlUrl, { headers: EDGAR_HEADERS });
  if (!xmlRes.ok) {
    const msg = `XML 다운로드 실패 (HTTP ${xmlRes.status})`;
    console.error(`${prefix} — ${msg}`);
    return { upserted: 0, skipped: 0, error: msg };
  }

  const xml = await xmlRes.text();
  const holdings = parseInfoTable(xml);

  if (holdings.length === 0) {
    console.log(`${prefix} — 파싱 결과 0건, 스킵`);
    return { upserted: 0, skipped: 1 };
  }

  console.log(`${prefix} — ${holdings.length}개 보유 항목 파싱 완료, ticker 매핑 중...`);

  // ⑤ ticker 매핑
  const filedAtTs = filedAt ? `${filedAt}T00:00:00Z` : null;
  const rows: {
    ticker: string;
    institution_name: string;
    shares: number | null;
    value: number | null;
    quarter: string;
    filed_at: string | null;
  }[] = [];
  let unmapped = 0;

  for (const h of holdings) {
    const ticker = findTicker(h.name, tickerMap);
    if (!ticker) {
      unmapped++;
      continue;
    }
    rows.push({
      ticker,
      institution_name: inst.name,
      shares:   h.shares || null,
      value:    h.value  || null,
      quarter,
      filed_at: filedAtTs,
    });
  }

  // ticker + institution_name + quarter 기준 중복 제거 (같은 키가 여러 번 나오면 마지막 값 유지)
  const deduped = [
    ...new Map(
      rows.map((r) => [`${r.ticker}|${r.institution_name}|${r.quarter}`, r])
    ).values(),
  ];

  console.log(
    `${prefix} — 매핑 성공: ${rows.length}개 / 중복 제거 후: ${deduped.length}개 / 미매핑: ${unmapped}개`
  );

  if (deduped.length === 0) {
    return { upserted: 0, skipped: unmapped };
  }

  // ⑥ 배치 upsert (100행씩)
  const BATCH = 100;
  let upserted = 0;
  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH);
    const { error: upsertErr } = await supabase
      .from("institutional_holdings")
      .upsert(batch, { onConflict: "ticker,institution_name,quarter" });

    if (upsertErr) {
      console.error(`${prefix} — upsert 오류: ${upsertErr.message}`);
    } else {
      upserted += batch.length;
    }
  }

  console.log(`${prefix} — 저장 완료: ${upserted}행`);
  return { upserted, skipped: unmapped };
}

// ── 메인 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow seed-13f ===");
  console.log("SEC EDGAR 13F-HR 수집 시작\n");

  // tickers 매핑 테이블 선 로드
  console.log("tickers 테이블 로드 중...");
  let tickerMap: Map<string, string>;
  try {
    tickerMap = await loadTickerMap();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
  console.log(`ticker 매핑: ${tickerMap.size}개 항목 로드 완료\n`);

  const total = INSTITUTIONS.length;
  let totalUpserted = 0;
  let totalSkipped  = 0;
  let totalErrors   = 0;

  for (let i = 0; i < total; i++) {
    const inst = INSTITUTIONS[i];

    try {
      const result = await collectForInstitution(inst, tickerMap, i, total);
      totalUpserted += result.upserted;
      totalSkipped  += result.skipped;
      if (result.error) totalErrors++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${i + 1}/${total}] ${inst.name} — 예외: ${msg}`);
      totalErrors++;
    }

    // SEC EDGAR rate limit 준수: 기관 간 1초 대기
    if (i < total - 1) {
      console.log("");
      await delay(1000);
    }
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`대상 기관  : ${total}개`);
  console.log(`저장 행수  : ${totalUpserted}`);
  console.log(`미매핑 항목: ${totalSkipped}  (tickers 테이블에 없는 종목)`);
  console.log(`오류 기관  : ${totalErrors}`);

  if (totalErrors > 0) {
    console.log(
      "\n오류 기관의 CIK 확인: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F-HR"
    );
  }
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
