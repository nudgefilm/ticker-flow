/**
 * scripts/seed-financials.ts
 * 나스닥·뉴욕증권거래소 상장 종목의 분기 재무 데이터(매출/EPS/현금흐름/ROIC·ROE)를
 * FMP에서 수집해 financial_metrics 테이블에 백필하는 1회성 로컬 실행 스크립트.
 *
 * 배경: 주간 크론 /api/collect/financials 는 (와치리스트 + 최근 7일 공시) 최대 30종목만
 * 갱신하므로, 스크리너 후보 풀 대다수가 재무 팩터 null 상태였다. 이 스크립트로 전 후보
 * 풀을 1회 백필한 뒤, 이후 증분 갱신은 기존 크론이 담당한다(크론은 건드리지 않는다).
 *
 * 수집·계산 로직은 src/lib/collect/financials.ts 와 동일하게 맞춰, 크론이 만드는 행과
 * 완전히 같은 형태로 financial_metrics 에 upsert 한다(중복 실행해도 안전).
 *
 * 실행 (PowerShell):
 *   npx tsx scripts/seed-financials.ts
 *
 * 옵션 (환경변수):
 *   SEED_MIN_CAP=0            # 시총 하한(달러). 기본 300000000($300M, 스크리너 자격 필터와 동일).
 *                             #   0 으로 두면 시총 무관 전 NASDAQ/NYSE 종목 대상.
 *   SEED_ALL_EXCHANGES=1      # 거래소 필터 해제(OTC 등 포함, tickers 전체 대상).
 *   SEED_DELAY_MS=300         # 종목 간 딜레이(ms). 429(rate limit) 발생 시 값을 올린다.
 *   SEED_START_INDEX=0        # 중단 후 재개용 시작 인덱스(0-based). 대상 목록은 ticker 정렬 고정.
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── .env.local 수동 파싱 ──────────────────────────────────────────────────────
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error(".env.local 파일을 찾을 수 없습니다.");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const raw = trimmed.slice(eqIdx + 1).trim();
    const value = raw.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FMP_API_KEY = process.env.FMP_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FMP_API_KEY) {
  console.error("필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FMP_API_KEY");
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) as any;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── 옵션 ──────────────────────────────────────────────────────────────────────
const MIN_CAP = process.env.SEED_MIN_CAP != null ? Number(process.env.SEED_MIN_CAP) : 300_000_000;
const ALL_EXCHANGES = process.env.SEED_ALL_EXCHANGES === "1";
const DELAY_MS = process.env.SEED_DELAY_MS != null ? Number(process.env.SEED_DELAY_MS) : 300;
const START_INDEX = process.env.SEED_START_INDEX != null ? Number(process.env.SEED_START_INDEX) : 0;
const TARGET_EXCHANGES = new Set(["nasdaq", "nyse"]);
// 우선주·워런트·유닛·권리 등 비보통주 심볼 제외 (scoring.ts 자격 필터와 동일 규칙).
const NON_COMMON_STOCK = /-(WT[A-Z]?|U|R|RT|P[A-Z]?)$/;

// ── FMP 엔드포인트·상수 (financials.ts 와 동일) ────────────────────────────────
const FMP_BASE = "https://financialmodelingprep.com";
const QUARTERS_LIMIT = 8; // YoY 계산에 전년 동기 필요 → 2년(8분기) 확보
const MIN_QUARTERS = 5;

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

function toInt(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return isNaN(n) ? null : n;
}

async function fetchJsonArray<T>(url: string): Promise<T[] | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (res.status === 429) throw new Error("429 rate limit");
  if (!res.ok) return null;
  const raw = await res.json();
  return Array.isArray(raw) ? (raw as T[]) : null;
}

// ── financial_metrics 행 빌드 (financials.ts 로직과 동일) ──────────────────────
function buildRows(
  ticker: string,
  income: FmpIncomeStatement[],
  cashFlow: FmpCashFlowStatement[],
  keyMetrics: FmpKeyMetrics[] | null,
  currency: string | null,
  collectedAt: string
): Record<string, unknown>[] {
  const cashFlowByDate = new Map(cashFlow.map((c) => [c.date, c]));
  const keyMetricsByDate = new Map((keyMetrics ?? []).map((k) => [k.date, k]));
  const incomeByFiscalKey = new Map(
    income.map((row) => [`${toInt(row.fiscalYear)}-${row.period}`, row])
  );

  const rows: Record<string, unknown>[] = [];
  for (const row of income) {
    const cf = cashFlowByDate.get(row.date);
    if (!cf) continue; // 해당 분기 현금흐름 없으면 그 분기만 스킵

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

    rows.push({
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
      raw_payload: { income: row, cashFlow: cf, keyMetrics: km ?? null },
      source_updated_at: sourceUpdatedAt,
      collected_at: collectedAt,
    });
  }
  return rows;
}

// ── 대상 종목 조회 (PostgREST 1000행 제한 우회 + 거래소·시총 필터) ─────────────
async function fetchTargetTickers(): Promise<string[]> {
  const PAGE = 1000;
  const result: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("tickers")
      .select("ticker, exchange, market_cap")
      .order("ticker")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`tickers 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const r of data as { ticker: string; exchange: string | null; market_cap: number | null }[]) {
      if (NON_COMMON_STOCK.test(r.ticker)) continue; // 우선주·워런트 등 비보통주 제외
      if (!ALL_EXCHANGES) {
        if (!r.exchange || !TARGET_EXCHANGES.has(r.exchange.toLowerCase())) continue;
      }
      if (MIN_CAP > 0) {
        if (r.market_cap == null || r.market_cap < MIN_CAP) continue;
      }
      result.push(r.ticker);
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow seed-financials (재무 백필) ===");
  console.log(
    `필터: ${ALL_EXCHANGES ? "전 거래소" : "NASDAQ/NYSE"} | 시총 하한: ${
      MIN_CAP > 0 ? `$${MIN_CAP.toLocaleString("en-US")}` : "없음"
    } | 딜레이: ${DELAY_MS}ms`
  );

  let tickers: string[];
  try {
    tickers = await fetchTargetTickers();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const total = tickers.length;
  if (total === 0) {
    console.log("대상 종목 없음. 완료.");
    return;
  }
  if (START_INDEX > 0) console.log(`재개: ${START_INDEX}번 인덱스부터 시작`);
  console.log(`대상 종목: ${total}개 (예상 FMP 호출: 약 ${(total - START_INDEX) * 4}콜)\n`);

  let savedRows = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = START_INDEX; i < total; i++) {
    const ticker = tickers[i];
    const idx = String(i + 1).padStart(String(total).length, " ");
    const prefix = `[${idx}/${total}] ${ticker.padEnd(7, " ")}`;
    const collectedAt = new Date().toISOString();

    try {
      const [income, cashFlow, keyMetrics, profile] = await Promise.all([
        fetchJsonArray<FmpIncomeStatement>(
          `${FMP_BASE}/stable/income-statement?symbol=${ticker}&period=quarter&limit=${QUARTERS_LIMIT}&apikey=${FMP_API_KEY}`
        ),
        fetchJsonArray<FmpCashFlowStatement>(
          `${FMP_BASE}/stable/cash-flow-statement?symbol=${ticker}&period=quarter&limit=${QUARTERS_LIMIT}&apikey=${FMP_API_KEY}`
        ),
        fetchJsonArray<FmpKeyMetrics>(
          `${FMP_BASE}/stable/key-metrics?symbol=${ticker}&period=quarter&limit=${QUARTERS_LIMIT}&apikey=${FMP_API_KEY}`
        ),
        fetchJsonArray<FmpProfile>(`${FMP_BASE}/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`),
      ]);

      if (!income || income.length === 0) {
        console.log(`${prefix} 스킵 — 손익계산서 없음`);
        skipped++;
      } else if (income.length < MIN_QUARTERS) {
        console.log(`${prefix} 스킵 — 분기 부족 (${income.length}/${MIN_QUARTERS})`);
        skipped++;
      } else if (!cashFlow || cashFlow.length === 0) {
        console.log(`${prefix} 스킵 — 현금흐름표 없음`);
        skipped++;
      } else {
        const currency = profile?.[0]?.currency ?? null;
        const rows = buildRows(ticker, income, cashFlow, keyMetrics, currency, collectedAt);
        if (rows.length === 0) {
          console.log(`${prefix} 스킵 — 저장 가능한 분기 없음`);
          skipped++;
        } else {
          const { error: upsertErr } = await supabase
            .from("financial_metrics")
            .upsert(rows, { onConflict: "ticker,period_type,period_end" });
          if (upsertErr) {
            console.error(`${prefix} DB 오류 — ${upsertErr.message}`);
            errors++;
          } else {
            savedRows += rows.length;
            console.log(
              `${prefix} 저장 — ${rows.length}행  (누적: ${savedRows}행 / 스킵 ${skipped} / 오류 ${errors})`
            );
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${prefix} 오류 — ${msg}`);
      errors++;
      // 429면 딜레이를 크게 한 번 쉬어 rate limit 회복
      if (msg.includes("429")) {
        console.log("  ↳ rate limit 감지 — 10초 대기");
        await delay(10_000);
      }
    }

    if (i < total - 1) await delay(DELAY_MS);
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`대상 종목: ${total}`);
  console.log(`저장 행수: ${savedRows}`);
  console.log(`스킵 종목: ${skipped}  (재무 데이터 없음/부족)`);
  console.log(`오류 종목: ${errors}`);
  console.log("\n다음: /api/collect/top30 스코어링이 이 데이터를 자동으로 읽습니다(재무 팩터 활성화 후).");
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
