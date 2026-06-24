import type { SupabaseClient } from "@supabase/supabase-js";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
/** 1회 수집 당 요약 상한 — Vercel 함수 타임아웃 여유 확보 */
const BATCH_LIMIT = 20;

async function callHaiku(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.content?.[0]?.text as string | undefined) ?? null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function summarizeFilings(
  adminClient: SupabaseClient<any, any, any>,
  limit = BATCH_LIMIT
): Promise<{ done: number; failed: number }> {
  const { data: rows } = await adminClient
    .from("filings")
    .select("id, ticker, form_type, title")
    .is("summary_kr", null)
    .not("form_type", "eq", "")
    .order("filed_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return { done: 0, failed: 0 };

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const prompt = `미국 SEC 공시 정보를 한국어로 2문장으로 간결하게 설명해주세요.
사실만 서술하고 투자 권유 표현은 절대 사용하지 마세요.

기업: ${row.ticker}
공시 유형: ${row.form_type}
제목: ${row.title}`;

    const summary = await callHaiku(prompt);
    if (!summary) { failed++; continue; }

    const { error } = await adminClient
      .from("filings")
      .update({ summary_kr: summary })
      .eq("id", row.id);

    error ? failed++ : done++;
  }

  return { done, failed };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function summarizeNews(
  adminClient: SupabaseClient<any, any, any>,
  limit = BATCH_LIMIT
): Promise<{ done: number; failed: number }> {
  const { data: rows } = await adminClient
    .from("news")
    .select("id, headline, source")
    .is("summary_kr", null)
    .not("headline", "eq", "")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!rows?.length) return { done: 0, failed: 0 };

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const prompt = `다음 영문 뉴스 헤드라인을 한국어로 2문장으로 요약해주세요.
사실만 서술하고 투자 권유 표현은 절대 사용하지 마세요.

헤드라인: ${row.headline}
출처: ${row.source ?? ""}`;

    const summary = await callHaiku(prompt);
    if (!summary) { failed++; continue; }

    const { error } = await adminClient
      .from("news")
      .update({ summary_kr: summary })
      .eq("id", row.id);

    error ? failed++ : done++;
  }

  return { done, failed };
}
