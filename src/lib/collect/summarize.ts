/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const BATCH_LIMIT = 20;

type AdminClient = SupabaseClient<any, any, any>;

export interface SummarizeOpts {
  limit?: number;
  /** 우선 번역할 티커 목록 (와치리스트 종목). 소화 후 나머지 슬롯을 채움. */
  priorityTickers?: string[];
}

// ─── Anthropic Haiku 호출 ─────────────────────────────────────────────────────

async function callHaiku(prompt: string, maxTokens = 256): Promise<string | null> {
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
        max_tokens: maxTokens,
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

// ─── 행 조회 헬퍼 ──────────────────────────────────────────────────────────────

async function fetchFilingRows(
  adminClient: AdminClient,
  limit: number,
  priorityTickers: string[]
) {
  const base = adminClient
    .from("filings")
    .select("id, ticker, form_type, title")
    .is("summary_kr", null)
    .not("form_type", "eq", "");

  // 우선 티커 없으면 단순 최신순
  if (priorityTickers.length === 0) {
    const { data } = await base.order("filed_at", { ascending: false }).limit(limit);
    return data ?? [];
  }

  // 1. 와치리스트 종목 우선
  const { data: priority } = await base
    .in("ticker", priorityTickers)
    .order("filed_at", { ascending: false })
    .limit(limit);

  const priorityRows = priority ?? [];
  const remaining = limit - priorityRows.length;
  if (remaining <= 0) return priorityRows;

  // 2. 나머지 슬롯: 와치리스트 外 항목
  const { data: fill } = await adminClient
    .from("filings")
    .select("id, ticker, form_type, title")
    .is("summary_kr", null)
    .not("form_type", "eq", "")
    .not("ticker", "in", `(${priorityTickers.join(",")})`)
    .order("filed_at", { ascending: false })
    .limit(remaining);

  return [...priorityRows, ...(fill ?? [])];
}

async function fetchNewsRows(
  adminClient: AdminClient,
  limit: number,
  priorityTickers: string[]
) {
  const base = adminClient
    .from("news")
    .select("id, headline, source")
    .is("summary_kr", null)
    .not("headline", "eq", "");

  if (priorityTickers.length === 0) {
    const { data } = await base.order("published_at", { ascending: false }).limit(limit);
    return data ?? [];
  }

  // 1. 와치리스트 종목 뉴스 우선
  const { data: priority } = await base
    .in("ticker", priorityTickers)
    .order("published_at", { ascending: false })
    .limit(limit);

  const priorityRows = priority ?? [];
  const remaining = limit - priorityRows.length;
  if (remaining <= 0) return priorityRows;

  // 2. 나머지: ticker IS NULL(시장 전반) + 와치리스트 外
  const { data: fill } = await adminClient
    .from("news")
    .select("id, headline, source")
    .is("summary_kr", null)
    .not("headline", "eq", "")
    .or(`ticker.is.null,ticker.not.in.(${priorityTickers.join(",")})`)
    .order("published_at", { ascending: false })
    .limit(remaining);

  return [...priorityRows, ...(fill ?? [])];
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

export async function summarizeFilings(
  adminClient: AdminClient,
  { limit = BATCH_LIMIT, priorityTickers = [] }: SummarizeOpts = {}
): Promise<{ done: number; failed: number }> {
  const rows = await fetchFilingRows(adminClient, limit, priorityTickers);
  if (!rows.length) return { done: 0, failed: 0 };

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const prompt = `미국 SEC 공시 제목을 한국어로 요약해주세요.

원칙
- 공시에 명시된 사실만 서술하세요.
- 분석, 해설, 의견, 전망은 추가하지 마세요.
- "~했습니다", "~발표했습니다" 형태의 사실 서술체로만 작성하세요.
- 투자 판단과 관련된 표현은 중립적으로 서술하세요.
- 분량: 3~5문장, 200자 내외
- plain text로만 응답하고 마크다운 기호(#, **, - 등)는 사용하지 마세요.

기업: ${row.ticker}
공시 유형: ${row.form_type}
제목: ${row.title}`;

    const summary = await callHaiku(prompt, 512);
    if (!summary) { failed++; continue; }

    const { error } = await adminClient
      .from("filings")
      .update({ summary_kr: summary })
      .eq("id", row.id);

    error ? failed++ : done++;
  }

  return { done, failed };
}

export async function summarizeNews(
  adminClient: AdminClient,
  { limit = BATCH_LIMIT, priorityTickers = [] }: SummarizeOpts = {}
): Promise<{ done: number; failed: number }> {
  const rows = await fetchNewsRows(adminClient, limit, priorityTickers);
  if (!rows.length) return { done: 0, failed: 0 };

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const prompt = `다음 영문 뉴스 헤드라인을 한국어로 요약해주세요.

원칙
- 헤드라인에 명시된 사실만 서술하세요.
- 분석, 해설, 의견, 전망은 추가하지 마세요.
- "~했습니다", "~발표했습니다" 형태의 사실 서술체로만 작성하세요.
- 투자 판단과 관련된 표현은 중립적으로 서술하세요.
- 분량: 2~3문장, 100자 내외
- plain text로만 응답하고 마크다운 기호(#, **, - 등)는 사용하지 마세요.

헤드라인: ${row.headline}
출처: ${row.source ?? ""}`;

    const summary = await callHaiku(prompt, 256);
    if (!summary) { failed++; continue; }

    const { error } = await adminClient
      .from("news")
      .update({ summary_kr: summary })
      .eq("id", row.id);

    error ? failed++ : done++;
  }

  return { done, failed };
}
