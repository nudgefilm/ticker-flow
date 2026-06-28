import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json";
const USER_AGENT = "TickerFlow support@tickerflow.net";

// company_tickers_exchange.json field order: [cik_str, name, ticker, exchange]
type SecRow = [number, string, string, string];

const TARGET_EXCHANGES = new Set(["Nasdaq", "NYSE", "NYSE MKT", "NYSE ARCA"]);
const BATCH_SIZE = 500;

export async function runSeedTickersCollect(): Promise<CollectResult> {
  try {
    const res = await fetch(SEC_TICKERS_URL, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`SEC tickers: HTTP ${res.status}`);

    const secData: { data: SecRow[] } = await res.json();
    const rows = secData.data.filter(([, , , exchange]) => TARGET_EXCHANGES.has(exchange));

    const adminClient = createAdminClient();
    let upserted = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows
        .slice(i, i + BATCH_SIZE)
        .map(([, name, ticker, exchange]) => ({ ticker, name_en: name, exchange }));

      const { error } = await adminClient
        .from("tickers")
        .upsert(batch, { onConflict: "ticker" });

      if (error) throw new Error(`Batch ${i / BATCH_SIZE + 1}: ${error.message}`);
      upserted += batch.length;
    }

    return { ok: true, total: rows.length, inserted: upserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[seed/tickers]", message);
    return { ok: false, error: message };
  }
}
