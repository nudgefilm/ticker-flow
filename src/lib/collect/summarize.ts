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
 * Haiku 호출 없이 코드에서 직접 생성
 */
function buildFilingSummary(ticker: string, companyName: string, formType: string): string {
  const info = FORM_TYPE_INFO[formType];
  const displayLabel  = info?.displayLabel  ?? formType;
  const koreanName    = info?.koreanName    ?? formType;
  const objParticle   = info?.objectParticle ?? "를";
  const subjParticle  = subjectParticle(companyName);
  return `${ticker}(${companyName})${subjParticle} ${displayLabel}(${koreanName})${objParticle} 제출했습니다.`;
}

// ─── Anthropic Haiku 호출 (뉴스 전용) ─────────────────────────────────────────

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
    .select("id, ticker, form_type")
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
    .select("id, ticker, form_type")
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

  const { data: priority } = await base
    .in("ticker", priorityTickers)
    .order("published_at", { ascending: false })
    .limit(limit);

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

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 공시 요약 — Haiku 미사용.
 * ticker + form_type + tickers 테이블 회사명으로 문자열 직접 생성.
 * 예: "NVDA(엔비디아)가 8-K(주요 경영 이벤트 보고서)를 제출했습니다."
 */
export async function summarizeFilings(
  adminClient: AdminClient,
  { limit = BATCH_LIMIT, priorityTickers = [] }: SummarizeOpts = {}
): Promise<{ done: number; failed: number }> {
  const rows = await fetchFilingRows(adminClient, limit, priorityTickers);
  if (!rows.length) return { done: 0, failed: 0 };

  // 배치 내 고유 ticker로 회사명 일괄 조회
  const uniqueTickers = [...new Set(rows.map((r) => r.ticker).filter(Boolean))];
  const { data: tickerRows } = await adminClient
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", uniqueTickers);

  const nameMap = new Map<string, string>();
  for (const t of tickerRows ?? []) {
    nameMap.set(t.ticker, (t.name_kr as string | null) ?? (t.name_en as string) ?? t.ticker);
  }

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    const companyName = nameMap.get(row.ticker) ?? row.ticker;
    const summary = buildFilingSummary(row.ticker, companyName, row.form_type);

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
