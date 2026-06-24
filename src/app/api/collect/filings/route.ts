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

interface CikEntry {
  ticker: string;
  name: string;
  exchange: string;
}

/** display_names[0] = "NVIDIA CORP (0001045810) (Filer)" → "0001045810" */
function extractPaddedCik(displayNames: unknown): string | null {
  if (!Array.isArray(displayNames) || displayNames.length === 0) return null;
  const match = String(displayNames[0]).match(/\((\d{7,10})\)/);
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
  return null;
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const today = new Date().toISOString().slice(0, 10);
  const date = req.nextUrl.searchParams.get("date") ?? today;

  try {
    // 1. SEC CIK → ticker 매핑
    const secRes = await fetch(SEC_TICKERS_URL, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!secRes.ok) throw new Error(`SEC tickers: HTTP ${secRes.status}`);
    const secData: { data: SecRow[] } = await secRes.json();

    const cikMap = new Map<string, CikEntry>();
    for (const [cik, name, ticker, exchange] of secData.data) {
      cikMap.set(String(cik).padStart(10, "0"), { ticker, name, exchange });
    }

    // 2. EDGAR EFTS에서 당일 공시 수집
    // _source를 명시해 display_names가 반드시 포함되도록 요청
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

    // 3. DB에 있는 티커 목록
    const { data: knownRows } = await adminClient
      .from("tickers")
      .select("ticker");
    const tickerSet = new Set<string>(knownRows?.map((r) => r.ticker) ?? []);

    let inserted = 0;
    // 스킵 사유별 카운터
    let skipNoDisplayNames = 0; // display_names 없거나 CIK 파싱 실패
    let skipNoCikMatch = 0;     // SEC 매핑에 CIK 없음 (OTC·외국 기업 등)
    let skipTickerErr = 0;      // tickers upsert 실패
    let skipFilingErr = 0;      // filings upsert 실패
    let firstError: string | undefined;

    for (const hit of hits) {
      const { _id: accessionId, _source: src } = hit;

      const paddedCik = extractPaddedCik(src.display_names);
      if (!paddedCik) { skipNoDisplayNames++; continue; }

      const info = cikMap.get(paddedCik);
      if (!info) { skipNoCikMatch++; continue; }

      // 신규 티커 자동 upsert
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
          skipTickerErr++;
          continue;
        }
        tickerSet.add(info.ticker);
      }

      const { error } = await adminClient.from("filings").upsert(
        {
          ticker: info.ticker,
          form_type: String(src.form_type ?? ""),
          filed_at: `${src.file_date}T00:00:00Z`,
          title: `${src.entity_name} — ${src.form_type}`,
          url: buildFilingUrl(paddedCik, accessionId),
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
      skipped: skipNoDisplayNames + skipNoCikMatch + skipTickerErr + skipFilingErr,
      // 스킵 사유 분석 — 어디서 막히는지 파악용
      debug: {
        cikMapSize: cikMap.size,
        tickerDbCount: tickerSet.size,
        skipNoDisplayNames,
        skipNoCikMatch,
        skipTickerErr,
        skipFilingErr,
        firstError: firstError ?? null,
        // EDGAR 응답 첫 번째 hit의 _source 원본 — 필드 구조 확인용
        sampleSource: hits[0]?._source ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/filings]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
