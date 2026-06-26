export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";

// 대형 기관투자자 CIK 목록 (EDGAR 기준)
const INSTITUTIONS = [
  { name: "Berkshire Hathaway",        cik: "0001067983" },
  { name: "Appaloosa Management",       cik: "0001045810" },
  { name: "Baupost Group",             cik: "0001061219" },
  { name: "Tiger Global Management",   cik: "0001429738" },
  { name: "Bill & Melinda Gates Foundation", cik: "0001166559" },
] as const;

// ── EDGAR 유틸 ─────────────────────────────────────────────────────────────────

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

// 기간 문자열 → 분기 레이블 ("2023-12-31" → "2023Q4")
function toQuarter(reportDate: string): string {
  const d = new Date(reportDate + "T00:00:00Z");
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}Q${q}`;
}

// XML 단순 파싱 (네임스페이스 허용)
function xmlTag(block: string, tag: string): string {
  const m = new RegExp(`<(?:[\\w:]*:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w:]*:)?${tag}>`, "i").exec(block);
  return m?.[1]?.trim() ?? "";
}

interface HoldingRaw {
  name: string;   // nameOfIssuer
  shares: number; // sshPrnamt
  value: number;  // value × 1000 (in dollars)
}

// 13F infotable XML → 보유 종목 배열
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

// 회사명 정규화 (tickers.name_en 매칭용)
function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(inc\.?|corp\.?|co\.?|ltd\.?|llc|plc|class [a-z]|com|the)\b/g, "")
    .replace(/[.,\-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── 기관 1개 수집 ──────────────────────────────────────────────────────────────

async function collectForInstitution(
  inst: { name: string; cik: string },
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ upserted: number; skipped: number }> {
  const paddedCik = inst.cik.padStart(10, "0");

  // 1) 제출 내역 조회
  const subRes = await fetch(
    `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
    { headers: { "User-Agent": "TickerFlow contact@tickerflow.net" } }
  );
  if (!subRes.ok) return { upserted: 0, skipped: 1 };

  const sub: EdgarSubmissions = await subRes.json();
  const recent = sub.filings?.recent;
  if (!recent) return { upserted: 0, skipped: 1 };

  // 2) 최신 13F-HR 찾기
  const idx = recent.form.findIndex((f) => f === "13F-HR");
  if (idx === -1) return { upserted: 0, skipped: 0 };

  const accessionRaw  = recent.accessionNumber[idx];          // "XXXXXXXXXX-YY-ZZZZZZ"
  const filedAt       = recent.filingDate[idx];               // "YYYY-MM-DD"
  const reportDate    = recent.reportDate[idx];               // "YYYY-MM-DD"
  const quarter       = toQuarter(reportDate);
  const accession     = accessionRaw.replace(/-/g, "");       // without dashes
  const cleanCik      = inst.cik.replace(/^0+/, "");

  // 3) 파일 인덱스 조회
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accession}/${accessionRaw}-index.json`;
  const idxRes = await fetch(indexUrl, { headers: { "User-Agent": "TickerFlow contact@tickerflow.net" } });
  if (!idxRes.ok) return { upserted: 0, skipped: 1 };

  const idxData = await idxRes.json();
  const items: { name: string; type: string }[] = idxData?.directory?.item ?? [];

  // infotable 파일 탐색 (xml 우선)
  const infoFile = items.find(
    (i) =>
      i.name.toLowerCase().includes("infotable") ||
      (i.name.endsWith(".xml") && i.type?.includes("xml"))
  );
  if (!infoFile) return { upserted: 0, skipped: 1 };

  // 4) infotable XML 다운로드
  const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accession}/${infoFile.name}`;
  const xmlRes = await fetch(xmlUrl, { headers: { "User-Agent": "TickerFlow contact@tickerflow.net" } });
  if (!xmlRes.ok) return { upserted: 0, skipped: 1 };

  const xml = await xmlRes.text();
  const holdings = parseInfoTable(xml);
  if (holdings.length === 0) return { upserted: 0, skipped: 1 };

  // 5) tickers 테이블에서 이름 매핑 (in-memory)
  const { data: tickerRows } = await adminClient
    .from("tickers")
    .select("ticker, name_en")
    .not("name_en", "is", null)
    .limit(10000);

  const nameToTicker = new Map<string, string>();
  for (const t of tickerRows ?? []) {
    if (!t.name_en) continue;
    const norm = normalizeName(t.name_en);
    nameToTicker.set(norm, t.ticker);
    const firstWord = norm.split(" ")[0];
    if (firstWord.length >= 3) nameToTicker.set(firstWord, t.ticker);
  }

  function findTicker(rawName: string): string | null {
    const norm = normalizeName(rawName);
    if (nameToTicker.has(norm)) return nameToTicker.get(norm)!;
    const firstWord = norm.split(" ")[0];
    if (firstWord.length >= 4 && nameToTicker.has(firstWord)) return nameToTicker.get(firstWord)!;
    return null;
  }

  // 6) upsert
  let upserted = 0;
  let skipped = 0;
  const filedAtTs = filedAt ? `${filedAt}T00:00:00Z` : null;

  for (const h of holdings) {
    const ticker = findTicker(h.name);
    if (!ticker) { skipped++; continue; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .from("institutional_holdings")
      .upsert(
        {
          ticker,
          institution_name: inst.name,
          shares: h.shares,
          value: h.value,
          quarter,
          filed_at: filedAtTs,
        },
        { onConflict: "ticker,institution_name,quarter" }
      );

    if (error && error.code !== "23505") {
      console.error(`[collect/13f] ${inst.name} ${ticker}:`, error.message);
      skipped++;
    } else {
      upserted++;
    }
  }

  return { upserted, skipped };
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────

export async function run13fCollect(
  institutionParam?: string | null
): Promise<CollectResult> {
  const adminClient = createAdminClient();

  const targets = institutionParam
    ? INSTITUTIONS.filter((i) => i.name.toLowerCase().includes(institutionParam.toLowerCase()))
    : [...INSTITUTIONS];

  let totalUpserted = 0;
  let totalSkipped = 0;
  const detail: Record<string, { upserted: number; skipped: number }> = {};

  for (const inst of targets) {
    const res = await collectForInstitution(inst, adminClient);
    detail[inst.name] = res;
    totalUpserted += res.upserted;
    totalSkipped  += res.skipped;

    if (targets.length > 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { ok: true, institutions: targets.length, upserted: totalUpserted, skipped: totalSkipped, detail };
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;
  const institutionParam = req.nextUrl.searchParams.get("institution");
  const result = await run13fCollect(institutionParam);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
