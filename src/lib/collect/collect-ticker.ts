import { createAdminClient } from "@/lib/supabase/admin";
import { runInsiderCollect } from "./insider";
import { runPricesCollect } from "./prices";
import { summarizeFilingsForTicker } from "./summarize";

const USER_AGENT = "TickerFlow support@tickerflow.net";
const ALLOWED_FORMS = new Set(["8-K", "10-K", "10-Q", "4", "S-1", "DEF 14A", "DEF14A"]);

interface SubmissionsRecent {
  accessionNumber: string[];
  filingDate: string[];
  form: string[];
}

interface SecSubmissions {
  cik: string;
  name: string;
  filings: { recent: SubmissionsRecent };
}

interface FinnhubNewsItem {
  headline: string;
  datetime: number;
  source: string;
  url: string;
}

function getEventType(form: string): string | null {
  return form === "4" ? "insider_trade" : null;
}

async function findCik(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://www.sec.gov/files/company_tickers_exchange.json",
      { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data: { data: [number, string, string, string][] } = await res.json();
    for (const [cik, , t] of data.data) {
      if (t === ticker) return String(cik).padStart(10, "0");
    }
  } catch {
    // CIK 조회 실패 시 null 반환
  }
  return null;
}

type TickerData = { filings: number; news: number; cikNotFound?: boolean };

export async function collectTickerData(ticker: string): Promise<TickerData> {
  const adminClient = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const sevenDaysAgo  = new Date(Date.now() -  7 * 86_400_000).toISOString().slice(0, 10);

  let filingsInserted = 0;
  let newsInserted    = 0;
  let cikNotFound     = false;

  // ── 1. EDGAR 공시 (최근 30일) ─────────────────────────────────────────────
  const paddedCik = await findCik(ticker);
  if (!paddedCik) {
    cikNotFound = true;
  } else {
    try {
      const res = await fetch(
        `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      if (res.ok) {
        const sub: SecSubmissions = await res.json();
        const { accessionNumber, filingDate, form } = sub.filings.recent;
        const numCik = parseInt(paddedCik, 10).toString();

        for (let i = 0; i < accessionNumber.length; i++) {
          if (!filingDate[i] || filingDate[i] < thirtyDaysAgo) break; // 최신순 정렬, 30일 이전이면 중단
          if (!ALLOWED_FORMS.has(form[i])) continue;

          const accNoDashes = accessionNumber[i].replace(/-/g, "");
          const url = `https://www.sec.gov/Archives/edgar/data/${numCik}/${accNoDashes}/${accessionNumber[i]}-index.htm`;

          const { error } = await adminClient.from("filings").upsert(
            {
              ticker,
              form_type: form[i],
              filed_at: `${filingDate[i]}T00:00:00Z`,
              title: `${sub.name} — ${form[i]}`,
              url,
              event_type: getEventType(form[i]),
            },
            { onConflict: "url", ignoreDuplicates: true }
          );
          if (!error) filingsInserted++;
        }
      }
    } catch (err) {
      console.error("[collect-ticker] EDGAR:", ticker, err);
    }
  }

  // 방금 수집된(또는 이전에 요약이 비어 있던) 이 종목 공시를 즉시 요약 —
  // 새로고침 요구 없이 화면에 바로 반영되도록 수집 직후 처리한다.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      await summarizeFilingsForTicker(adminClient, ticker);
    } catch (err) {
      console.error("[collect-ticker] summarize:", ticker, err);
    }
  }

  // ── 2. Finnhub 뉴스 (최근 7일) ───────────────────────────────────────────
  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (finnhubKey) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${sevenDaysAgo}&to=${today}&token=${finnhubKey}`
      );
      if (res.ok) {
        const items: FinnhubNewsItem[] = await res.json();
        for (const item of items) {
          if (!item.url || !item.headline) continue;
          const { error } = await adminClient.from("news").upsert(
            {
              ticker,
              headline: item.headline,
              source: item.source || null,
              published_at: new Date(item.datetime * 1000).toISOString(),
              url: item.url,
            },
            { onConflict: "url", ignoreDuplicates: true }
          );
          if (!error) newsInserted++;
        }
      }
    } catch (err) {
      console.error("[collect-ticker] Finnhub:", ticker, err);
    }
  }

  return {
    filings: filingsInserted,
    news: newsInserted,
    ...(cikNotFound && { cikNotFound }),
  };
}

/**
 * 단일 종목의 가격만 온디맨드로 갱신한다(스냅샷 방문 시 가격이 뒤처졌을 때, 옵션 A).
 * 공시/뉴스/내부자를 묶는 collectTickerFull과 달리, isStale(그 3종이 모두 빈 상태)과는
 * 무관하게 "가격 신선도"만 보고 독립적으로 호출된다. 이미 검증된 단일 티커 동기 수집
 * 경로(runPricesCollect(ticker))를 그대로 재사용한다.
 */
export async function collectTickerPrices(ticker: string) {
  return runPricesCollect(ticker);
}

/** 공시(30일)+뉴스(7일)+내부자거래를 한 종목에 대해 함께 수집한다. */
export async function collectTickerFull(
  ticker: string
): Promise<TickerData & { insider: number }> {
  const [data, insiderResult] = await Promise.all([
    collectTickerData(ticker),
    runInsiderCollect(ticker),
  ]);

  return {
    ...data,
    insider: typeof insiderResult.inserted === "number" ? insiderResult.inserted : 0,
  };
}
