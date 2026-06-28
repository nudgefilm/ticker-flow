import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeFilings } from "./summarize";
import type { CollectResult } from "./types";

const USER_AGENT = "TickerFlow support@tickerflow.net";
const EFTS_URL = "https://efts.sec.gov/LATEST/search-index";
const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json";

const PAGE_SIZE = 200;
const MAX_HITS = 2000;

type SecRow = [number, string, string, string];

interface EFTSHit {
  _id: string;
  _source: Record<string, unknown>;
}

interface ParsedFiler {
  ticker: string | null;
  paddedCik: string | null;
}

function parseFiler(displayNames: unknown): ParsedFiler {
  if (!Array.isArray(displayNames) || displayNames.length === 0) {
    return { ticker: null, paddedCik: null };
  }
  const s = String(displayNames[0]);
  const tickerMatch = s.match(/\(([A-Z][A-Z.]{0,5})\)/);
  const ticker = tickerMatch ? tickerMatch[1] : null;
  const cikMatch = s.match(/\(CIK\s+(\d+)\)/i);
  const paddedCik = cikMatch ? cikMatch[1].padStart(10, "0") : null;
  return { ticker, paddedCik };
}

function buildFilingUrl(paddedCik: string, accessionId: string): string {
  const cik = parseInt(paddedCik, 10).toString();
  const accNoDashes = accessionId.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${accessionId}-index.htm`;
}

function getEventType(formType: string): string | null {
  if (formType === "4") return "insider_trade";
  return null;
}

async function fetchAllHits(startdt: string, enddt: string): Promise<EFTSHit[]> {
  const allHits: EFTSHit[] = [];
  let from = 0;

  while (allHits.length < MAX_HITS) {
    const url = new URL(EFTS_URL);
    url.searchParams.set("q", '""');
    url.searchParams.set("dateRange", "custom");
    url.searchParams.set("startdt", startdt);
    url.searchParams.set("enddt", enddt);
    url.searchParams.set("forms", "8-K,10-K,10-Q,4,S-1,DEF14A");
    url.searchParams.set("_source", "entity_name,file_date,root_forms,display_names");
    url.searchParams.set("hits.hits", String(PAGE_SIZE));
    if (from > 0) url.searchParams.set("from", String(from));

    const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`EFTS: HTTP ${res.status}`);

    const data = await res.json();
    const pageHits: EFTSHit[] = data?.hits?.hits ?? [];
    const totalValue: number = data?.hits?.total?.value ?? 0;

    allHits.push(...pageHits);
    if (pageHits.length < PAGE_SIZE || allHits.length >= totalValue) break;
    from += pageHits.length;
  }

  return allHits;
}

export async function runFilingsCollect(dateParam?: string | null): Promise<CollectResult> {
  const today = new Date().toISOString().slice(0, 10);
  const startdt = dateParam ?? new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const enddt = dateParam ?? today;

  try {
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

    const hits = await fetchAllHits(startdt, enddt);
    console.log(`[collect/filings] EDGAR hits: ${hits.length}건`);

    const adminClient = createAdminClient();

    // tickerSet 전체 조회 — PostgREST 1000행 제한 우회: range 페이지네이션
    const tickerSet = new Set<string>();
    {
      const TICKER_PAGE = 1000;
      let from = 0;
      while (true) {
        const { data } = await adminClient
          .from("tickers")
          .select("ticker")
          .range(from, from + TICKER_PAGE - 1);
        if (!data || data.length === 0) break;
        for (const r of data) tickerSet.add(r.ticker);
        if (data.length < TICKER_PAGE) break;
        from += TICKER_PAGE;
      }
    }
    console.log(`[collect/filings] tickerSet 종목 수: ${tickerSet.size}개`);

    let inserted = 0;
    let skipNoTicker = 0;
    let skipTickerErr = 0;
    let skipFilingErr = 0;
    let firstError: string | undefined;

    for (const hit of hits) {
      const { _id: accessionId, _source: src } = hit;
      const { ticker, paddedCik } = parseFiler(src.display_names);
      if (!ticker) { skipNoTicker++; continue; }

      const entityName = String(src.entity_name ?? ticker);
      const exchange = paddedCik ? (cikToExchange.get(paddedCik) ?? null) : null;

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

      const formType = Array.isArray(src.root_forms)
        ? String(src.root_forms[0] ?? "")
        : String(src.root_forms ?? "");

      const { error } = await adminClient.from("filings").upsert(
        {
          ticker,
          form_type: formType,
          filed_at: `${src.file_date}T00:00:00Z`,
          title: `${entityName} — ${formType}`,
          url: filingUrl,
          event_type: getEventType(formType),
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

    const tickerMatched = hits.length - skipNoTicker;
    const insertAttempted = tickerMatched - skipTickerErr;
    const skipped = skipNoTicker + skipTickerErr + skipFilingErr;
    console.log(`[collect/filings] ticker 매칭: ${tickerMatched}건`);
    console.log(`[collect/filings] insert 시도: ${insertAttempted}건`);
    console.log(`[collect/filings] 저장: ${inserted}건`);
    console.log(`[collect/filings] 스킵: ${skipped}건 (ticker없음 ${skipNoTicker} / ticker오류 ${skipTickerErr} / upsert오류 ${skipFilingErr})`);

    let summarized = 0;
    let summarizeFailed = 0;
    if (process.env.ANTHROPIC_API_KEY) {
      const s = await summarizeFilings(adminClient);
      summarized = s.done;
      summarizeFailed = s.failed;
    }

    return {
      ok: true,
      period: { startdt, enddt },
      total: hits.length,
      inserted,
      skipped,
      summarized,
      ...(summarizeFailed > 0 && { summarizeFailed }),
      debug: { skipNoTicker, skipTickerErr, skipFilingErr, firstError: firstError ?? null, sampleSource: hits[0]?._source ?? null },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/filings]", message);
    return { ok: false, error: message };
  }
}
