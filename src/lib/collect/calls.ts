import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const SONNET_MODEL = "claude-sonnet-4-6";

// ─── FMP 응답 타입 ─────────────────────────────────────────────────────────────

interface FmpTranscriptDate {
  date: string;
  quarter: number;
  fiscalYear: number; // API 실제 필드명
}

interface FmpTranscript {
  symbol: string;
  period: string; // API 실제 필드명 (예: "Q2")
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
  management_tone?: "positive" | "neutral" | "negative";
}

// ─── 종목별 수집 결과 ──────────────────────────────────────────────────────────

interface TickerResult {
  inserted: number;
  skipped: number;
  error?: string;
  detail: string; // 단계별 상세 상태 (trigger 페이지 debug 블록에 표시)
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "";
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${Math.round(val / 1_000_000)}M`;
  return `$${val.toFixed(2)}`;
}

function maskKey(url: string, key: string): string {
  return url.replace(key, "***");
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
    return data[0];
  } catch {
    return null;
  }
}

// ─── Claude Sonnet 구조화 분석 ─────────────────────────────────────────────────

async function analyzeWithSonnet(
  transcript: string,
  ticker: string
): Promise<{ analysis: CallAnalysis | null; detail: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { analysis: null, detail: "ANTHROPIC_API_KEY 없음" };

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
${transcript.slice(0, 80_000)}

응답 마지막 줄에 반드시 아래 JSON 한 줄만 출력하라:
{"guidance_direction":"up|maintain|down","management_tone":"positive|neutral|negative"}
JSON 외 다른 텍스트 금지.`;

