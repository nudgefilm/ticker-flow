import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const USER_AGENT = "TickerFlow support@tickerflow.net";
const EFTS_URL = "https://efts.sec.gov/LATEST/search-index";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json";

// SEC company_tickers_exchange.json → [cik, ticker, name, exchange]
type SecRow = [number, string, string, string];

interface EFTSHit {
  _id: string; // accession number: "0001045810-24-000001"
  _source: {
    entity_name: string;
    file_date: string;
    form_type: string;
    display_names?: string[];
  };
}

interface CikEntry {
  ticker: string;
  name: string;
  exchange: string;
}

/** display_names[0] = "NVIDIA CORP (0001045810) (Filer)" → "0001045810" */
function extractPaddedCik(displayNames: string[] | undefined): string | null {
  if (!displayNames?.length) return null;
  const match = displayNames[0].match(/\((\d{7,10})\)/);
  return match ? match[1].padStart(10, "0") : null;
}

/** "0001045810-24-000001" → https://www.sec.gov/Archives/edgar/data/1045810/000104581024000001/... */
function buildFilingUrl(paddedCik: string, accessionId: string): string {
  const cik = parseInt(paddedCik, 10).toString();
  const accNoDashes = accessionId.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${accessionId}-index.htm`;
}

function getEventType(formType: string): string | null {
  if (formType === "4") return "insider_trade";
  // 8-K의 세부 분류(ceo_change, ma, buyback, guidance)는
  // 별도 summary_kr 생성 단계에서 Claude가 분류
  return null;
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const today = new Date().toISOString().slice(0, 10);
  const date = req.nextUrl.searchParams.get("date") ?? today;

  try {
    // 1. SEC CIK → ticker 매핑 (1시간 캐시)
    const secRes = await fetch(SEC_TICKERS_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!secRes.ok) throw new Error(`SEC tickers: HTTP ${secRes.status}`);
    const secData: { data: SecRow[] } = await secRes.json();

    const cikMap = new Map<string, CikEntry>();
    // company_tickers_exchange.json field order: [cik_str, name, ticker, exchange]
    for (const [cik, name, ticker, exchange] of secData.data) {
      cikMap.set(String(cik).padStart(10, "0"), { ticker, name, exchange });
    }

    // 2. EDGAR EFTS에서 당일 공시 수집
    const eftsUrl = new URL(EFTS_URL);
    // q="" (empty string) → EFTS returns HTTP 500. Quoted empty string tells
    // Elasticsearch to match all documents without a text filter.
    eftsUrl.searchParams.set("q", '""');
    eftsUrl.searchParams.set("dateRange", "custom");
    eftsUrl.searchParams.set("startdt", date);
    eftsUrl.searchParams.set("enddt", date);
    eftsUrl.searchParams.set("forms", "8-K,10-K,10-Q,4,S-1,DEF14A");

    const eftsRes = await fetch(eftsUrl.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!eftsRes.ok) throw new Error(`EFTS: HTTP ${eftsRes.status}`);
    const eftsData = await eftsRes.json();
    const hits: EFTSHit[] = eftsData?.hits?.hits ?? [];

    const adminClient = createAdminClient();

    // 3. DB에 있는 티커 목록 (FK 검증용)
    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    let skipped = 0;
    let firstError: string | undefined;

    for (const hit of hits) {
      const { _id: accessionId, _source: src } = hit;

      const paddedCik = extractPaddedCik(src.display_names);
      if (!paddedCik) { skipped++; continue; }

      const info = cikMap.get(paddedCik);
      if (!info) { skipped++; continue; }

      // 신규 티커는 tickers 테이블에 자동 upsert (에러 시 해당 공시 스킵)
      if (!tickerSet.has(info.ticker)) {
        const { error: tickerErr } = await adminClient
          .from("tickers")
          .upsert(
            { ticker: info.ticker, name_en: info.name, exchange: info.exchange },
            { onConflict: "ticker" }
          );
        if (tickerErr) {
          firstError ??= `ticker upsert: ${tickerErr.message}`;
          console.error("[collect/filings] ticker upsert:", tickerErr.message);
          skipped++;
          continue;
        }
        tickerSet.add(info.ticker);
      }

      const { error } = await adminClient.from("filings").upsert(
        {
          ticker: info.ticker,
          form_type: src.form_type,
          filed_at: `${src.file_date}T00:00:00Z`,
          title: `${src.entity_name} — ${src.form_type}`,
          url: buildFilingUrl(paddedCik, accessionId),
          event_type: getEventType(src.form_type),
        },
        { onConflict: "url", ignoreDuplicates: true }
      );

      if (error) {
        firstError ??= `filing upsert: ${error.message}`;
        console.error("[collect/filings] upsert:", error.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      date,
      total: hits.length,
      inserted,
      skipped,
      ...(firstError && { firstError }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/filings]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
