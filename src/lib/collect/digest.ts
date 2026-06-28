import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { resend, FROM } from "@/lib/email/resend";
import { dailyDigestEmail } from "@/lib/email/templates";

export async function runDigestCollect(): Promise<CollectResult> {
  const adminClient = createAdminClient();

  const { data: profiles, error: profileErr } = await adminClient
    .from("profiles")
    .select("email")
    .eq("plan", "pro");

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  const proEmails = (profiles ?? [])
    .map((p) => p.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);

  if (proEmails.length === 0) {
    return { ok: true, sent: 0, message: "Pro 유저 없음" };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: filingsRaw } = await adminClient
    .from("filings")
    .select("ticker, form_type, summary_kr")
    .not("summary_kr", "is", null)
    .gte("filed_at", todayStart.toISOString())
    .order("filed_at", { ascending: false })
    .limit(5);

  const { data: newsRaw } = await adminClient
    .from("news")
    .select("ticker, headline, summary_kr")
    .gte("datetime", Math.floor(todayStart.getTime() / 1000))
    .order("datetime", { ascending: false })
    .limit(5);

  type FilingRow = { ticker: string; form_type: string; summary_kr: string };
  type NewsRow = { ticker: string; headline: string; summary_kr: string };

  const filings: FilingRow[] = (filingsRaw ?? []).map((f) => ({
    ticker: (f as unknown as FilingRow).ticker ?? "",
    form_type: (f as unknown as FilingRow).form_type ?? "",
    summary_kr: (f as unknown as FilingRow).summary_kr ?? "",
  }));

  const news: NewsRow[] = (newsRaw ?? []).map((n) => ({
    ticker: (n as unknown as NewsRow).ticker ?? "",
    headline: (n as unknown as NewsRow).headline ?? "",
    summary_kr: (n as unknown as NewsRow).summary_kr ?? "",
  }));

  const html = dailyDigestEmail(filings, news);
  let sent = 0;
  let errors = 0;

  for (const email of proEmails) {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "오늘의 주요 변화 요약 | TickerFlow",
      html,
    });
    if (error) {
      errors++;
    } else {
      sent++;
    }
  }

  return { ok: true, sent, errors, total: proEmails.length };
}
