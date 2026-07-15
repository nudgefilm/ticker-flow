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
// 공시 요약(summarizeFilings)은 2026-07-15부터 8-K/10-K/10-Q/S-1/DEF14A에 대해
// SEC 원문 fetch + Haiku 호출을 1건마다 수행해 news보다 건당 처리 시간이 길다
// (10-K 원문은 수 MB에 달할 수 있음). 2026-07-16 max_tokens 상향(문장 잘림
// 방지, 10-K/10-Q 400→650)으로 건당 응답 생성 시간도 늘어나, /api/collect/filings의
// maxDuration(300초) 안에서 EFTS 전체수집 시간까지 더해도 안전하도록
// BATCH_LIMIT(40)보다 낮은 값을 쓴다.
const FILING_SUMMARY_BATCH_LIMIT = 15;

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
    .select("id, ticker, form_type, url, filed_at")
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
    .select("id, ticker, form_type, url, filed_at")
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

// 원문을 fetch해 Haiku로 요약하는 form_type. Form 4는 insider_trades 구조화
// 데이터 기반(별도 경로, resolveFilingSummary 참고)이라 여기 포함하지 않는다.
// 그 외(S-1, DEF 14A 미매칭 등)는 buildFilingSummary 템플릿을 그대로 사용한다.
const FILING_TEXT_FORM_TYPES = new Set(["8-K", "10-K", "10-Q", "S-1", "DEF 14A", "DEF14A"]);

// form_type별 Haiku max_tokens. 2026-07-16: 8-K 300/10-K·10-Q 400이 부족해
// 문장이 완결되지 못한 채 잘리는 사례(OTLC 등)가 확인되어 여유있게 상향.
const HAIKU_MAX_TOKENS: Record<string, number> = {
  "8-K": 500,
  "10-K": 650,
  "10-Q": 650,
  "S-1": 500,
  "DEF 14A": 500,
  "DEF14A": 500,
};

function endsWithSentenceTerminator(text: string): boolean {
  return /[.!?]\s*$/.test(text);
}

// 문장 종결로 인정하는 위치: . ! ? 뒤에 공백 또는 문자열 끝이 와야 한다.
// 금액/퍼센트 같은 소수점("2.28달러")은 마침표 뒤에 숫자가 바로 붙어 제외되고,
// "Inc.는"처럼 한글이 공백 없이 바로 붙는 축약형도 같은 이유로 제외된다 —
// lastIndexOf(".")만 쓰면 문장 끝이 아니라 소수점에서 잘못 잘리는 문제가 있었다.
const SENTENCE_END_RE = /[.!?](?=\s|$)/g;

/**
 * Haiku 응답이 문장 중간에서 끊긴 경우 마지막으로 완결된 문장까지만 남기고
 * 잘라낸다(불완전한 마지막 문장은 버림). 종결 부호(. ! ?)가 하나도 없다면
 * 첫 문장조차 끝내지 못한 것으로 보고 null을 반환해 호출자가 실패(재시도
 * 대상)로 처리하게 한다. 8-K/10-K/10-Q/S-1/DEF14A 요약 생성 경로 공통 유틸.
 */
function ensureCompleteSentences(text: string): string | null {
  const trimmed = text.trim();
  if (endsWithSentenceTerminator(trimmed)) return trimmed;

  const matches = [...trimmed.matchAll(SENTENCE_END_RE)];
  if (matches.length === 0) return null;

  const last = matches[matches.length - 1];
  if (typeof last.index !== "number") return null;

  return trimmed.slice(0, last.index + 1).trim();
}

