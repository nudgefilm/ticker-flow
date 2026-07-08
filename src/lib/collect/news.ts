import { createAdminClient } from "@/lib/supabase/admin";
import { summarizeNews } from "./summarize";
import { runStockBriefCollect } from "./brief";
import { getCollectTargetTickers } from "./target-tickers";
import { classifyHttpSkipReason, type CollectResult, type SkipReason } from "./types";
import { MAX_TICKERS_PER_RUN } from "./limits";

interface FinnhubNewsItem {
  datetime: number;
  headline: string;
  related: string;
  source: string;
  url: string;
}

interface FinnhubCompanyNewsItem {
  datetime: number;
  headline: string;
  source: string;
  url: string;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── 종목별 뉴스(티커 태깅용) ───────────────────────────────────────────────────
//
// category=general 뉴스는 Finnhub 특성상 related(연관 티커)가 거의 항상 비어
// 있어 "섹터별 뉴스 활동" 등 티커 기반 집계에 쓸 수 없다. 관심 종목 한정으로
// company-news를 별도 호출해 ticker를 확실히 채운다.
//
// upsert에 ignoreDuplicates를 주지 않아(기본값 false) 이미 general 수집으로
// ticker=null 상태로 저장된 동일 url 행이 있으면 이번 호출로 ticker가 채워지도록
// 덮어쓴다. 반대로 general 쪽 upsert는 ignoreDuplicates: true를 유지해, 이미
// 정확한 ticker가 채워진 행을 다시 null로 되돌리지 않는다.
async function collectCompanyNewsForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number; skipReason?: SkipReason }> {
  const to = new Date();
  const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${ymd(from)}&to=${ymd(to)}&token=${apiKey}`,
    { signal: AbortSignal.timeout(15_000) }
  );
  if (!res.ok) return { inserted: 0, skipped: 1, skipReason: classifyHttpSkipReason(res.status) };

  const items: FinnhubCompanyNewsItem[] = await res.json();
  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.url || !item.headline) { skipped++; continue; }

    const { error } = await adminClient.from("news").upsert(
      {
        ticker,
        headline: item.headline,
        source: item.source || null,
        published_at: new Date(item.datetime * 1000).toISOString(),
        url: item.url,
      },
      { onConflict: "url" }
    );

    if (error) {
      console.error(`[collect/news] company-news upsert ${ticker}:`, error.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function runNewsCollect(): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
    );
    if (!res.ok) throw new Error(`Finnhub news: HTTP ${res.status}`);
    const items: FinnhubNewsItem[] = await res.json();

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
    console.log(`[collect/news] tickerSet 종목 수: ${tickerSet.size}개`);

    let inserted = 0;
    let skipped = 0;
    let firstError: string | undefined;
    const briefTickers = new Set<string>();

    for (const item of items) {
      if (!item.url || !item.headline) { skipped++; continue; }

      let ticker: string | null = null;
      if (item.related) {
        if (!tickerSet.has(item.related)) {
          const { error: tickerErr } = await adminClient.from("tickers").upsert(
            { ticker: item.related, name_en: item.related },
            { onConflict: "ticker", ignoreDuplicates: true }
          );
          if (!tickerErr) tickerSet.add(item.related);
        }
        if (tickerSet.has(item.related)) ticker = item.related;
      }

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

      if (error) {
        firstError ??= error.message;
        console.error("[collect/news] upsert:", error.message);
        skipped++;
      } else {
        inserted++;
        if (ticker && briefTickers.size < 20) briefTickers.add(ticker);
      }
    }

    // ── 종목별 뉴스(티커 태깅) — 와치리스트 + top30/거래량/섹터 상위 + 최근 7일
    // 공시 종목 한정. 다른 collect 함수(insider.ts 등)와 동일한 대상 선정 패턴.
    //
    // 2026-07-04 거래량·섹터 상위 종목이 합류하며 getCollectTargetTickers()가
    // 150개 이상까지 늘어나, 종목당 250ms 순차 호출이 Haiku 요약·BRIEF 재생성과
    // 겹쳐 maxDuration(300초)을 넘길 위험이 커졌다(insider.ts와 같은 원인으로
    // news 크론도 collect_runs에서 상태값이 running에 멈춰 있었음). 최근 공시
    // 종목(가장 시의성 높은 신호)을 최우선으로 채우고 MAX_TICKERS_PER_RUN(limits.ts,
    // insider.ts와 공유)으로 상한을 둔다.
    const [targetTickers, filingRes] = await Promise.all([
      getCollectTargetTickers(),
      adminClient
        .from("filings")
        .select("ticker")
        .gte("filed_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    ]);

    const filingTickers = (filingRes.data ?? []).map((r) => r.ticker);
    const companyNewsTickerSet = new Set<string>([...filingTickers, ...targetTickers]);
    const companyNewsTickers = [...companyNewsTickerSet].slice(0, MAX_TICKERS_PER_RUN);

    let companyNewsInserted = 0;
    let companyNewsSkipped = 0;
    const companyNewsSkipReasons: Partial<Record<SkipReason, number>> = {};

    for (const ticker of companyNewsTickers) {
      const result = await collectCompanyNewsForTicker(ticker, apiKey, adminClient);
      companyNewsInserted += result.inserted;
      companyNewsSkipped += result.skipped;
      if (result.skipReason) {
        companyNewsSkipReasons[result.skipReason] = (companyNewsSkipReasons[result.skipReason] ?? 0) + 1;
      }
      if (result.inserted > 0 && briefTickers.size < 20) briefTickers.add(ticker);

      if (companyNewsTickers.length > 1) await new Promise((r) => setTimeout(r, 250));
    }
    console.log(`[collect/news] company-news 대상 종목 ${companyNewsTickers.length}개, 저장 ${companyNewsInserted}건`);

    let summarized = 0;
    let summarizeFailed = 0;
    if (process.env.ANTHROPIC_API_KEY) {
      const s = await summarizeNews(adminClient);
      summarized = s.done;
      summarizeFailed = s.failed;

      // 신규 뉴스가 있는 종목의 BRIEF 갱신 (실패해도 collect 결과에 영향 없음)
      if (briefTickers.size > 0) {
        await Promise.allSettled(
          [...briefTickers].map((t) => runStockBriefCollect(t, "news"))
        );
      }
    }

    return {
      ok: true,
      total: items.length,
      inserted,
      skipped,
      companyNewsTickers: companyNewsTickers.length,
      companyNewsInserted,
      companyNewsSkipped,
      ...(Object.keys(companyNewsSkipReasons).length > 0 && { companyNewsSkipReasons }),
      summarized,
      ...(summarizeFailed > 0 && { summarizeFailed }),
      ...(firstError && { firstError }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[collect/news]", message);
    return { ok: false, error: message };
  }
}
