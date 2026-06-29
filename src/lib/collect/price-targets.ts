import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const FMP_BASE = "https://financialmodelingprep.com";
const DELAY_MS = 300;
const MAX_TICKERS = 30;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface FmpPriceTarget {
  symbol?: string;
  publishedDate?: string | null;
  analystCompany?: string | null;
  analystName?: string | null;
  priceTarget?: number | string | null;
  adjPriceTarget?: number | string | null;
}

function toNum(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? null : n;
}

export async function runPriceTargetsCollect(): Promise<CollectResult> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { ok: false, error: "FMP_API_KEY 없음", retryable: false };

  const admin = createAdminClient();
  const d7  = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const d90 = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

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
        `${FMP_BASE}/stable/price-target?symbol=${ticker}&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) { skipped++; continue; }

      const raw = await res.json();
      const items: FmpPriceTarget[] = Array.isArray(raw) ? raw : [];
      if (items.length === 0) { skipped++; continue; }

      // 최근 90일 이내 데이터만 저장
      const recent = items.filter((item) => {
        if (!item.publishedDate) return false;
        const dateStr = item.publishedDate.slice(0, 10);
        return dateStr >= d90;
      });

      if (recent.length === 0) { skipped++; continue; }

      for (const item of recent) {
        const price_target     = toNum(item.priceTarget);
        const adj_price_target = toNum(item.adjPriceTarget);
        const published_date   = item.publishedDate?.slice(0, 10) ?? null;
        const analyst_company  = item.analystCompany ?? null;

        if (!price_target || !published_date) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (admin as any).from("price_targets").upsert(
          {
            ticker,
            analyst_company,
            price_target,
            adj_price_target,
            published_date,
          },
          { onConflict: "ticker,analyst_company,published_date" }
        );

        if (error) {
          console.error(`[collect/price-targets] ${ticker}:`, error.message);
          errors++;
        } else {
          updated++;
        }
      }
    } catch {
      errors++;
    }

    if (i < tickers.length - 1) await delay(DELAY_MS);
  }

  return { ok: true, total: tickers.length, updated, skipped, errors };
}
