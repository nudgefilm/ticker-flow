import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const INSTITUTIONS = [
  { name: "Berkshire Hathaway",              cik: "0001067983" },
  { name: "Appaloosa Management",             cik: "0001045810" },
  { name: "Baupost Group",                   cik: "0001061219" },
  { name: "Tiger Global Management",         cik: "0001429738" },
  { name: "Bill & Melinda Gates Foundation", cik: "0001166559" },
] as const;

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

function toQuarter(reportDate: string): string {
  const d = new Date(reportDate + "T00:00:00Z");
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}Q${q}`;
}

function xmlTag(block: string, tag: string): string {
  const m = new RegExp(`<(?:[\\w:]*:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:[\\w:]*:)?${tag}>`, "i").exec(block);
  return m?.[1]?.trim() ?? "";
}

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
      value:  (parseInt(valStr, 10) || 0) * 1000,
      shares: parseInt(shrStr, 10) || 0,
    });
  }

  return holdings;
}

function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(inc\.?|corp\.?|co\.?|ltd\.?|llc|plc|class [a-z]|com|the)\b/g, "")
    .replace(/[.,\-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function collectForInstitution(
  inst: { name: string; cik: string },
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ upserted: number; skipped: number }> {
  const headers = { "User-Agent": "TickerFlow contact@tickerflow.net" };
  const paddedCik = inst.cik.padStart(10, "0");

  const subRes = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, { headers });
  if (!subRes.ok) return { upserted: 0, skipped: 1 };

  const sub: EdgarSubmissions = await subRes.json();
  const recent = sub.filings?.recent;
  if (!recent) return { upserted: 0, skipped: 1 };

  const idx = recent.form.findIndex((f) => f === "13F-HR");
  if (idx === -1) return { upserted: 0, skipped: 0 };

  const accessionRaw  = recent.accessionNumber[idx];
  const filedAt       = recent.filingDate[idx];
  const reportDate    = recent.reportDate[idx];
  const quarter       = toQuarter(reportDate);
  const accession     = accessionRaw.replace(/-/g, "");
  const cleanCik      = inst.cik.replace(/^0+/, "");

  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accession}/${accessionRaw}-index.json`;
  const idxRes = await fetch(indexUrl, { headers });
  if (!idxRes.ok) return { upserted: 0, skipped: 1 };

  const idxData = await idxRes.json();
  const items: { name: string; type: string }[] = idxData?.directory?.item ?? [];

  const infoFile = items.find(
    (i) =>
      i.name.toLowerCase().includes("infotable") ||
      (i.name.endsWith(".xml") && i.type?.includes("xml"))
  );
  if (!infoFile) return { upserted: 0, skipped: 1 };

  const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${accession}/${infoFile.name}`;
  const xmlRes = await fetch(xmlUrl, { headers });
  if (!xmlRes.ok) return { upserted: 0, skipped: 1 };

  const xml = await xmlRes.text();
  const holdings = parseInfoTable(xml);
  if (holdings.length === 0) return { upserted: 0, skipped: 1 };

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

  let upserted = 0;
  let skipped = 0;
  const filedAtTs = filedAt ? `${filedAt}T00:00:00Z` : null;

  for (const h of holdings) {
    const ticker = findTicker(h.name);
    if (!ticker) { skipped++; continue; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any).from("institutional_holdings").upsert(
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

export async function run13fCollect(institutionParam?: string | null): Promise<CollectResult> {
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
    if (targets.length > 1) await new Promise((r) => setTimeout(r, 500));
  }

  return { ok: true, institutions: targets.length, upserted: totalUpserted, skipped: totalSkipped, detail };
}
