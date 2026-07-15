/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFilingBodyForSummary } from "./filing-document";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
// company-news 수집 추가(2026-07-08)로 뉴스 유입량이 급증해 기존 20건/회로는
// 번역이 밀려 누적됨 — /api/collect/news(시간당 1회) + /api/translate(20분당
// 1회, 시간당 3회) 합산 처리량을 시간당 80건 → 160건으로 상향.
const BATCH_LIMIT = 40;
// 와치리스트 종목 뉴스 백로그가 40건을 다 채우면 티커 없는 일반 시장 뉴스(지수
// 동향, 거시경제 전망 등)가 무기한 밀리는 문제(2026-07-09 확인) 방지용 최소 예약 슬롯.
const MIN_GENERAL_NEWS_SLOTS = 10;
// 공시 요약(summarizeFilings)은 2026-07-15부터 8-K/10-K/10-Q에 대해 SEC 원문
// fetch + Haiku 호출을 1건마다 수행해 news보다 건당 처리 시간이 길다(10-K 원문은
// 수 MB에 달할 수 있음). /api/collect/filings의 maxDuration(300초) 안에서
// EFTS 전체수집 시간까지 더해도 안전하도록 BATCH_LIMIT(40)보다 낮은 값을 쓴다.
const FILING_SUMMARY_BATCH_LIMIT = 20;

type AdminClient = SupabaseClient<any, any, any>;

export interface SummarizeOpts {
  limit?: number;
  /** 우선 번역할 티커 목록 (와치리스트 종목). 소화 후 나머지 슬롯을 채움. */
  priorityTickers?: string[];
}

// ─── form_type 매핑 ────────────────────────────────────────────────────────────

interface FormTypeInfo {
  displayLabel: string;
  koreanName: string;
  objectParticle: "을" | "를";
}

const FORM_TYPE_INFO: Record<string, FormTypeInfo> = {
  "8-K":     { displayLabel: "8-K",      koreanName: "주요 경영 이벤트 보고서", objectParticle: "를" },
  "10-K":    { displayLabel: "10-K",     koreanName: "연간 실적 보고서",        objectParticle: "를" },
  "10-Q":    { displayLabel: "10-Q",     koreanName: "분기 실적 보고서",        objectParticle: "를" },
  "4":       { displayLabel: "Form 4",   koreanName: "내부자 거래 공시",        objectParticle: "를" },
  "S-1":     { displayLabel: "S-1",      koreanName: "신규 상장 신청서",        objectParticle: "를" },
  "DEF 14A": { displayLabel: "DEF 14A",  koreanName: "주주총회 위임장",         objectParticle: "을" },
  "DEF14A":  { displayLabel: "DEF 14A",  koreanName: "주주총회 위임장",         objectParticle: "을" },
};

/** 한국어 마지막 글자의 받침 여부로 이/가 반환 */
function subjectParticle(name: string): "이" | "가" {
  if (!name) return "이";
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "이"; // 한글 아닌 경우 기본 "이"
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

/**
 * "NVDA(엔비디아)가 8-K(주요 경영 이벤트 보고서)를 제출했습니다." 형태 생성
 * Haiku 호출 없이 코드에서 직접 생성. 8-K/10-K/10-Q 외 form_type(Form 4,
 * S-1, DEF 14A 등)의 요약은 이 템플릿을 그대로 사용한다(원문 요약 대상 아님).
 * scripts/reset-filing-template-summaries.ts가 백필 대상 판별에 재사용하므로
 * export 유지.
 */
export function buildFilingSummary(ticker: string, companyName: string, formType: string): string {
  const info = FORM_TYPE_INFO[formType];
  const displayLabel  = info?.displayLabel  ?? formType;
  const koreanName    = info?.koreanName    ?? formType;
  const objParticle   = info?.objectParticle ?? "를";
  const subjParticle  = subjectParticle(companyName);
  return `${ticker}(${companyName})${subjParticle} ${displayLabel}(${koreanName})${objParticle} 제출했습니다.`;
}

// ─── Anthropic Haiku 호출 (뉴스·공시 원문 요약 공용) ──────────────────────────

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
    .select("id, ticker, form_type, url")
    .is("summary_kr", null)
    .not("form_type", "eq", "");

  if (priorityTickers.length === 0) {
    const { data } = await base.order("filed_at", { ascending: false }).limit(limit);
    return data ?? [];
  }

  const { data: priority } = await base
    .in("ticker", priorityTickers)
    .order("filed_at", { ascending: false })
    .limit(limit);

  const priorityRows = priority ?? [];
  const remaining = limit - priorityRows.length;
  if (remaining <= 0) return priorityRows;

  const { data: fill } = await adminClient
    .from("filings")
    .select("id, ticker, form_type, url")
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

  const priorityLimit = Math.max(limit - MIN_GENERAL_NEWS_SLOTS, 0);
  const { data: priority } = await base
    .in("ticker", priorityTickers)
    .order("published_at", { ascending: false })
    .limit(priorityLimit);

  const priorityRows = priority ?? [];
  const remaining = limit - priorityRows.length;
  if (remaining <= 0) return priorityRows;

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

async function fetchTickerNames(adminClient: AdminClient, tickers: string[]): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  if (tickers.length === 0) return nameMap;

  const { data } = await adminClient
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", tickers);

  for (const t of data ?? []) {
    nameMap.set(t.ticker, (t.name_kr as string | null) ?? (t.name_en as string) ?? t.ticker);
  }
  return nameMap;
}

