import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

// 티커플로우 스크리너 2단계 — 재무 품질 팩터(매출성장률 YoY, EPS성장률 YoY, FCF,
// ROIC/ROE) 원시 데이터 수집. 이 단계는 financial_metrics에 원시값만 저장하며,
// weights.ts/scoring.ts의 revenueGrowth/epsGrowth/fcf/roic 활성화(가중치 반영)는
// 포함하지 않는다 (CLAUDE.md 18항).

const FMP_BASE = "https://financialmodelingprep.com";
const DELAY_MS = 300;
const MAX_TICKERS = 30;
// 최소 5개 분기 요건(작업지시) + YoY 계산에 전년 동기가 필요하므로 8분기(2년) 확보
const QUARTERS_LIMIT = 8;
const MIN_QUARTERS = 5;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// FMP stable 엔드포인트 실응답 확인 완료 (2026-07 기준, AAPL 대상 직접 호출 검증)
// - /stable/income-statement?symbol=&period=quarter : revenue, eps, filingDate, acceptedDate, fiscalYear, period
// - /stable/cash-flow-statement?symbol=&period=quarter : operatingCashFlow, capitalExpenditure, filingDate, acceptedDate
// - /stable/key-metrics?symbol=&period=quarter : returnOnInvestedCapital, returnOnEquity
// - /stable/profile?symbol= : currency

interface FmpIncomeStatement {
  date: string;
  fiscalYear?: string | number | null;
  period?: string | null;
  filingDate?: string | null;
  acceptedDate?: string | null;
  revenue?: number | null;
  eps?: number | null;
}

interface FmpCashFlowStatement {
  date: string;
  filingDate?: string | null;
  acceptedDate?: string | null;
  operatingCashFlow?: number | null;
  capitalExpenditure?: number | null;
}

interface FmpKeyMetrics {
  date: string;
  returnOnInvestedCapital?: number | null;
  returnOnEquity?: number | null;
}

interface FmpProfile {
  currency?: string | null;
}

type FailedTicker = { ticker: string; reason: string };

function toInt(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return isNaN(n) ? null : n;
}

async function fetchJsonArray<T>(url: string): Promise<T[] | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const raw = await res.json();
  return Array.isArray(raw) ? (raw as T[]) : null;
}

