import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const SONNET_MODEL = "claude-sonnet-4-6";

// ─── FMP 응답 타입 ─────────────────────────────────────────────────────────────

interface FmpTranscriptDate {
  date: string;
  quarter: number;
  fiscalYear: number; // API 실제 필드명 (year 아님)
}

interface FmpTranscript {
  symbol: string;
  period: string; // API 실제 필드명 (예: "Q2"), quarter(number) 아님
  year: number;
  date: string;
  content: string;
}

// ─── Finnhub 응답 타입 (EPS·매출 보완용) ──────────────────────────────────────

interface FinnhubEarningsEntry {
  actual: number | null;
  estimate: number | null;
  period: string;
  quarter: number;
  year: number;
  revenueActual?: number | null;
  revenueEstimate?: number | null;
}

// ─── Claude 분석 결과 타입 ─────────────────────────────────────────────────────

interface CallAnalysis {
  headline_summary: string;
  guidance_direction: "up" | "maintain" | "down";
  guidance_summary: string;
  keywords: string[];
  key_statements: { text: string; role: string }[];
  qa_pairs: { question: string; answer: string }[];
  keyword_changes: { keyword: string; direction: "up" | "down" }[];
  tone_previous: string;
  tone_current: string;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "";
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${Math.round(val / 1_000_000)}M`;
  return `$${val.toFixed(2)}`;
}

// ─── FMP API 호출 ─────────────────────────────────────────────────────────────

async function fetchTranscriptDates(
  ticker: string,
  apiKey: string
): Promise<FmpTranscriptDate[]> {
  try {
    const url = `https://financialmodelingprep.com/stable/earning-call-transcript-dates?symbol=${ticker}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data as FmpTranscriptDate[];
  } catch {
    return [];
  }
}