// 원문을 fetch해 Haiku로 요약하는 form_type. 그 외(Form 4, S-1, DEF 14A 등)는
// buildFilingSummary 템플릿을 그대로 사용한다.
const FILING_TEXT_FORM_TYPES = new Set(["8-K", "10-K", "10-Q"]);

function buildFilingHaikuPrompt(formType: string, ticker: string, companyName: string, body: string): string {
  const lengthRule = formType === "8-K" ? "분량: 3~5문장, 200자 내외" : "분량: 4~6문장, 300자 내외";
  const docLabel =
    formType === "8-K" ? "SEC 8-K(주요 경영 이벤트 보고서) 본문" :
    formType === "10-K" ? "SEC 10-K(연간 실적 보고서) 중 경영진 논의 및 분석(MD&A) 구간" :
    "SEC 10-Q(분기 실적 보고서) 중 경영진 논의 및 분석(MD&A) 구간";

  return `다음은 ${ticker}(${companyName})가 제출한 ${docLabel} 원문입니다. 한국어로 요약해주세요.

원칙
- 원문에 명시된 사실만 서술하세요.
- 분석, 해설, 의견, 전망은 추가하지 마세요.
- "~했습니다", "~발표했습니다" 형태의 사실 서술체로만 작성하세요.
- 투자 판단과 관련된 표현은 중립적으로 서술하세요.
- ${lengthRule}
- plain text로만 응답하고 마크다운 기호(#, **, - 등)는 사용하지 마세요.

원문:
${body}`;
}

/**
 * 공시 1건의 summary_kr을 결정한다. 8-K/10-K/10-Q는 SEC 원문을 fetch해 Haiku로
 * 요약하고(원문은 저장하지 않고 버림), 그 외 form_type은 기존 템플릿을 사용한다.
 * 원문 fetch 실패 또는 Haiku 호출 실패 시 null을 반환해 호출자가 스킵(재시도
 * 대상으로 summary_kr을 null로 남김) 처리하도록 한다.
 */
async function resolveFilingSummary(
  ticker: string,
  companyName: string,
  formType: string,
  url: string | null
): Promise<string | null> {
  if (!FILING_TEXT_FORM_TYPES.has(formType) || !url) {
    return buildFilingSummary(ticker, companyName, formType);
  }

  const body = await fetchFilingBodyForSummary(url, formType);
  if (!body) return null;

  const prompt = buildFilingHaikuPrompt(formType, ticker, companyName, body);
  const summary = await callHaiku(prompt, formType === "8-K" ? 300 : 400);
  return summary ? summary.trim() : null;
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 공시 요약. 8-K/10-K/10-Q는 SEC 원문을 fetch해 Haiku로 사실 서술 요약을
 * 생성하고, 그 외 form_type은 ticker+form_type+회사명 템플릿을 그대로 쓴다.
 */
export async function summarizeFilings(
  adminClient: AdminClient,
  { limit = FILING_SUMMARY_BATCH_LIMIT, priorityTickers = [] }: SummarizeOpts = {}
): Promise<{ done: number; failed: number }> {
  const rows = await fetchFilingRows(adminClient, limit, priorityTickers);
  if (!rows.length) return { done: 0, failed: 0 };

  const uniqueTickers = [...new Set(rows.map((r) => r.ticker).filter(Boolean))];
  const nameMap = await fetchTickerNames(adminClient, uniqueTickers);

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const companyName = nameMap.get(row.ticker) ?? row.ticker;
    const summary = await resolveFilingSummary(row.ticker, companyName, row.form_type, row.url ?? null);
    if (!summary) { failed++; continue; }

    const { error } = await adminClient
      .from("filings")
      .update({ summary_kr: summary })
      .eq("id", row.id);

    error ? failed++ : done++;
  }

  return { done, failed };
}

