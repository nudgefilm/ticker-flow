/**
 * scripts/seed-profiles.ts
 * tickers 테이블에서 sector NULL 종목 전체를 FMP API로 일괄 조회하여 sector/industry 업데이트.
 *
 * 실행:
 *   npx tsx scripts/seed-profiles.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── .env.local 수동 파싱 (dotenv 미설치 환경 대응) ──────────────────────────
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── FMP API 응답 타입 ────────────────────────────────────────────────────────
interface FmpProfile {
  symbol: string;
  sector?: string | null;
  industry?: string | null;
  companyName?: string;
}

async function fetchProfile(ticker: string): Promise<FmpProfile | null> {
  const url = `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as FmpProfile[];
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

// ── Supabase PostgREST 1000행 제한을 우회한 전체 조회 ────────────────────────
async function fetchAllNullSectorTickers(): Promise<string[]> {
  const PAGE = 1000;
  const result: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("tickers")
      .select("ticker")
      .is("sector", null)
      .order("ticker")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`tickers 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;

    result.push(...data.map((r) => r.ticker));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow seed-profiles ===");
  console.log("sector NULL 종목 전체 조회 중...\n");

  let tickers: string[];
  try {
    tickers = await fetchAllNullSectorTickers();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const total = tickers.length;
  if (total === 0) {
    console.log("sector NULL 종목 없음. 완료.");
    return;
  }

  console.log(`대상 종목: ${total}개\n`);

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const prefix = `[${String(i + 1).padStart(String(total).length, " ")}/${total}] ${ticker.padEnd(6, " ")}`;

    try {
      const profile = await fetchProfile(ticker);

      if (!profile || !profile.sector) {
        console.log(`${prefix} 스킵 — sector 없음`);
        skipped++;
      } else {
        const { error: updateErr } = await supabase
          .from("tickers")
          .update({
            sector: profile.sector,
            industry: profile.industry ?? null,
          })
          .eq("ticker", ticker);

        if (updateErr) {
          console.error(`${prefix} DB 오류 — ${updateErr.message}`);
          errors++;
        } else {
          console.log(`${prefix} 저장 — ${profile.sector} / ${profile.industry ?? "-"}`);
          saved++;
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
  console.log(`전체: ${total}`);
  console.log(`저장: ${saved}`);
  console.log(`스킵: ${skipped}  (FMP에 sector 데이터 없음)`);
  console.log(`오류: ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
