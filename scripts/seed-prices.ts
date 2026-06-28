/**
 * scripts/seed-prices.ts
 * tickers 테이블 전체 종목의 1년 일봉 주가 데이터를
 * Yahoo Finance에서 수집해 stock_prices 테이블에 저장하는 로컬 실행 스크립트.
 *
 * 실행:
 *   npx tsx scripts/seed-prices.ts
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) as any;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Yahoo Finance 응답 타입 ──────────────────────────────────────────────────
interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

type DayPrice = {
  ticker: string;
  date: string;
  close: number;
  change_pct: number | null;
  volume: number | null;
  collected_at: string;
};

// ── Yahoo Finance 1년 일봉 조회 ──────────────────────────────────────────────
async function fetchYearPrices(ticker: string, collectedAt: string): Promise<DayPrice[] | null> {
  const url =
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?range=1y&interval=1d&includePrePost=false`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://finance.yahoo.com/",
        Origin: "https://finance.yahoo.com",
      },
    });
  } catch (e) {
    throw new Error(`fetch 오류: ${String(e)}`);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  let data: YahooChartResponse;
  try {
    data = await res.json();
  } catch {
    throw new Error("JSON 파싱 오류");
  }

  if (data.chart.error) throw new Error(data.chart.error.description);

  const result = data.chart.result?.[0];
  if (!result) return null;

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const volumes = result.indicators?.quote?.[0]?.volume ?? [];

  const rows: DayPrice[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null || !isFinite(close)) continue;

    const date = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    const prevClose = i > 0 ? closes[i - 1] : null;
    const change_pct =
      prevClose != null && prevClose > 0
        ? Math.round(((close - prevClose) / prevClose) * 10000) / 100
        : null;

    rows.push({
      ticker,
      date,
      close: Math.round(close * 100) / 100,
      change_pct,
      volume: volumes[i] ?? null,
      collected_at: collectedAt,
    });
  }

  return rows;
}

// ── Supabase PostgREST 1000행 제한 우회 — 전체 티커 조회 ─────────────────────
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
  console.log("\n=== TickerFlow seed-prices ===");
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

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const idx = String(i + 1).padStart(String(total).length, " ");
    const prefix = `[${idx}/${total}] ${ticker.padEnd(7, " ")}`;
    const collectedAt = new Date().toISOString();

    try {
      const rows = await fetchYearPrices(ticker, collectedAt);

      if (!rows || rows.length === 0) {
        console.log(`${prefix} 스킵 — 데이터 없음`);
        skipped++;
      } else {
        const { error: upsertErr } = await supabase
          .from("stock_prices")
          .upsert(rows, { onConflict: "ticker,date" });

        if (upsertErr) {
          console.error(`${prefix} DB 오류 — ${upsertErr.message}`);
          errors++;
        } else {
          console.log(`${prefix} 저장 — ${rows.length}행  (누적 저장: ${saved + rows.length} / 스킵: ${skipped} / 오류: ${errors})`);
          saved += rows.length;
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
  console.log(`저장 행수: ${saved}`);
  console.log(`스킵 종목: ${skipped}  (Yahoo Finance 데이터 없음)`);
  console.log(`오류 종목: ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
