/**
 * scripts/seed-earnings.ts
 * 날짜 범위(오늘-365일 ~ 오늘+365일)로 Finnhub 실적 일정을 수집해
 * earnings 테이블에 저장하는 로컬 실행 스크립트.
 * 30일씩 나눠 반복 조회 (Finnhub 날짜 범위 제한 대응).
 *
 * 실행:
 *   npx tsx scripts/seed-earnings.ts
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
interface FinnhubEarningsItem {
  date: string;
  epsActual: number | null;
  epsEstimate: number | null;
  hour: string;
  quarter: number;
  revenueActual: number | null;
  revenueEstimate: number | null;
  symbol: string;
  year: number;
}

interface FinnhubEarningsResponse {
  earningsCalendar: FinnhubEarningsItem[];
}

// ── 날짜 범위 조회 ────────────────────────────────────────────────────────────
async function fetchEarningsByRange(from: string, to: string): Promise<FinnhubEarningsItem[]> {
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: FinnhubEarningsResponse = await res.json();
  return data.earningsCalendar ?? [];
}

// ── 30일 단위 청크 생성 ───────────────────────────────────────────────────────
function buildChunks(startMs: number, endMs: number, chunkDays: number): { from: string; to: string }[] {
  const chunkMs = chunkDays * 24 * 60 * 60 * 1000;
  const chunks: { from: string; to: string }[] = [];
  let cursor = startMs;

  while (cursor <= endMs) {
    const chunkEnd = Math.min(cursor + chunkMs - 1, endMs);
    chunks.push({
      from: new Date(cursor).toISOString().slice(0, 10),
      to: new Date(chunkEnd).toISOString().slice(0, 10),
    });
    cursor = chunkEnd + 1;
  }

  return chunks;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  const now = Date.now();
  const startMs = now - 365 * 24 * 60 * 60 * 1000;
  const endMs = now + 365 * 24 * 60 * 60 * 1000;

  const chunks = buildChunks(startMs, endMs, 30);

  console.log("\n=== TickerFlow seed-earnings ===");
  console.log(`조회 범위: ${new Date(startMs).toISOString().slice(0, 10)} ~ ${new Date(endMs).toISOString().slice(0, 10)}`);
  console.log(`청크 수: ${chunks.length}개 (30일 단위)\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < chunks.length; i++) {
    const { from, to } = chunks[i];
    const prefix = `[${String(i + 1).padStart(2, " ")}/${chunks.length}] ${from} ~ ${to}`;

    try {
      const items = await fetchEarningsByRange(from, to);

      if (items.length === 0) {
        console.log(`${prefix}  데이터 없음 — 스킵`);
        totalSkipped++;
      } else {
        // 신규 티커 upsert (earnings FK 오류 방지)
        const uniqueSymbols = [...new Set(items.map((item) => item.symbol).filter(Boolean))];
        await supabase
          .from("tickers")
          .upsert(
            uniqueSymbols.map((ticker) => ({ ticker, name_en: ticker })),
            { onConflict: "ticker", ignoreDuplicates: true }
          );

        const rows = items
          .filter((item) => item.symbol && item.date)
          .map((item) => ({
            ticker: item.symbol,
            report_date: item.date,
            time_of_day: item.hour === "amc" || item.hour === "bmo" ? item.hour : null,
            eps_estimate: item.epsEstimate ?? null,
            revenue_estimate: item.revenueEstimate ?? null,
            actual_eps: item.epsActual ?? null,
            actual_revenue: item.revenueActual ?? null,
          }));

        const { error: upsertErr } = await supabase
          .from("earnings")
          .upsert(rows, { onConflict: "ticker,report_date" });

        if (upsertErr) {
          console.error(`${prefix}  DB 오류 — ${upsertErr.message}`);
          totalErrors++;
        } else {
          totalSaved += rows.length;
          console.log(`${prefix}  저장 ${rows.length}행  (누적: ${totalSaved}행)`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${prefix}  오류 — ${msg}`);
      totalErrors++;
    }

    if (i < chunks.length - 1) await delay(500);
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`처리 청크: ${chunks.length}개`);
  console.log(`저장 행수: ${totalSaved}`);
  console.log(`스킵 청크: ${totalSkipped}  (데이터 없음)`);
  console.log(`오류 청크: ${totalErrors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
