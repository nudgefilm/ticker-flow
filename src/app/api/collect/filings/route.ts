import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const USER_AGENT = "TickerFlow support@tickerflow.net";
const EFTS_URL = "https://efts.sec.gov/LATEST/search-index";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json";

// company_tickers_exchange.json field order: [cik_str, name, ticker, exchange]
type SecRow = [number, string, string, string];

interface EFTSHit {
  _id: string; // accession number: "0001045810-24-000001"
  _source: Record<string, unknown>;
}

interface ParsedFiler {
  ticker: string | null;
  paddedCik: string | null;
}

/**
 * EDGAR display_names 형식: "EagleRock Land, LLC  (EROK)  (CIK 0002104882)"
 *   - ticker: 괄호 안 1-6자 대문자 (BRK.A 등 점 허용)
 *   - CIK:    "(CIK 숫자)" 패턴
 */
function parseFiler(displayNames: unknown): ParsedFiler {
  if (!Array.isArray(displayNames) || displayNames.length === 0) {
    return { ticker: null, paddedCik: null };
  }

  const s = String(displayNames[0]);

  // "(EROK)", "(NVDA)", "(BRK.A)" 등 — "CIK" 문자열이 아닌 첫 번째 대문자 심볼
  const tickerMatch = s.match(/\(([A-Z][A-Z.]{0,5})\)/);
  const ticker = tickerMatch ? tickerMatch[1] : null;

  // "(CIK 0002104882)" 또는 "(CIK 123456789)"
  const cikMatch = s.match(/\(CIK\s+(\d+)\)/i);
  const paddedCik = cikMatch ? cikMatch[1].padStart(10, "0") : null;

  return { ticker, paddedCik };
}

/** "0002104882-24-000001" → https://www.sec.gov/Archives/edgar/data/2104882/... */
function buildFilingUrl(paddedCik: string, accessionId: string): string {
  const cik = parseInt(paddedCik, 10).toString();
  const accNoDashes = accessionId.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${accessionId}-index.htm`;
}

function getEventType(formType: string): string | null {
  if (formType === "4") return "insider_trade";
  return null;
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const today = new Date().toISOString().slice(0, 10);
  const date = req.nextUrl.searchParams.get("date") ?? today;

  try {
    // 1. SEC CIK → exchange 매핑 (exchange 보강용, 없어도 수집 진행)
    const secRes = await fetch(SEC_TICKERS_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });
    const cikToExchange = new Map<string, string>();
    if (secRes.ok) {
      const secData: { data: SecRow[] } = await secRes.json();
      for (const [cik, , , exchange] of secData.data) {
        cikToExchange.set(String(cik).padStart(10, "0"), exchange);
      }
    }

    // 2. EDGAR EFTS에서 당일 공시 수집
    const eftsUrl = new URL(EFTS_URL);
    eftsUrl.searchParams.set("q", '""');
    eftsUrl.searchParams.set("dateRange", "custom");
    eftsUrl.searchParams.set("startdt", date);
    eftsUrl.searchParams.set("enddt", date);
    eftsUrl.searchParams.set("forms", "8-K,10-K,10-Q,4,S-1,DEF14A");
    eftsUrl.searchParams.set(
      "_source",
      "entity_name,file_date,form_type,display_names"
    );

    const eftsRes = await fetch(eftsUrl.toString(), {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!eftsRes.ok) throw new Error(`EFTS: HTTP ${eftsRes.status}`);
    const eftsData = await eftsRes.json();
    const hits: EFTSHit[] = eftsData?.hits?.hits ?? [];

    const adminClient = createAdminClient();

    // 3. DB에 있는 티커 목록 (FK 검증 + 중복 upsert 방지)
    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    let skipNoTicker = 0;   // display_names에서 ticker 파싱 실패
    let skipTickerErr = 0;  // tickers upsert 실패
    let skipFilingErr = 0;  // filings upsert 실패
    let firstError: string | undefined;

    for (const hit of hits) {
      const { _id: accessionId, _source: src } = hit;

      const { ticker, paddedCik } = parseFiler(src.display_names);
      if (!ticker) { skipNoTicker++; continue; }

      const entityName = String(src.entity_name ?? ticker);
      // exchange는 SEC 매핑에서 보강, 없으면 null (nullable)
      const exchange = paddedCik ? (cikToExchange.get(paddedCik) ?? null) : null;

      // 신규 티커는 tickers 테이블에 자동 upsert
      // ignoreDuplicates: true → 시드된 name_en은 덮어쓰지 않음
      if (!tickerSet.has(ticker)) {
        const { error: tickerErr } = await adminClient
          .from("tickers")
          .upsert(
            { ticker, name_en: entityName, ...(exchange ? { exchange } : {}) },
            { onConflict: "ticker", ignoreDuplicates: true }
          );
        if (tickerErr) {
          firstError ??= `ticker upsert: ${tickerErr.message}`;
          console.error("[collect/filings] ticker upsert:", tickerErr.message);
          skipTickerErr++;
          continue;
        }
        tickerSet.add(ticker);
      }

      const filingUrl = paddedCik
        ? buildFilingUrl(paddedCik, accessionId)
        : `https://www.sec.gov/Archives/edgar/data/${accessionId}`;

      const { error } = await adminClient.from("filings").upsert(
        {
          ticker,
          form_type: String(src.form_type ?? ""),
          filed_at: `${src.file_date}T00:00:00Z`,
          title: `${entityName} — ${src.form_type}`,
          url: filingUrl,
          event_type: getEventType(String(src.form_type ?? "")),
        },
        { onConflict: "url", ignoreDuplicates: true }
      );

      if (error) {
        firstError ??= `filing upsert: ${error.message}`;
        console.error("[collect/filings] upsert:", error.message);
        skipFilingErr++;
      } else {
        inserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      date,
      total: hits.length,
      inserted,
      skipped: skipNoTicker + skipTickerErr + skipFilingErr,
      debug: {
        skipNoTicker,
        skipTickerErr,
        skipFilingErr,
        firstError: firstError ?? null,
        sampleSource: hits[0]?._source ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/filings]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
