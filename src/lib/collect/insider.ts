import { createAdminClient } from "@/lib/supabase/admin";
import { runStockBriefCollect } from "./brief";
import { createInsiderTitleLookup } from "./insider-form4";
import { getCollectTargetTickers } from "./target-tickers";
import { classifyHttpSkipReason, type CollectResult, type SkipReason } from "./types";
import { INSIDER_LOOKBACK_DAYS, MAX_TICKERS_PER_RUN } from "./limits";

// ─── Finnhub 응답 타입 ─────────────────────────────────────────────────────────

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  transactionCode: string;
  transactionDate: string;
  transactionPrice: number;
  isDerivative: boolean;
  filingDate: string;
  symbol: string;
  title?: string;
}

interface FinnhubInsiderResponse {
  data: FinnhubInsiderTransaction[];
  symbol: string;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function mapTransactionType(code: string): "buy" | "sell" | null {
  if (code === "P") return "buy";
  if (code === "S") return "sell";
  return null;
}

// ─── 종목별 수집 ────────────────────────────────────────────────────────────────
//
// Finnhub는 종목당 전체 거래 히스토리를 반환한다 — NVDA/TSLA 같은 대형주는 100건
// 이상. 오래된 거래는 이전 실행에서 이미 수집됐을 가능성이 높고 "최근 내부자
// 거래" 모니터링 목적에도 맞지 않으므로, 최근 INSIDER_LOOKBACK_DAYS일 이내만
// 처리해 종목당 SEC 직책 조회(insider-form4.ts) 횟수를 감당 가능한 수준으로
// 낮춘다(값은 limits.ts에서 중앙 관리). 이 필터가 없었을 때는 대형주 몇 개만
// 으로도 종목당 수십 초가 걸려 maxDuration(300초)을 넘겨 insider_trades가
// 12일간 정체됐다(실측: NVDA/TSLA 각각 100건 이상 처리 시도, 티커 30개 중
// 20번째도 못 가서 90초+ 소요 확인).

async function collectForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number; skipReason?: SkipReason }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}&token=${apiKey}`,
    { signal: AbortSignal.timeout(15_000) }
  );
  if (!res.ok) return { inserted: 0, skipped: 1, skipReason: classifyHttpSkipReason(res.status) };

  const data: FinnhubInsiderResponse = await res.json();
  const cutoff = Date.now() - INSIDER_LOOKBACK_DAYS * 86_400_000;
  const transactions = (data.data ?? []).filter((tx) => {
    const dateStr = tx.filingDate || tx.transactionDate;
    return dateStr ? new Date(dateStr).getTime() >= cutoff : false;
  });

  let inserted = 0;
  let skipped = 0;

  // Finnhub 응답에 title이 없는 경우(현재 플랜 기준 항상 없음) SEC Form 4 원문에서 조회
  const lookupTitle = createInsiderTitleLookup(ticker);

  for (const tx of transactions) {
    const transactionType = mapTransactionType(tx.transactionCode);
    // P(매수)/S(매도)만, 파생상품 제외
    if (!transactionType || tx.isDerivative) continue;

    const value =
      tx.share && tx.transactionPrice ? tx.share * tx.transactionPrice : null;

    let title = tx.title || null;
    if (!title && tx.name && tx.filingDate) {
      title = await lookupTitle(tx.name, tx.filingDate);
    }

    const { error } = await (adminClient as any)
      .from("insider_trades")
      .insert({
        ticker,
        name: tx.name || null,
        title,
        transaction_type: transactionType,
        shares: tx.share || null,
        price: tx.transactionPrice || null,
        value,
        transaction_date: tx.transactionDate || null,
        filed_at: tx.filingDate ? `${tx.filingDate}T00:00:00Z` : null,
      });

    if (error && error.code !== "23505") {
      console.error(`[collect/insider] ${ticker}:`, error.message);
      skipped++;
    } else if (!error) {
      inserted++;
    }
  }

  return { inserted, skipped };
}

// ─── 메인 수집 함수 ────────────────────────────────────────────────────────────
//
// 2026-07-04 거래량·섹터 상위 종목이 수집 대상에 합류하며 getCollectTargetTickers()가
// 최대 150개 이상까지 늘어났다. INSIDER_LOOKBACK_DAYS 필터로 종목당 처리 시간을
// 줄였지만, 그래도 종목 수 자체에 상한(MAX_TICKERS_PER_RUN, limits.ts)을 둬
// 이중으로 maxDuration을 지킨다. 대상 종목 배열은 watchlist·top30이 먼저
// 채워지므로, 상한을 두어도 우선순위가 높은 종목부터 처리된다.

export async function runInsiderCollect(
  tickerParam?: string | null
): Promise<CollectResult> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "FINNHUB_API_KEY not set", retryable: false };
  }

  const adminClient = createAdminClient();
  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
  } else {
    // 와치리스트 + top30_daily 최근 TOP30 + 최근 7일 공시 종목 (중복 제거)
    const [targetTickers, filingRes] = await Promise.all([
      getCollectTargetTickers(),
      adminClient
        .from("filings")
        .select("ticker")
        .gte("filed_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    ]);

    // 최근 공시가 있었던 종목(가장 시의성 높은 신호)을 최우선으로, 그다음
    // watchlist·TOP30·거래량·섹터 순으로 채운다 — MAX_TICKERS 상한에 걸려도
    // 중요도가 높은 종목부터 처리되도록 순서를 보장한다.
    const filingTickers = (filingRes.data ?? []).map((r) => r.ticker);
    const tickerSet = new Set<string>([...filingTickers, ...targetTickers]);

    tickers = [...tickerSet].slice(0, MAX_TICKERS_PER_RUN);
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  const skipReasons: Partial<Record<SkipReason, number>> = {};

  for (const ticker of tickers) {
    const { inserted, skipped, skipReason } = await collectForTicker(
      ticker,
      apiKey,
      adminClient
    );
    totalInserted += inserted;
    totalSkipped += skipped;
    if (skipReason) skipReasons[skipReason] = (skipReasons[skipReason] ?? 0) + 1;

    // 신규 내부자 거래가 있는 종목의 BRIEF 갱신
    if (inserted > 0 && process.env.ANTHROPIC_API_KEY) {
      runStockBriefCollect(ticker, "insider").catch(() => {});
    }

    if (tickers.length > 1) await new Promise((r) => setTimeout(r, 200));
  }

  return {
    ok: true,
    ...(Object.keys(skipReasons).length > 0 && { skipReasons }),
    tickers: tickers.length,
    inserted: totalInserted,
    skipped: totalSkipped,
  };
}
