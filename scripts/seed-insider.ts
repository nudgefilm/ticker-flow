/**
 * scripts/seed-insider.ts
 * tickers 테이블 전체 종목의 내부자 거래 데이터를
 * Finnhub에서 수집해 insider_trades 테이블에 저장하는 로컬 실행 스크립트.
 *
 * 실행:
 *   npx tsx scripts/seed-insider.ts
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
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FINNHUB_API_KEY) {
  console.error("필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FINNHUB_API_KEY");
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) as any;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Finnhub API 응답 타입 ────────────────────────────────────────────────────
interface FinnhubInsiderTransaction {
  name: string;
  share: number;
  transactionCode: string;
  transactionDate: string;
  transactionPrice: number;
  isDerivative: boolean;
  filingDate: string;
  symbol: string;
  title?: string;
}

interface FinnhubInsiderResponse {
  data: FinnhubInsiderTransaction[];
  symbol: string;
}

// ── P(매수)/S(매도) 코드 → DB 값 변환 ────────────────────────────────────────
function mapTransactionType(code: string): "buy" | "sell" | null {
  if (code === "P") return "buy";
  if (code === "S") return "sell";
  return null;
}

// ── 종목별 내부자 거래 조회 (429 시 3초 대기 후 1회 재시도) ──────────────────
async function fetchInsiderTransactions(ticker: string): Promise<FinnhubInsiderTransaction[]> {
  const url = `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;

  let res = await fetch(url);

  if (res.status === 429) {
    await delay(3000);
    res = await fetch(url);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body: FinnhubInsiderResponse = await res.json();
  return Array.isArray(body.data) ? body.data : [];
}

// ── 전체 티커 조회 — PostgREST 1000행 제한 우회 ──────────────────────────────
async function fetchAllTickers(): Promise<string[]> {
  const PAGE = 1000;
  const result: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("tickers")
      .select("ticker")
      .order("ticker")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`tickers 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;

    result.push(...data.map((r: { ticker: string }) => r.ticker));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow seed-insider ===");
  console.log("tickers 테이블 전체 종목 조회 중...\n");

  let tickers: string[];
  try {
    tickers = await fetchAllTickers();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const total = tickers.length;
  if (total === 0) {
    console.log("대상 종목 없음. 완료.");
    return;
  }

  console.log(`대상 종목: ${total}개\n`);

  let savedRows = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const idx = String(i + 1).padStart(String(total).length, " ");
    const prefix = `[${idx}/${total}] ${ticker.padEnd(7, " ")}`;

    try {
      const transactions = await fetchInsiderTransactions(ticker);

      // P(매수)/S(매도)만, 파생상품 제외
      const filtered = transactions.filter(
        (tx) => mapTransactionType(tx.transactionCode) !== null && !tx.isDerivative
      );

      if (filtered.length === 0) {
        console.log(`${prefix} 스킵 — 데이터 없음`);
        skipped++;
      } else {
        // 날짜 내림차순 정렬 후 최근 10건만
        const recent = filtered
          .sort((a, b) => {
            const da = a.transactionDate ?? "";
            const db = b.transactionDate ?? "";
            return db.localeCompare(da);
          })
          .slice(0, 10);

        const rows = recent.map((tx) => ({
          ticker,
          name: tx.name || null,
          title: tx.title || null,
          transaction_type: mapTransactionType(tx.transactionCode)!,
          shares: tx.share || null,
          price: tx.transactionPrice || null,
          value: tx.share && tx.transactionPrice
            ? Math.round(tx.share * tx.transactionPrice * 100) / 100
            : null,
          transaction_date: tx.transactionDate || null,
          filed_at: tx.filingDate ? `${tx.filingDate}T00:00:00Z` : null,
        }));

        const { error: upsertErr } = await supabase
          .from("insider_trades")
          .upsert(rows, {
            onConflict: "ticker,name,transaction_date,shares,transaction_type",
            ignoreDuplicates: true,
          });

        if (upsertErr) {
          console.error(`${prefix} DB 오류 — ${upsertErr.message}`);
          errors++;
        } else {
          savedRows += rows.length;
          console.log(`${prefix} 저장 — ${rows.length}행  (누적 저장: ${savedRows} / 스킵: ${skipped} / 오류: ${errors})`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${prefix} 오류 — ${msg}`);
      errors++;
    }

    if (i < total - 1) await delay(500);
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`전체 종목: ${total}`);
  console.log(`저장 행수: ${savedRows}`);
  console.log(`스킵 종목: ${skipped}  (Finnhub 데이터 없음)`);
  console.log(`오류 종목: ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
