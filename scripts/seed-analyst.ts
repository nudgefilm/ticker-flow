/**
 * scripts/seed-analyst.ts
 * tickers 테이블 전체 종목의 애널리스트 추천 데이터를
 * Finnhub에서 수집해 analyst_ratings 테이블에 저장하는 로컬 실행 스크립트.
 *
 * 실행:
 *   npx tsx scripts/seed-analyst.ts
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
interface FinnhubRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

// ── 종목별 추천 데이터 조회 (429 시 3초 대기 후 1회 재시도) ──────────────────
async function fetchRecommendations(ticker: string): Promise<FinnhubRecommendation[]> {
  const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;

  let res = await fetch(url);

  if (res.status === 429) {
    await delay(3000);
    res = await fetch(url);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data: FinnhubRecommendation[] = await res.json();
  return Array.isArray(data) ? data : [];
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
  console.log("\n=== TickerFlow seed-analyst ===");
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
  const collectedAt = new Date().toISOString();

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const idx = String(i + 1).padStart(String(total).length, " ");
    const prefix = `[${idx}/${total}] ${ticker.padEnd(7, " ")}`;

    try {
      const data = await fetchRecommendations(ticker);

      // 가장 최근 3개 기간만
      const recent = data.filter((r) => r.period).slice(0, 3);

      if (recent.length === 0) {
        console.log(`${prefix} 스킵 — 데이터 없음`);
        skipped++;
      } else {
        const rows = recent.map((r) => ({
          ticker,
          period: r.period,
          buy: r.buy ?? 0,
          hold: r.hold ?? 0,
          sell: r.sell ?? 0,
          strong_buy: r.strongBuy ?? 0,
          strong_sell: r.strongSell ?? 0,
          collected_at: collectedAt,
        }));

        const { error: upsertErr } = await supabase
          .from("analyst_ratings")
          .upsert(rows, { onConflict: "ticker,period" });

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
