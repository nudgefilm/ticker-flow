/**
 * scripts/seed-splits.ts
 * tickers 테이블 전체 종목의 주식 분할 정보를 FMP에서 수집해
 * stock_splits 테이블에 저장하는 로컬 실행 스크립트.
 *
 * 테이블이 없으면 먼저 Supabase SQL Editor에서 실행:
 *   CREATE TABLE IF NOT EXISTS stock_splits (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     ticker text NOT NULL,
 *     split_date date,
 *     numerator numeric,
 *     denominator numeric,
 *     collected_at timestamptz DEFAULT now(),
 *     UNIQUE(ticker, split_date)
 *   );
 *
 * 실행:
 *   npx tsx scripts/seed-splits.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── .env.local 수동 파싱 ───────────────────────────────────────────────────
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
  console.error(
    "필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FMP_API_KEY"
  );
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) as any;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── FMP API 응답 타입 ─────────────────────────────────────────────────────
interface FmpSplitItem {
  symbol?: string;
  date?: string;        // split date
  numerator?: number | null;
  denominator?: number | null;
}

// ── FMP 주식 분할 조회 (429 시 3초 대기 후 1회 재시도) ────────────────────
async function fetchSplits(ticker: string): Promise<FmpSplitItem[]> {
  const url =
    `https://financialmodelingprep.com/stable/splits` +
    `?symbol=${encodeURIComponent(ticker)}&apikey=${FMP_API_KEY}`;

  let res = await fetch(url);

  if (res.status === 429) {
    await delay(3000);
    res = await fetch(url);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body: unknown = await res.json();

  if (!Array.isArray(body)) return [];
  return body as FmpSplitItem[];
}

// ── tickers 전체 조회 (PostgREST 1000행 제한 우회) ───────────────────────
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

    result.push(...(data as { ticker: string }[]).map((r) => r.ticker));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── 메인 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow seed-splits ===");
  console.log("FMP 주식 분할 데이터 수집 시작\n");

  let tickers: string[];
  try {
    console.log("tickers 테이블 전체 종목 조회 중...");
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
  let skipped   = 0;
  let errors    = 0;

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const pad    = String(total).length;
    const idx    = String(i + 1).padStart(pad, " ");
    const prefix = `[${idx}/${total}] ${ticker.padEnd(6, " ")}`;

    try {
      const items = await fetchSplits(ticker);

      if (items.length === 0) {
        console.log(`${prefix} 스킵 — 분할 데이터 없음`);
        skipped++;
      } else {
        // split_date 기준 내림차순 정렬 후 최근 5건만
        const sorted = items
          .filter((s) => s.date)
          .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
          .slice(0, 5);

        if (sorted.length === 0) {
          console.log(`${prefix} 스킵 — 유효한 날짜 없음`);
          skipped++;
        } else {
          const rows = sorted.map((s) => ({
            ticker,
            split_date:  s.date ?? null,
            numerator:   s.numerator ?? null,
            denominator: s.denominator ?? null,
          }));

          const { error: upsertErr } = await supabase
            .from("stock_splits")
            .upsert(rows, {
              onConflict: "ticker,split_date",
              ignoreDuplicates: false,
            });

          if (upsertErr) {
            console.error(`${prefix} DB 오류 — ${upsertErr.message}`);
            errors++;
          } else {
            savedRows += rows.length;
            console.log(
              `${prefix} 저장 ${rows.length}건` +
              `  (누적 저장: ${savedRows} / 스킵: ${skipped} / 오류: ${errors})`
            );
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${prefix} 오류 — ${msg}`);
      errors++;
    }

    if (i < total - 1) await delay(200);
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`전체 종목: ${total}`);
  console.log(`저장 행수: ${savedRows}`);
  console.log(`스킵 종목: ${skipped}  (FMP 데이터 없음)`);
  console.log(`오류 종목: ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
