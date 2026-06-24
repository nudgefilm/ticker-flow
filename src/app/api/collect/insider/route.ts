import { NextRequest, NextResponse } from "next/server";
import { requireCollectAuth } from "@/lib/collect/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  transactionCode: string;  // "P"=buy, "S"=sell, "A"=award, etc.
  transactionDate: string;
  transactionPrice: number;
  change: number;
  isDerivative: boolean;
  filingDate: string;
  symbol: string;
}

interface FinnhubInsiderResponse {
  data: FinnhubInsiderTransaction[];
  symbol: string;
}

// Finnhub transaction code → DB transaction_type
function mapTransactionType(code: string): "buy" | "sell" | null {
  if (code === "P") return "buy";
  if (code === "S") return "sell";
  return null; // A(award), D(disposition), M(exercise) 등 제외
}

// 한 티커 수집
async function collectForTicker(
  ticker: string,
  apiKey: string,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  const res = await fetch(
    `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${ticker}&token=${apiKey}`
  );
  if (!res.ok) return { inserted: 0, skipped: 1 };

  const data: FinnhubInsiderResponse = await res.json();
  const transactions = data.data ?? [];

  for (const tx of transactions) {
    const transactionType = mapTransactionType(tx.transactionCode);
    if (!transactionType) continue;
    if (tx.isDerivative) continue; // 파생상품 제외

    const value =
      tx.share && tx.transactionPrice
        ? tx.share * tx.transactionPrice
        : null;

    const { error } = await adminClient.from("insider_trades").insert({
      ticker,
      name: tx.name || null,
      transaction_type: transactionType,
      shares: tx.share || null,
      price: tx.transactionPrice || null,
      value,
      transaction_date: tx.transactionDate || null,
      filed_at: tx.filingDate ? `${tx.filingDate}T00:00:00Z` : null,
    });

    // 23505 = unique_violation (중복 레코드) — 무시
    if (error && error.code !== "23505") {
      console.error(`[collect/insider] ${ticker}:`, error.message);
      skipped++;
    } else if (!error) {
      inserted++;
    }
  }

  return { inserted, skipped };
}

export async function GET(req: NextRequest) {
  const authError = await requireCollectAuth(req);
  if (authError) return authError;

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not set" }, { status: 500 });
  }

  const adminClient = createAdminClient();
  const tickerParam = req.nextUrl.searchParams.get("ticker");

  let tickers: string[];

  if (tickerParam) {
    // 단일 티커 모드
    tickers = [tickerParam.toUpperCase()];
  } else {
    // 전체 티커 수집 (어드민 수동 트리거용)
    const { data: rows } = await adminClient.from("tickers").select("ticker");
    tickers = rows?.map((r) => r.ticker) ?? [];
  }

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const ticker of tickers) {
    const { inserted, skipped } = await collectForTicker(ticker, apiKey, adminClient);
    totalInserted += inserted;
    totalSkipped += skipped;

    // Finnhub 요청 간 200ms 딜레이 (rate limit 대응)
    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return NextResponse.json({
    ok: true,
    tickers: tickers.length,
    inserted: totalInserted,
    skipped: totalSkipped,
  });
}
