import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

// 어드민 "Pro 수동 부여" 기간 옵션. src/app/admin/users/pro-grant/page.tsx의
// 드롭다운 값과 반드시 1:1로 맞춰 유지한다.
export const PRO_GRANT_PERIODS = ["1m", "3m", "6m", "12m", "lifetime"] as const;
export type ProGrantPeriod = (typeof PRO_GRANT_PERIODS)[number];

export function isProGrantPeriod(value: string): value is ProGrantPeriod {
  return (PRO_GRANT_PERIODS as readonly string[]).includes(value);
}

const PERIOD_MONTHS: Record<Exclude<ProGrantPeriod, "lifetime">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

/** 부여 시점(from) 기준 만료 시각을 계산한다. lifetime(무기한)이면 null. */
export function computeProExpiresAt(period: ProGrantPeriod, from: Date = new Date()): string | null {
  if (period === "lifetime") return null;
  const expires = new Date(from);
  expires.setUTCMonth(expires.getUTCMonth() + PERIOD_MONTHS[period]);
  return expires.toISOString();
}

/** pro_expires_at이 지난 Pro 유저를 찾아 free로 강등한다. 무기한(null) 부여는 대상에서 제외된다. */
export async function runProExpiryDowngrade(): Promise<CollectResult> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from("profiles")
    .select("id, email")
    .eq("plan", "pro")
    .not("pro_expires_at", "is", null)
    .lte("pro_expires_at", nowIso);

  if (error) return { ok: false, error: error.message, retryable: true };

  const expired = data ?? [];
  if (expired.length === 0) {
    return { ok: true, downgraded: 0 };
  }

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ plan: "free" })
    .in("id", expired.map((p) => p.id));

  if (updateErr) return { ok: false, error: updateErr.message, retryable: true };

  return { ok: true, downgraded: expired.length, emails: expired.map((p) => p.email) };
}