export async function runFinancialsCollect(): Promise<CollectResult> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return { ok: false, error: "FMP_API_KEY 없음", retryable: false };

  const admin = createAdminClient();
  // financial_metrics는 생성된 Supabase 타입에 없는 신규 테이블 — any 캐스트 사용 (CLAUDE.md 16번 규칙)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any;
  const d7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // 수집 대상: 와치리스트 + 최근 7일 공시 종목 (price-targets.ts와 동일 패턴).
  // 전체 tickers 확장은 API 호출량(종목당 4콜)을 고려해 이번 단계에서는 보류.
  const [watchlistRes, filingsRes] = await Promise.all([
    admin.from("watchlist").select("ticker"),
    admin.from("filings").select("ticker").gte("filed_at", d7).limit(500),
  ]);

  const tickerSet = new Set<string>();
  for (const w of (watchlistRes.data ?? [])) tickerSet.add(w.ticker);
  for (const f of (filingsRes.data ?? []) as { ticker: string }[]) {
    if (f.ticker) tickerSet.add(f.ticker);
  }

  const tickers = Array.from(tickerSet).slice(0, MAX_TICKERS);
  if (tickers.length === 0) {
    return { ok: true, total: 0, updated: 0, skipped: 0, failed: 0, failedTickers: [] };
  }

  let upserted = 0;
  let skipped = 0;
  // 이번 실행에서만 유효한 임시 실행 로그 — financial_metrics에는 저장하지 않는다.
  // 장기 이력이 필요해지면 별도 collect_logs 계열 테이블에서 관리한다 (financial_metrics는
  // 재무 데이터 전용 테이블이지 실행 로그 테이블이 아니다).
  const failedTickers: FailedTicker[] = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    try {
      const [income, cashFlow, keyMetrics, profile] = await Promise.all([
        fetchJsonArray<FmpIncomeStatement>(
          `${FMP_BASE}/stable/income-statement?symbol=${ticker}&period=quarter&limit=${QUARTERS_LIMIT}&apikey=${apiKey}`
        ),
        fetchJsonArray<FmpCashFlowStatement>(
          `${FMP_BASE}/stable/cash-flow-statement?symbol=${ticker}&period=quarter&limit=${QUARTERS_LIMIT}&apikey=${apiKey}`
        ),
        fetchJsonArray<FmpKeyMetrics>(
          `${FMP_BASE}/stable/key-metrics?symbol=${ticker}&period=quarter&limit=${QUARTERS_LIMIT}&apikey=${apiKey}`
        ),
        fetchJsonArray<FmpProfile>(`${FMP_BASE}/stable/profile?symbol=${ticker}&apikey=${apiKey}`),
      ]);

      if (!income || income.length === 0) {
        failedTickers.push({ ticker, reason: "손익계산서 데이터 없음" });
        skipped++;
        continue;
      }
      if (income.length < MIN_QUARTERS) {
        failedTickers.push({ ticker, reason: `분기 데이터 부족 (${income.length}/${MIN_QUARTERS})` });
        skipped++;
        continue;
      }
      if (!cashFlow || cashFlow.length === 0) {
        failedTickers.push({ ticker, reason: "현금흐름표 데이터 없음" });
        skipped++;
        continue;
      }

      const currency = profile?.[0]?.currency ?? null;
      const cashFlowByDate = new Map(cashFlow.map((c) => [c.date, c]));
      const keyMetricsByDate = new Map((keyMetrics ?? []).map((k) => [k.date, k]));
      // 전년 동기 조회 — 배열 위치(+4) 대신 fiscalYear-period 키로 매칭해 분기 누락에 안전하게 대응
      const incomeByFiscalKey = new Map(
        income.map((row) => [`${toInt(row.fiscalYear)}-${row.period}`, row])
      );

      let tickerUpserted = 0;
      const tickerRowErrors: string[] = [];

      for (const row of income) {
        const cf = cashFlowByDate.get(row.date);
        if (!cf) continue; // 해당 분기 현금흐름 데이터가 없으면 그 분기만 스킵

        const fiscalYear = toInt(row.fiscalYear);
        const priorYear =
          fiscalYear != null ? incomeByFiscalKey.get(`${fiscalYear - 1}-${row.period}`) : undefined;

        const revenueGrowthYoy =
          priorYear?.revenue != null && row.revenue != null && priorYear.revenue !== 0
            ? ((row.revenue - priorYear.revenue) / Math.abs(priorYear.revenue)) * 100
            : null;
        const epsGrowthYoy =
          priorYear?.eps != null && row.eps != null && priorYear.eps !== 0
            ? ((row.eps - priorYear.eps) / Math.abs(priorYear.eps)) * 100
            : null;

        const operatingCashFlow = cf.operatingCashFlow ?? null;
        const capitalExpenditure = cf.capitalExpenditure ?? null;
        const fcf =
          operatingCashFlow != null && capitalExpenditure != null
            ? operatingCashFlow + capitalExpenditure
            : null;

        const km = keyMetricsByDate.get(row.date);
        const sourceUpdatedAt =
          row.acceptedDate ?? cf.acceptedDate ?? row.filingDate ?? cf.filingDate ?? null;

        // 해당 period_end 단일 분기 객체만 저장 (배열 전체 저장 금지)
        const rawPayload = { income: row, cashFlow: cf, keyMetrics: km ?? null };

        const dbRow = {
          ticker,
          period_type: "quarter",
          period_end: row.date,
          fiscal_year: fiscalYear,
          fiscal_period: row.period ?? null,
          currency,
          revenue: row.revenue ?? null,
          eps: row.eps ?? null,
          operating_cash_flow: operatingCashFlow,
          capital_expenditure: capitalExpenditure,
          revenue_growth_yoy: revenueGrowthYoy,
          eps_growth_yoy: epsGrowthYoy,
          fcf,
          roic: km?.returnOnInvestedCapital ?? null,
          roe: km?.returnOnEquity ?? null,
          raw_payload: rawPayload,
          source_updated_at: sourceUpdatedAt,
        };

        // 항상 전체 컬럼을 포함한 단일 upsert — 기존 행이 있어도 부분 UPDATE 하지 않는다.
        const { error } = await adminAny
          .from("financial_metrics")
          .upsert(dbRow, { onConflict: "ticker,period_type,period_end" });

        if (error) {
          tickerRowErrors.push(`${row.date}: ${error.message}`);
        } else {
          tickerUpserted++;
        }
      }

      if (tickerUpserted > 0) {
        upserted += tickerUpserted;
      } else {
        failedTickers.push({
          ticker,
          reason: tickerRowErrors.length > 0 ? tickerRowErrors.join("; ") : "저장 가능한 분기 없음",
        });
        skipped++;
      }
    } catch (err) {
      failedTickers.push({
        ticker,
        reason: err instanceof Error ? err.message : "알 수 없는 오류",
      });
      skipped++;
    }

    if (i < tickers.length - 1) await delay(DELAY_MS);
  }

  return {
    ok: true,
    total: tickers.length,
    updated: upserted,
    skipped,
    failed: failedTickers.length,
    failedTickers,
  };
}