// 온디맨드(신규 와치리스트 종목 등록) 트리거가 한 번에 처리하는 최대 공시 수.
// EDGAR 30일 조회 범위 안에서 8-K/10-K/10-Q 건수는 종목당 이 값을 넘기지 않는
// 것이 일반적이며, maxDuration(300초) 내에서 안전하게 끝나도록 상한을 둔다.
const ON_DEMAND_FILING_LIMIT = 40;

/**
 * 신규 와치리스트 종목 등록 시 collectTickerData()가 공시를 upsert한 직후
 * 호출된다. 방금 수집된(또는 이전에 요약이 비어 있던) 해당 종목 공시만 대상으로
 * 즉시 요약을 생성해, 사용자가 새로고침 없이 화면에서 바로 요약을 볼 수 있게 한다.
 */
export async function summarizeFilingsForTicker(
  adminClient: AdminClient,
  ticker: string,
  limit = ON_DEMAND_FILING_LIMIT
): Promise<{ done: number; failed: number }> {
  const { data: rows } = await adminClient
    .from("filings")
    .select("id, ticker, form_type, url")
    .eq("ticker", ticker)
    .is("summary_kr", null)
    .not("form_type", "eq", "")
    .order("filed_at", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) return { done: 0, failed: 0 };

  const nameMap = await fetchTickerNames(adminClient, [ticker]);
  const companyName = nameMap.get(ticker) ?? ticker;

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const summary = await resolveFilingSummary(ticker, companyName, row.form_type, row.url ?? null);
    if (!summary) { failed++; continue; }

    const { error } = await adminClient
      .from("filings")
      .update({ summary_kr: summary })
      .eq("id", row.id);

    error ? failed++ : done++;
  }

  return { done, failed };
}

/**
 * 뉴스 요약 — Claude Haiku 사용.
 * 원칙: 헤드라인 팩트만, 분석/의견/전망 금지, 사실 서술체, plain text.
 */
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

/**
 * 기업 개요(영문) 한국어 요약 — Claude Haiku 사용.
 * 원칙: 개요에 명시된 사실만, 투자 권유 표현 배제, 사실 서술체, 200자 이내에서 문장 완결.
 * 결과는 tickers.description_kr에 저장.
 */
export async function summarizeCompanyDescription(
  ticker: string,
  descriptionEn: string
): Promise<{ ok: boolean; error?: string }> {
  const prompt = `다음은 ${ticker}의 영문 기업 개요입니다. 한국어로 요약해주세요.

원칙
- 개요에 명시된 사실만 서술하세요.
- 분석, 해설, 의견, 전망, 투자 권유 표현은 추가하지 마세요.
- "~합니다", "~제공합니다" 형태의 사실 서술체로만 작성하세요.
- 분량: 200자 이내에서 문장이 완전히 끝나도록 요약하세요. 문장 중간에 잘리지 않고 마침표(。또는 .)로 끝나야 합니다.
- 반드시 완성된 문장으로 끝내야 하며, 200자를 넘기더라도 마지막 문장은 완전히 마무리하세요.
- plain text로만 응답하고 마크다운 기호(#, **, - 등)는 사용하지 마세요.

영문 개요: ${descriptionEn}`;

  const summary = await callHaiku(prompt, 400);
  if (!summary) return { ok: false, error: "Haiku 호출 실패" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("tickers")
    .update({ description_kr: summary.trim() })
    .eq("ticker", ticker);

  return error ? { ok: false, error: error.message } : { ok: true };
}