function buildFilingHaikuPrompt(formType: string, ticker: string, companyName: string, body: string): string {
  const lengthRule =
    formType === "8-K" ? "최대 5문장 이내(1~5문장), 200자 내외" :
    formType === "10-K" || formType === "10-Q" ? "최대 5문장 이내(3~5문장), 300자 내외" :
    "최대 5문장 이내(1~5문장), 250자 내외";
  const docLabel =
    formType === "8-K" ? "SEC 8-K(주요 경영 이벤트 보고서) 본문" :
    formType === "10-K" ? "SEC 10-K(연간 실적 보고서) 중 경영진 논의 및 분석(MD&A) 구간" :
    formType === "10-Q" ? "SEC 10-Q(분기 실적 보고서) 중 경영진 논의 및 분석(MD&A) 구간" :
    formType === "S-1" ? "SEC S-1(증권신고서) 중 사업 개요/공모 개요 구간" :
    "SEC DEF 14A(주주총회 위임장 권유서) 중 안건 요약 구간";

  return `다음은 ${ticker}(${companyName})가 제출한 ${docLabel} 원문입니다. 한국어로 요약해주세요.

원칙
- 원문에 명시된 사실만 서술하세요.
- 분석, 해설, 의견, 전망은 추가하지 마세요.
- "~했습니다", "~발표했습니다" 형태의 사실 서술체로만 작성하세요.
- 투자 판단과 관련된 표현은 중립적으로 서술하세요.
- 분량: ${lengthRule}. 반드시 완성된 문장으로 끝내야 합니다(문장 중간에 자르지 말 것).
- plain text로만 응답하고 마크다운 기호(#, **, - 등)는 사용하지 마세요.

원문:
${body}`;
}

// ─── Form 4 — insider_trades 구조화 데이터 기반 사실 요약 (LLM 미사용) ────────

interface InsiderTradeForSummary {
  name: string | null;
  title: string | null;
  transaction_type: "buy" | "sell";
  shares: number | null;
  price: number | null;
  transaction_date: string | null;
}

/**
 * filings(form_type='4') 행과 insider_trades 행은 서로 다른 수집 파이프라인
 * (EDGAR 전문검색 vs Finnhub+Form4 XML 파싱)이라 FK가 없다. 두 테이블 모두
 * "SEC에 실제로 제출된 날짜"를 filed_at에 담고 있어(insider.ts가 Finnhub의
 * filingDate를 그대로 저장), ticker + filed_at 날짜(day) 일치로 연결한다.
 * 실측(2026-07-16): filings.form_type='4' 53건 중 31건(58%)이 이 방식으로
 * 매칭됨 — 나머지 42%는 insider_trades 수집 범위(INSIDER_LOOKBACK_DAYS,
 * MAX_TICKERS_PER_RUN 등)가 filings보다 좁아 매칭이 안 되는 정상적인 데이터
 * 갭이며, 이 경우 호출자가 기존 템플릿으로 폴백한다.
 */
async function fetchMatchingInsiderTrades(
  adminClient: AdminClient,
  ticker: string,
  filedAtIso: string
): Promise<InsiderTradeForSummary[]> {
  const dateOnly = filedAtIso.slice(0, 10);
  const { data } = await adminClient
    .from("insider_trades")
    .select("name, title, transaction_type, shares, price, transaction_date")
    .eq("ticker", ticker)
    .gte("filed_at", `${dateOnly}T00:00:00Z`)
    .lt("filed_at", `${dateOnly}T23:59:59Z`);

  return (data ?? []) as InsiderTradeForSummary[];
}

function formatShares(n: number): string {
  return Math.round(n).toLocaleString("ko-KR");
}

