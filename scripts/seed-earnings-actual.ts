/**
 * scripts/seed-earnings-actual.ts
 * tickers 테이블 전체 종목의 실제 EPS를 Finnhub에서 조회해
 * earnings 테이블의 actual_eps를 업데이트하는 로컬 실행 스크립트.
 *
 * 매칭 방식: Finnhub period(회계분기 마감일)와 earnings.report_date(발표일) 간 ±90일 이내
 *
 * 실행:
 *   npx tsx scripts/seed-earnings-actual.ts
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

const MATCH_DAYS = 90; // Finnhub period ↔ earnings.report_date 최대 허용 차이

// ── Finnhub API 응답 타입 ────────────────────────────────────────────────────
interface FinnhubSurpriseItem {
  actual: number | null;
  estimate: number | null;
  period: string;   // "YYYY-MM-DD" (회계분기 마감일)
  quarter: number;
  symbol: string;
  year: number;
}

// ── 종목별 EPS 서프라이즈 조회 (429 시 3초 대기 후 1회 재시도) ────────────────
async function fetchSurprises(ticker: string): Promise<FinnhubSurpriseItem[]> {
  const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`;

  let res = await fetch(url);

  if (res.status === 429) {
    await delay(3000);
    res = await fetch(url);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data: FinnhubSurpriseItem[] = await res.json();
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

// ── actual_eps가 NULL인 종목 Set 조회 — 우선 처리 순서 정렬용 ────────────────
async function fetchTickersWithNullEps(): Promise<Set<string>> {
  const PAGE = 1000;
  const result = new Set<string>();
  let from = 0;

  while (true) {
    const { data } = await supabase
      .from("earnings")
      .select("ticker")
      .is("actual_eps", null)
      .range(from, from + PAGE - 1);

    if (!data || data.length === 0) break;
    for (const r of data) result.add(r.ticker);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow seed-earnings-actual ===");
  console.log("tickers 테이블 전체 종목 조회 중...\n");

  let allTickers: string[];
  try {
    allTickers = await fetchAllTickers();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  // actual_eps가 NULL인 종목을 앞으로 정렬
  console.log("actual_eps NULL 종목 조회 중...\n");
  const nullEpsSet = await fetchTickersWithNullEps();

  const tickers = [
    ...allTickers.filter((t) => nullEpsSet.has(t)),
    ...allTickers.filter((t) => !nullEpsSet.has(t)),
  ];

  const total = tickers.length;
  if (total === 0) {
    console.log("대상 종목 없음. 완료.");
    return;
  }

  console.log(`대상 종목: ${total}개  (actual_eps NULL 보유: ${nullEpsSet.size}개 우선 처리)\n`);

  let updatedRows = 0;
  let skipped = 0;
  let errors = 0;
  const collectedAt = new Date().toISOString();

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const idx = String(i + 1).padStart(String(total).length, " ");
    const prefix = `[${idx}/${total}] ${ticker.padEnd(7, " ")}`;

    try {
      // earnings 테이블에서 actual_eps가 NULL인 행 조회
      const { data: earningsRows, error: fetchErr } = await supabase
        .from("earnings")
        .select("id, report_date")
        .eq("ticker", ticker)
        .is("actual_eps", null);

      if (fetchErr) throw new Error(`earnings 조회 실패: ${fetchErr.message}`);

      if (!earningsRows || earningsRows.length === 0) {
        console.log(`${prefix} 스킵 — 업데이트할 항목 없음`);
        skipped++;
        if (i < total - 1) await delay(500);
        continue;
      }

      // Finnhub EPS 서프라이즈 조회
      const surprises = await fetchSurprises(ticker);

      // actual 값이 있는 항목만 사용
      const validSurprises = surprises.filter((s) => s.actual != null && s.period);

      if (validSurprises.length === 0) {
        console.log(`${prefix} 스킵 — Finnhub 데이터 없음 (NULL 행: ${earningsRows.length}개)`);
        skipped++;
        if (i < total - 1) await delay(500);
        continue;
      }

      // ±90일 이내 매칭 후 업데이트
      let tickerUpdated = 0;
      const matchThresholdMs = MATCH_DAYS * 24 * 60 * 60 * 1000;

      for (const row of earningsRows as { id: string; report_date: string }[]) {
        const reportMs = new Date(row.report_date).getTime();

        const match = validSurprises.find((s) => {
          const periodMs = new Date(s.period).getTime();
          return Math.abs(reportMs - periodMs) <= matchThresholdMs;
        });

        if (!match) continue;

        const { error: updateErr } = await supabase
          .from("earnings")
          .update({ actual_eps: match.actual, collected_at: collectedAt })
          .eq("id", row.id);

        if (updateErr) {
          console.error(`${prefix} UPDATE 오류 — ${updateErr.message}`);
          errors++;
        } else {
          tickerUpdated++;
        }
      }

      if (tickerUpdated > 0) {
        updatedRows += tickerUpdated;
        console.log(
          `${prefix} 업데이트 — ${tickerUpdated}행  (누적 업데이트: ${updatedRows} / 스킵: ${skipped} / 오류: ${errors})`
        );
      } else {
        console.log(`${prefix} 스킵 — 매칭 없음 (NULL 행: ${earningsRows.length}개, Finnhub: ${validSurprises.length}개)`);
        skipped++;
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
  console.log(`업데이트 행수: ${updatedRows}`);
  console.log(`스킵 종목: ${skipped}  (업데이트 없음 또는 Finnhub 데이터 없음)`);
  console.log(`오류 종목: ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
