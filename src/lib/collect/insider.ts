import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

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

async function collectForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}&token=${apiKey}`,
    { signal: AbortSignal.timeout(15_000) }
  );
  if (!res.ok) return { inserted: 0, skipped: 1 };

  const data: FinnhubInsiderResponse = await res.json();
  const transactions = data.data ?? [];

  let inserted = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const transactionType = mapTransactionType(tx.transactionCode);
    // P(매수)/S(매도)만, 파생상품 제외
    if (!transactionType || tx.isDerivative) continue;

    const value =
      tx.share && tx.transactionPrice ? tx.share * tx.transactionPrice : null;

    const { error } = await (adminClient as any)
      .from("insider_trades")
      .insert({
        ticker,
        name: tx.name || null,
        title: tx.title || null,
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
    // 와치리스트 + 최근 7일 공시 종목 (최대 10개)
    const [watchlistRes, filingRes] = await Promise.all([
      adminClient.from("watchlist").select("ticker"),
      adminClient
        .from("filings")
        .select("ticker")
        .gte("filed_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    ]);

    const tickerSet = new Set<string>();
    for (const r of watchlistRes.data ?? []) tickerSet.add(r.ticker);
    for (const r of filingRes.data ?? []) tickerSet.add(r.ticker);

    tickers = [...tickerSet].slice(0, 10);
  }

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const ticker of tickers) {
    const { inserted, skipped } = await collectForTicker(
      ticker,
      apiKey,
      adminClient
    );
    totalInserted += inserted;
    totalSkipped += skipped;
    if (tickers.length > 1) await new Promise((r) => setTimeout(r, 200));
  }

  return {
    ok: true,
    tickers: tickers.length,
    inserted: totalInserted,
    skipped: totalSkipped,
  };
}