function formatPrice(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function formatTradeDate(dateStr: string): string {
  const m = dateStr.slice(5, 7);
  const d = dateStr.slice(8, 10);
  return `${Number(m)}월 ${Number(d)}일`;
}

/**
 * 같은 사람 + 같은 거래유형(매수/매도)의 여러 건은 한 문장으로 합쳐 총
 * 주식수와 가중평균 단가로 서술한다(예: 같은 날 2건 매도한 경우). 값(주식수
 * ×단가) 기준 상위 5명까지만 문장으로 남긴다(카드 5문장 제한).
 */
function buildForm4SummaryFromTrades(trades: InsiderTradeForSummary[]): string | null {
  const usable = trades.filter(
    (t): t is InsiderTradeForSummary & { name: string; shares: number } =>
      !!t.name && t.shares != null && t.shares > 0
  );
  if (usable.length === 0) return null;

  interface Group {
    name: string;
    title: string | null;
    type: "buy" | "sell";
    totalShares: number;
    valueSum: number;
    valueShares: number;
    count: number;
    dates: string[];
  }

  const groups = new Map<string, Group>();
  for (const t of usable) {
    const key = `${t.name}|${t.transaction_type}`;
    const g: Group = groups.get(key) ?? {
      name: t.name,
      title: t.title,
      type: t.transaction_type,
      totalShares: 0,
      valueSum: 0,
      valueShares: 0,
      count: 0,
      dates: [],
    };
    g.totalShares += t.shares;
    g.count += 1;
    if (t.price != null) {
      g.valueSum += t.shares * t.price;
      g.valueShares += t.shares;
    }
    if (t.transaction_date) g.dates.push(t.transaction_date);
    groups.set(key, g);
  }

  const sentences = [...groups.values()]
    .sort((a, b) => b.valueSum - a.valueSum)
    .slice(0, 5)
    .map((g) => {
      const who = g.title ? `${g.name}(${g.title})` : g.name;
      const verb = g.type === "buy" ? "매수했습니다" : "매도했습니다";
      const dateLabel = g.dates.length > 0 ? `${formatTradeDate([...g.dates].sort()[0])}에 ` : "";
      const avgPrice = g.valueShares > 0 ? g.valueSum / g.valueShares : null;
      const priceLabel =
        avgPrice != null ? `주당 ${g.count > 1 ? "약 " : ""}$${formatPrice(avgPrice)}에 ` : "";
      return `${who}가 ${dateLabel}${priceLabel}${formatShares(g.totalShares)}주를 ${verb}.`;
    });

  return sentences.join(" ");
}

// 원문 추출이 실패해 XBRL 메타데이터/태그 덤프 같은 비산문 텍스트가 Haiku에
// 입력으로 들어가면, Haiku가 "요약할 내용이 없다"는 취지의 완결된 문장으로
// 응답해 ensureCompleteSentences를 통과해버린다(2026-07-16 ARTW 10-Q에서
// 실제 확인). 이런 거절/사과성 응답을 카드에 그대로 노출하지 않도록 방어한다.
const REFUSAL_MARKERS = [
  "죄송하지만",
  "요약할 수 없습니다",
  "요약을 작성할 수 없습니다",
  "요약을 제공할 수 없습니다",
  "원문을 다시 제공",
  "다시 제공해",
  "실제 텍스트를 제공",
];

function looksLikeRefusal(text: string): boolean {
  return REFUSAL_MARKERS.some((marker) => text.includes(marker));
}

/**
 * 공시 1건의 summary_kr을 결정한다.
 * - Form 4: insider_trades 구조화 데이터로 사실 문장 생성(LLM 미사용). 매칭
 *   되는 거래가 없으면 기존 템플릿으로 폴백.
 * - 8-K/10-K/10-Q/S-1/DEF14A: SEC 원문을 fetch해 Haiku로 요약하고(원문은
 *   저장하지 않고 버림), 응답이 문장 중간에서 끊기면 마지막 완결 문장까지만
 *   저장한다(공통 유틸 ensureCompleteSentences).
 * - 그 외 form_type: 기존 템플릿을 사용한다.
 * 원문 fetch 실패, Haiku 호출 실패, 첫 문장도 못 끝낸 응답인 경우 null을
 * 반환해 호출자가 스킵(재시도 대상으로 summary_kr을 null로 남김) 처리하도록
 * 한다.
 */
async function resolveFilingSummary(
  adminClient: AdminClient,
  ticker: string,
  companyName: string,
  formType: string,
  url: string | null,
  filedAt: string | null
): Promise<string | null> {
  if (formType === "4") {
    if (filedAt) {
      const trades = await fetchMatchingInsiderTrades(adminClient, ticker, filedAt);
      const structured = buildForm4SummaryFromTrades(trades);
      if (structured) return structured;
    }
    return buildFilingSummary(ticker, companyName, formType);
  }

  if (!FILING_TEXT_FORM_TYPES.has(formType) || !url) {
    return buildFilingSummary(ticker, companyName, formType);
  }

  const body = await fetchFilingBodyForSummary(url, formType);
  if (!body) return null;

  const prompt = buildFilingHaikuPrompt(formType, ticker, companyName, body);
  const summary = await callHaiku(prompt, HAIKU_MAX_TOKENS[formType] ?? 500);
  if (!summary || looksLikeRefusal(summary)) return null;

  return ensureCompleteSentences(summary);
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
    const summary = await resolveFilingSummary(
      adminClient, row.ticker, companyName, row.form_type, row.url ?? null, row.filed_at ?? null
    );
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
    .select("id, ticker, form_type, url, filed_at")
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
    const summary = await resolveFilingSummary(
      adminClient, ticker, companyName, row.form_type, row.url ?? null, row.filed_at ?? null
    );
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
