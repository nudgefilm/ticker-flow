import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const FMP_BASE = "https://financialmodelingprep.com";
const DELAY_MS = 300;
const MAX_TICKERS = 30;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface FmpShortFloat {
  symbol?: string;
  date?: string;
  shortFloat?: number | string | null;
  shortRatio?: number | string | null;
}

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}

export async function runShortInterestCollect(): Promise<CollectResult> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { ok: false, error: "FMP_API_KEY 없음", retryable: false };

  const admin = createAdminClient();
  const todayStr = new Date().toISOString().slice(0, 10);
  const d7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // 수집 대상: 와치리스트 + 최근 7일 공시 종목
  const [watchlistRes, filingsRes] = await Promise.all([
    admin.from("watchlist").select("ticker"),
    admin.from("filings").select("ticker").gte("filed_at", d7).limit(500),
  ]);

  const tickerSet = new Set<string>();
  for (const w of (watchlistRes.data ?? [])) tickerSet.add(w.ticker);
  for (const f of (filingsRes.data ?? []) as { ticker: string }[]) {
    if (f.ticker) tickerSet.add(f.ticker);
  }

  const tickers = Array.from(tickerSet).slice(0, MAX_TICKERS);
  if (tickers.length === 0) return { ok: true, total: 0, updated: 0, skipped: 0, errors: 0 };

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    try {
      const res = await fetch(
        `${FMP_BASE}/stable/short-float?symbol=${ticker}&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) { skipped++; continue; }

      const raw = await res.json();
      const item: FmpShortFloat | null = Array.isArray(raw) ? (raw[0] ?? null) : raw;
      if (!item || item.shortFloat == null) { skipped++; continue; }

      const short_float = toNum(item.shortFloat);
      const short_ratio = toNum(item.shortRatio);
      if (short_float == null) { skipped++; continue; }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any).from("short_interest").upsert(
        { ticker, short_float, short_ratio, collected_at: todayStr },
        { onConflict: "ticker,collected_at" }
      );

      if (error) {
        console.error(`[collect/short-interest] ${ticker}:`, error.message);
        errors++;
      } else {
        updated++;
      }
    } catch {
      errors++;
    }

    if (i < tickers.length - 1) await delay(DELAY_MS);
  }

  return { ok: true, total: tickers.length, updated, skipped, errors };
}
