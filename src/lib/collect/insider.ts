import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

// ─── FMP 응답 타입 ─────────────────────────────────────────────────────────────

interface FmpInsiderTransaction {
  symbol: string;
  filingDate: string | null;
  transactionDate: string | null;
  reportingName: string | null;
  transactionType: string; // "P-Purchase" | "S-Sale" | etc.
  securitiesTransacted: number | null;
  price: number | null;
  typeOfOwner: string | null;
  formType: string | null;
  link: string | null;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(["P-Purchase", "S-Sale"]);

function mapTransactionType(fmpType: string): "buy" | "sell" | null {
  if (fmpType === "P-Purchase") return "buy";
  if (fmpType === "S-Sale") return "sell";
  return null;
}

// ─── 종목별 수집 ────────────────────────────────────────────────────────────────

async function collectForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number; error?: string }> {
  try {
    const url = `https://financialmodelingprep.com/stable/insider-trading?symbol=${ticker}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { inserted: 0, skipped: 1, error: `HTTP ${res.status}` };

    const data: FmpInsiderTransaction[] = await res.json();
    if (!Array.isArray(data)) return { inserted: 0, skipped: 1 };

    // P-Purchase / S-Sale만, price > 0 건만 수집
    const transactions = data.filter(
      (tx) => ALLOWED_TYPES.has(tx.transactionType) && tx.price != null && tx.price > 0
    );

    let inserted = 0;
    let skipped = 0;

    for (const tx of transactions) {
      const transactionType = mapTransactionType(tx.transactionType);
      if (!transactionType) continue;

      const shares = tx.securitiesTransacted;
      const price = tx.price;
      const value = shares != null && price != null ? shares * price : null;

      const { error } = await (adminClient as any)
        .from("insider_trades")
        .insert({
          ticker,
          name: tx.reportingName ?? null,
          title: tx.typeOfOwner ?? null,
          transaction_type: transactionType,
          shares: shares ?? null,
          price: price ?? null,
          value,
          transaction_date: tx.transactionDate ?? null,
          filed_at: tx.filingDate ? `${tx.filingDate}T00:00:00Z` : null,
        });

      if (error) {
        if (error.code !== "23505") {
          console.error(`[collect/insider] ${ticker}:`, error.message);
        }
        skipped++;
      } else {
        inserted++;
      }
    }

    return { inserted, skipped };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[collect/insider] ${ticker}:`, msg);
    return { inserted: 0, skipped: 1, error: msg };
  }
}

// ─── 메인 수집 함수 ────────────────────────────────────────────────────────────

export async function runInsiderCollect(
  tickerParam?: string | null
): Promise<CollectResult> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "FMP_API_KEY not set", retryable: false };
  }

  const adminClient = createAdminClient();
  let tickers: string[];

  if (tickerParam) {
    tickers = [tickerParam.toUpperCase()];
  } else {
    // 전체 종목, 알파벳 순, 최대 50개
    const { data: tickerRows } = await adminClient
      .from("tickers")
      .select("ticker")
      .order("ticker", { ascending: true })
      .limit(50);

    tickers = (tickerRows ?? []).map((r) => r.ticker);
  }

  if (tickers.length === 0) {
    return { ok: true, total: 0, inserted: 0, skipped: 0, errors: 0 };
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let firstError: string | undefined;

  for (const ticker of tickers) {
    const { inserted, skipped, error } = await collectForTicker(
      ticker,
      apiKey,
      adminClient
    );
    totalInserted += inserted;
    totalSkipped += skipped;
    if (error) {
      totalErrors++;
      if (!firstError) firstError = `${ticker}: ${error}`;
    }
    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return {
    ok: true,
    total: tickers.length,
    inserted: totalInserted,
    skipped: totalSkipped,
    errors: totalErrors,
    ...(firstError && { firstError }),
  };
}