  try {
    console.log(`[calls] Sonnet 호출 시작 (transcript ${transcript.length}자)`);

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

    const body = await res.text();
    console.log(`[calls] Sonnet 응답 status=${res.status} body(200)=${body.slice(0, 200)}`);

    if (!res.ok) {
      return { analysis: null, detail: `Sonnet HTTP ${res.status}: ${body.slice(0, 120)}` };
    }

    let data: { content?: { text: string }[] };
    try {
      data = JSON.parse(body);
    } catch {
      return { analysis: null, detail: `Sonnet JSON parse 실패: ${body.slice(0, 120)}` };
    }

    const text = data?.content?.[0]?.text ?? "";

    // 마지막 줄에서 {guidance_direction, management_tone} 추출 시도
    const lines = text.trimEnd().split("\n");
    const lastLine = lines[lines.length - 1].trim();
    let extractedGuidance: "up" | "maintain" | "down" | null = null;
    let extractedTone: "positive" | "neutral" | "negative" | null = null;
    try {
      const lastJson = JSON.parse(lastLine) as Record<string, string>;
      if (["up", "maintain", "down"].includes(lastJson.guidance_direction ?? "")) {
        extractedGuidance = lastJson.guidance_direction as "up" | "maintain" | "down";
      }
      if (["positive", "neutral", "negative"].includes(lastJson.management_tone ?? "")) {
        extractedTone = lastJson.management_tone as "positive" | "neutral" | "negative";
      }
    } catch {
      // 마지막 줄이 JSON이 아닌 경우 무시
    }

    // 마지막 줄이 단독 JSON이었으면 제거 후 메인 JSON 블록 추출
    const textForMain = extractedGuidance || extractedTone
      ? lines.slice(0, -1).join("\n")
      : text;
    const match = textForMain.match(/\{[\s\S]*\}/);
    if (!match) {
      return { analysis: null, detail: `Sonnet JSON 블록 없음. 응답(200): ${text.slice(0, 200)}` };
    }

    try {
      const analysis = JSON.parse(match[0]) as CallAnalysis;
      // 마지막 줄 추출값 우선, 없으면 메인 JSON 값 유지
      if (extractedGuidance) analysis.guidance_direction = extractedGuidance;
      analysis.management_tone = extractedTone ?? undefined;
      return { analysis, detail: "Sonnet 분석 완료" };
    } catch {
      return { analysis: null, detail: `Sonnet JSON 파싱 실패: ${match[0].slice(0, 120)}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { analysis: null, detail: `Sonnet 예외: ${msg}` };
  }
}

// ─── 종목별 수집 ────────────────────────────────────────────────────────────────

async function collectForTicker(
  ticker: string,
  fmpKey: string,
  finnhubKey: string | undefined,
  adminClient: ReturnType<typeof createAdminClient>
): Promise<TickerResult> {
  // ① transcript 날짜 목록 조회
  const datesUrl = `https://financialmodelingprep.com/stable/earning-call-transcript-dates?symbol=${ticker}&apikey=${fmpKey}`;
  console.log(`[calls] ${ticker} ① dates → ${maskKey(datesUrl, fmpKey)}`);

  let datesStatus = 0;
  let datesBody = "";
  try {
    const datesRes = await fetch(datesUrl, { signal: AbortSignal.timeout(15_000) });
    datesStatus = datesRes.status;
    datesBody = await datesRes.text();
    console.log(`[calls] ${ticker} ① dates status=${datesStatus} body(200)=${datesBody.slice(0, 200)}`);

    if (!datesRes.ok) {
      return { inserted: 0, skipped: 1, detail: `dates HTTP ${datesStatus}: ${datesBody.slice(0, 100)}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[calls] ${ticker} ① dates 예외: ${msg}`);
    return { inserted: 0, skipped: 1, detail: `dates 예외: ${msg}` };
  }

  let dates: FmpTranscriptDate[];
  try {
    const parsed = JSON.parse(datesBody);
    dates = Array.isArray(parsed) ? (parsed as FmpTranscriptDate[]) : [];
  } catch {
    return { inserted: 0, skipped: 1, detail: `dates JSON parse 실패: ${datesBody.slice(0, 80)}` };
  }

  if (dates.length === 0) {
    return { inserted: 0, skipped: 1, detail: "transcript 날짜 없음 (빈 배열)" };
  }

  const latest = dates[0];
  const fiscalQ = latest.quarter;
  const fiscalY = latest.fiscalYear;
  const quarter = `Q${fiscalQ} FY${fiscalY}`;
  console.log(`[calls] ${ticker} ① 최신 분기: ${quarter} (date: ${latest.date})`);

  // ② 이미 수집된 경우 skip
  const { data: existing } = await (adminClient as any)
    .from("earnings_calls")
    .select("id")
    .eq("ticker", ticker)
    .eq("quarter", quarter)
    .maybeSingle();

  if (existing) {
    console.log(`[calls] ${ticker} ② 이미 존재: ${quarter}`);
    return { inserted: 0, skipped: 1, detail: `이미 존재 (${quarter})` };
  }

  // ③ transcript 전문 조회
  const txUrl = `https://financialmodelingprep.com/stable/earning-call-transcript?symbol=${ticker}&year=${fiscalY}&quarter=${fiscalQ}&apikey=${fmpKey}`;
  console.log(`[calls] ${ticker} ③ transcript → ${maskKey(txUrl, fmpKey)}`);

  let txStatus = 0;
  let txBody = "";
  try {
    const txRes = await fetch(txUrl, { signal: AbortSignal.timeout(15_000) });
    txStatus = txRes.status;
    txBody = await txRes.text();
    console.log(`[calls] ${ticker} ③ transcript status=${txStatus} body(200)=${txBody.slice(0, 200)}`);

    if (!txRes.ok) {
      return { inserted: 0, skipped: 1, detail: `transcript HTTP ${txStatus}: ${txBody.slice(0, 100)}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[calls] ${ticker} ③ transcript 예외: ${msg}`);
    return { inserted: 0, skipped: 1, detail: `transcript 예외: ${msg}` };
  }

  let txData: FmpTranscript[];
  try {
    const parsed = JSON.parse(txBody);
    txData = Array.isArray(parsed) ? (parsed as FmpTranscript[]) : [];
  } catch {
    return { inserted: 0, skipped: 1, detail: `transcript JSON parse 실패: ${txBody.slice(0, 80)}` };
  }

  if (txData.length === 0) {
    return { inserted: 0, skipped: 1, detail: `transcript 없음 (빈 배열, ${quarter})` };
  }

  const transcript = txData[0];
  if (!transcript.content || transcript.content.trim().length === 0) {
    return { inserted: 0, skipped: 1, detail: `transcript content 비어있음 (${quarter})` };
  }

  console.log(`[calls] ${ticker} ③ transcript 수신 완료 (${transcript.content.length}자)`);

  // ④ Claude Sonnet 구조화 분석
  const { analysis, detail: sonnetDetail } = await analyzeWithSonnet(transcript.content, ticker);
  if (!analysis) {
    return { inserted: 0, skipped: 0, error: sonnetDetail, detail: sonnetDetail };
  }
  console.log(`[calls] ${ticker} ④ Sonnet 완료`);

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

  const callDate = transcript.date ?? `${fiscalY}-12-31`;

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
  const payload = {
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
    summary_kr: analysis.headline_summary,
    tone_change: analysis.tone_current,
    management_tone: analysis.management_tone ?? null,
    key_points: keyPoints,
    processed_at: new Date().toISOString(),
  };

  console.log(`[calls] ${ticker} ⑥ upsert 시작 (onConflict: ticker,quarter = ${ticker},${quarter})`);

  const { error: upsertError } = await (adminClient as any)
    .from("earnings_calls")
    .upsert(payload, { onConflict: "ticker,quarter" });

  if (upsertError) {
    console.error(`[calls] ${ticker} ⑥ upsert 실패: ${upsertError.message} (code: ${upsertError.code})`);
    return {
      inserted: 0,
      skipped: 0,
      error: `upsert 실패: ${upsertError.message}`,
      detail: `upsert 실패 (code: ${upsertError.code}): ${upsertError.message}`,
    };
  }

  console.log(`[calls] ${ticker} ⑥ 저장 완료 (${quarter})`);
  return { inserted: 1, skipped: 0, detail: `저장 완료 (${quarter})` };
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

  const finnhubKey = process.env.FINNHUB_API_KEY;

  const adminClient = createAdminClient();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

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
  console.log(`[calls] 수집 대상 (${tickers.length}개): ${tickers.join(", ")}`);

  if (tickers.length === 0) {
    return { ok: true, total: 0, inserted: 0, skipped: 0, errors: 0 };
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let firstError: string | undefined;
  const tickerResults: Record<string, string> = {};

  for (const ticker of tickers) {
    const result = await collectForTicker(ticker, fmpKey, finnhubKey, adminClient);
    totalInserted += result.inserted;
    totalSkipped += result.skipped;
    if (result.error) {
      totalErrors++;
      if (!firstError) firstError = `${ticker}: ${result.error}`;
    }
    tickerResults[ticker] = result.detail;
    console.log(`[calls] ${ticker} 결과: ${result.detail}`);

    if (tickers.length > 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return {
    ok: true,
    total: tickers.length,
    inserted: totalInserted,
    skipped: totalSkipped,
    errors: totalErrors,
    ...(firstError && { firstError }),
    debug: tickerResults,
  };
}