async function fetchTranscript(
  ticker: string,
  year: number,
  quarter: number,
  apiKey: string
): Promise<FmpTranscript | null> {
  try {
    const url = `https://financialmodelingprep.com/stable/earning-call-transcript?symbol=${ticker}&year=${year}&quarter=${quarter}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const t = data[0] as FmpTranscript;
    if (!t.content || t.content.trim().length === 0) return null;
    return t;
  } catch {
    return null;
  }
}

// ─── Finnhub API 호출 (EPS·매출 보완용) ──────────────────────────────────────

async function fetchEarnings(
  ticker: string,
  apiKey: string
): Promise<FinnhubEarningsEntry | null> {
  try {
    const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&limit=4&token=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data: FinnhubEarningsEntry[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0]; // 가장 최근 분기
  } catch {
    return null;
  }
}

// ─── Claude Sonnet 구조화 분석 ─────────────────────────────────────────────────

async function analyzeWithSonnet(
  transcript: string,
  ticker: string
): Promise<CallAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `다음은 ${ticker}의 어닝콜(실적 발표 컨퍼런스콜) 전문입니다. 아래 JSON 형식으로만 응답하세요.

규칙:
- 공시·스크립트에 명시된 사실만 서술합니다
- "~라고 밝혔습니다", "~라고 설명했습니다" 형태의 사실 서술체로만 작성합니다
- 투자 의견, 전망 평가, 해석, "긍정적", "호재", "매수" 등 표현은 절대 사용하지 않습니다
- 한국어로 작성합니다
- plain JSON만 응답합니다. 마크다운 기호(#, **, -, \`\`\` 등) 사용 금지

{
  "headline_summary": "2~3문장 핵심 요약 (사실 서술체)",
  "guidance_direction": "up 또는 maintain 또는 down",
  "guidance_summary": "가이던스 내용 요약 2문장",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5", "키워드6", "키워드7", "키워드8"],
  "key_statements": [
    {"text": "발언 요약 (사실 서술체)", "role": "CEO"},
    {"text": "발언 요약 (사실 서술체)", "role": "CFO"}
  ],
  "qa_pairs": [
    {"question": "질문 요약", "answer": "답변 요약"},
    {"question": "질문 요약", "answer": "답변 요약"},
    {"question": "질문 요약", "answer": "답변 요약"},
    {"question": "질문 요약", "answer": "답변 요약"},
    {"question": "질문 요약", "answer": "답변 요약"},
    {"question": "질문 요약", "answer": "답변 요약"}
  ],
  "keyword_changes": [
    {"keyword": "키워드", "direction": "up 또는 down"}
  ],
  "tone_previous": "중립 또는 긍정 또는 부정",
  "tone_current": "중립 또는 긍정 또는 부정"
}

어닝콜 전문:
${transcript.slice(0, 80_000)}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: SONNET_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      console.error(`[collect/calls] Sonnet error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    return JSON.parse(match[0]) as CallAnalysis;
  } catch (err) {
    console.error("[collect/calls] Sonnet failed:", err);
    return null;
  }
}

// ─── 종목별 수집 ────────────────────────────────────────────────────────────────

async function collectForTicker(
  ticker: string,
  fmpKey: string,
  finnhubKey: string | undefined,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<{ inserted: number; skipped: number; error?: string }> {
  // ① Transcript 날짜 목록 조회
  const dates = await fetchTranscriptDates(ticker, fmpKey);
  if (dates.length === 0) {
    console.log(`[collect/calls] ${ticker}: transcript 날짜 없음, skip`);
    return { inserted: 0, skipped: 1 };
  }

  // 가장 최근 1건
  const latest = dates[0];
  const fiscalQ = latest.quarter;
  const fiscalY = latest.fiscalYear;
  const quarter = `Q${fiscalQ} FY${fiscalY}`;

  // ② 이미 수집된 경우 skip
  const { data: existing } = await (adminClient as any)
    .from("earnings_calls")
    .select("id")
    .eq("ticker", ticker)
    .eq("quarter", quarter)
    .maybeSingle();

  if (existing) {
    console.log(`[collect/calls] ${ticker} ${quarter}: 이미 존재, skip`);
    return { inserted: 0, skipped: 1 };
  }

  // ③ Transcript 전문 조회
  const transcript = await fetchTranscript(ticker, fiscalY, fiscalQ, fmpKey);
  if (!transcript) {
    console.log(`[collect/calls] ${ticker}: transcript 내용 없음, skip`);
    return { inserted: 0, skipped: 1 };
  }

  // ④ Claude Sonnet 구조화 분석
  const analysis = await analyzeWithSonnet(transcript.content, ticker);
  if (!analysis) {
    return { inserted: 0, skipped: 1, error: "Sonnet 분석 실패" };
  }

  // ⑤ Finnhub EPS·매출 보완 (optional)
  let epsActual = "";
  let epsEstimate = "";
  let revenueActual = "";
  let revenueEstimate = "";
  let surprisePercent = 0;

  if (finnhubKey) {
    const earningsData = await fetchEarnings(ticker, finnhubKey);
    if (earningsData) {
      epsActual = earningsData.actual != null ? String(earningsData.actual) : "";
      epsEstimate = earningsData.estimate != null ? String(earningsData.estimate) : "";
      revenueActual = formatCurrency(earningsData.revenueActual);
      revenueEstimate = formatCurrency(earningsData.revenueEstimate);
      if (
        earningsData.actual != null &&
        earningsData.estimate != null &&
        earningsData.estimate !== 0
      ) {
        surprisePercent =
          ((earningsData.actual - earningsData.estimate) /
            Math.abs(earningsData.estimate)) *
          100;
      }
    }
  }

  // call_date: FMP가 제공하는 실제 날짜 사용
  const callDate = transcript.date ?? `${fiscalY}-12-31`;

  // key_points: 기존 page.tsx 호환용
  const keyPoints = {
    revenue_actual: revenueActual,
    revenue_estimate: revenueEstimate,
    eps_actual: epsActual,
    eps_estimate: epsEstimate,
    surprise_percent: surprisePercent,
    guidance_direction: analysis.guidance_direction,
    guidance_previous: "maintain",
    guidance_summary: analysis.guidance_summary,
    keywords: analysis.keywords,
    key_statements: analysis.key_statements,
    qa_pairs: analysis.qa_pairs,
    keyword_changes: analysis.keyword_changes,
    tone_previous: analysis.tone_previous,
    tone_current: analysis.tone_current,
    has_earnings_release: true,
  };

  // ⑥ Upsert
  const { error } = await (adminClient as any)
    .from("earnings_calls")
    .upsert(
      {
        ticker,
        fiscal_quarter: fiscalQ,
        fiscal_year: fiscalY,
        quarter,
        call_date: callDate,
        headline_summary: analysis.headline_summary,
        guidance_direction: analysis.guidance_direction,
        guidance_previous: "maintain",
        guidance_summary: analysis.guidance_summary,
        revenue_actual: revenueActual,
        revenue_estimate: revenueEstimate,
        eps_actual: epsActual,
        eps_estimate: epsEstimate,
        surprise_percent: surprisePercent,
        keywords: analysis.keywords,
        key_statements: analysis.key_statements,
        qa_pairs: analysis.qa_pairs,
        keyword_changes: analysis.keyword_changes,
        tone_previous: analysis.tone_previous,
        tone_current: analysis.tone_current,
        has_earnings_release: true,
        source_url: `https://financialmodelingprep.com/financial-statements/${ticker}`,
        transcript_url: `https://financialmodelingprep.com/financial-statements/${ticker}`,
        summary_generated_at: new Date().toISOString(),
        // 기존 컬럼 호환
        summary_kr: analysis.headline_summary,
        tone_change: analysis.tone_current,
        key_points: keyPoints,
        processed_at: new Date().toISOString(),
      },
      { onConflict: "ticker,quarter" }
    );

  if (error) {
    console.error(`[collect/calls] ${ticker} upsert 실패:`, error.message);
    return { inserted: 0, skipped: 1, error: error.message };
  }

  console.log(`[collect/calls] ${ticker} ${quarter} 저장 완료`);
  return { inserted: 1, skipped: 0 };
}

// ─── 메인 수집 함수 ────────────────────────────────────────────────────────────

export async function runCallsCollect(): Promise<CollectResult> {
  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) {
    return { ok: false, error: "FMP_API_KEY not set", retryable: false };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY not set", retryable: false };
  }

  const finnhubKey = process.env.FINNHUB_API_KEY; // EPS·매출 보완용 (optional)

  const adminClient = createAdminClient();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // 수집 대상: watchlist 종목 + 최근 90일 내 실적 발표 종목
  const [watchlistRes, earningsRes] = await Promise.all([
    adminClient.from("watchlist").select("ticker"),
    adminClient
      .from("earnings")
      .select("ticker")
      .gte("report_date", ninetyDaysAgo),
  ]);

  const tickerSet = new Set<string>();
  for (const r of watchlistRes.data ?? []) tickerSet.add(r.ticker);
  for (const r of earningsRes.data ?? []) tickerSet.add(r.ticker);

  const tickers = [...tickerSet].slice(0, 10);

  if (tickers.length === 0) {
    return { ok: true, total: 0, inserted: 0, skipped: 0, errors: 0 };
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let firstError: string | undefined;

  for (const ticker of tickers) {
    const { inserted, skipped, error } = await collectForTicker(
      ticker,
      fmpKey,
      finnhubKey,
      adminClient
    );
    totalInserted += inserted;
    totalSkipped += skipped;
    if (error && !firstError) firstError = `${ticker}: ${error}`;
    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return {
    ok: true,
    total: tickers.length,
    inserted: totalInserted,
    skipped: totalSkipped,
    errors: totalSkipped,
    ...(firstError && { firstError }),
  };
}
