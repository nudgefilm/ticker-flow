/**
 * scripts/seed-earnings.ts
 *
 * Phase 1: 날짜 범위(오늘-365일 ~ 오늘+365일)로 Finnhub 실적 일정 수집
 *   - 30일씩 나눠 반복 조회 (Finnhub 날짜 범위 제한 대응)
 *   - 청크 내 ticker+report_date 중복 JS 제거 후 upsert
 *
 * Phase 2: 전체 종목 과거 4분기 실적 수집
 *   - tickers 테이블 전체 종목 대상 (1000행씩 range() 반복)
 *   - API: /stock/earnings?symbol={ticker} (최근 4분기 actual_eps)
 *   - 종목당 300ms 딜레이
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
interface FinnhubCalendarItem {
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

interface FinnhubCalendarResponse {
  earningsCalendar: FinnhubCalendarItem[];
}

interface FinnhubSurpriseItem {
  actual: number | null;
  estimate: number | null;
  period: string;
  quarter: number;
  symbol: string;
  year: number;
}

// ── 날짜 범위 조회 (Phase 1) ─────────────────────────────────────────────────
async function fetchCalendarByRange(from: string, to: string): Promise<FinnhubCalendarItem[]> {
  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: FinnhubCalendarResponse = await res.json();
  return data.earningsCalendar ?? [];
}

// ── 종목별 과거 실적 조회 (Phase 2) ─────────────────────────────────────────
async function fetchSurprises(ticker: string): Promise<FinnhubSurpriseItem[]> {
  const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: FinnhubSurpriseItem[] = await res.json();
  return Array.isArray(data) ? data : [];
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
  const now = Date.now();
  const startMs = now - 365 * 24 * 60 * 60 * 1000;
  const endMs = now + 365 * 24 * 60 * 60 * 1000;
  const chunks = buildChunks(startMs, endMs, 30);

  // ── Phase 1: 날짜 범위로 실적 일정 수집 ──────────────────────────────────
  console.log("\n=== Phase 1: 실적 일정 수집 (날짜 범위) ===");
  console.log(`조회 범위: ${new Date(startMs).toISOString().slice(0, 10)} ~ ${new Date(endMs).toISOString().slice(0, 10)}`);
  console.log(`청크 수: ${chunks.length}개 (30일 단위)\n`);

  let p1Saved = 0;
  let p1Skipped = 0;
  let p1Errors = 0;

  for (let i = 0; i < chunks.length; i++) {
    const { from, to } = chunks[i];
    const prefix = `[${String(i + 1).padStart(2, " ")}/${chunks.length}] ${from} ~ ${to}`;

    try {
      const items = await fetchCalendarByRange(from, to);

      if (items.length === 0) {
        console.log(`${prefix}  데이터 없음 — 스킵`);
        p1Skipped++;
      } else {
        // 신규 티커 upsert (FK 오류 방지)
        const uniqueSymbols = [...new Set(items.map((item) => item.symbol).filter(Boolean))];
        await supabase
          .from("tickers")
          .upsert(
            uniqueSymbols.map((ticker) => ({ ticker, name_en: ticker })),
            { onConflict: "ticker", ignoreDuplicates: true }
          );

        // ticker+report_date 기준 중복 제거 (ON CONFLICT DO UPDATE 오류 방지)
        const seen = new Set<string>();
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
          }))
          .filter((row) => {
            const key = `${row.ticker}|${row.report_date}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        const { error: upsertErr } = await supabase
          .from("earnings")
          .upsert(rows, { onConflict: "ticker,report_date" });

        if (upsertErr) {
          console.error(`${prefix}  DB 오류 — ${upsertErr.message}`);
          p1Errors++;
        } else {
          p1Saved += rows.length;
          console.log(`${prefix}  저장 ${rows.length}행  (누적: ${p1Saved}행)`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${prefix}  오류 — ${msg}`);
      p1Errors++;
    }

    if (i < chunks.length - 1) await delay(500);
  }

  console.log(`\nPhase 1 완료 — 저장: ${p1Saved}행 / 스킵: ${p1Skipped} / 오류: ${p1Errors}`);

  // ── Phase 2: 전체 종목 과거 4분기 실적 수집 ──────────────────────────────
  console.log("\n=== Phase 2: 과거 실적 수집 (전체 종목) ===");
  console.log("tickers 테이블 전체 종목 조회 중...\n");

  let tickers: string[];
  try {
    tickers = await fetchAllTickers();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const total = tickers.length;
  console.log(`대상 종목: ${total}개\n`);

  let p2Saved = 0;
  let p2Skipped = 0;
  let p2Errors = 0;
  const collectedAt = new Date().toISOString();

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const idx = String(i + 1).padStart(String(total).length, " ");
    const prefix = `[${idx}/${total}] ${ticker.padEnd(7, " ")}`;

    try {
      const surprises = await fetchSurprises(ticker);

      // actual이 있는 최근 4분기만
      const valid = surprises
        .filter((s) => s.actual != null && s.period)
        .slice(0, 4);

      if (valid.length === 0) {
        console.log(`${prefix} 스킵 — 데이터 없음`);
        p2Skipped++;
      } else {
        const rows = valid.map((s) => ({
          ticker: s.symbol,
          report_date: s.period,
          eps_estimate: s.estimate ?? null,
          actual_eps: s.actual,
          collected_at: collectedAt,
        }));

        const { error: upsertErr } = await supabase
          .from("earnings")
          .upsert(rows, { onConflict: "ticker,report_date" });

        if (upsertErr) {
          console.error(`${prefix} DB 오류 — ${upsertErr.message}`);
          p2Errors++;
        } else {
          p2Saved += rows.length;
          console.log(`${prefix} 저장 — ${rows.length}행  (누적 저장: ${p2Saved} / 스킵: ${p2Skipped} / 오류: ${p2Errors})`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${prefix} 오류 — ${msg}`);
      p2Errors++;
    }

    if (i < total - 1) await delay(300);
  }

  console.log(`\nPhase 2 완료 — 저장: ${p2Saved}행 / 스킵: ${p2Skipped} / 오류: ${p2Errors}`);

  // ── 최종 결과 ─────────────────────────────────────────────────────────────
  console.log("\n=== 최종 결과 ===");
  console.log(`Phase 1 저장 행수: ${p1Saved}  (실적 일정)`);
  console.log(`Phase 2 저장 행수: ${p2Saved}  (과거 실적 actual_eps)`);
  console.log(`총 저장 행수: ${p1Saved + p2Saved}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
