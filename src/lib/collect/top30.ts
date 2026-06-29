import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { computeScores } from "./scoring";

export async function runTop30Select(): Promise<CollectResult> {
  const scored = await computeScores();

  if (scored.length === 0) {
    return { ok: true, total: 0, upserted: 0 };
  }

  const top30 = scored.slice(0, 30);
  const todayStr = new Date().toISOString().slice(0, 10);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const rows = top30.map((item, idx) => ({
    date:           todayStr,
    ticker:         item.ticker,
    rank:           idx + 1,
    event_score:    item.eventScore,
    smart_score:    item.smartScore,
    earnings_score: item.earningsScore,
    market_score:   item.marketScore,
    final_score:    item.finalScore,
    reason_tags:    item.reasonTags,
    metadata:       item.metadata,
  }));

  const { error } = await admin
    .from("top30_daily")
    .upsert(rows, { onConflict: "date,ticker" });

  if (error) {
    console.error("[collect/top30]", error.message);
    return { ok: false, error: error.message, retryable: true };
  }

  return { ok: true, total: scored.length, upserted: top30.length };
}
