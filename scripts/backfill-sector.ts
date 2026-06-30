/**
 * scripts/backfill-sector.ts
 * tickers 테이블에서 sector NULL 종목 전체를 Finnhub API로 일괄 조회하여 sector/industry 업데이트.
 * runProfileCollect (src/lib/collect/profile.ts) 와 동일한 API·매핑 로직 사용.
 *
 * 실행:
 *   npx tsx scripts/backfill-sector.ts
 *
 * 주의:
 *   Finnhub 무료 플랜 기준 60 calls/min. 딜레이 기본 200ms (5 calls/sec) 로
 *   유료 플랜 환경을 가정. 무료 플랜이면 DELAY_MS=1100 환경변수로 조정.
 *   예) DELAY_MS=1100 npx tsx scripts/backfill-sector.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// ── .env.local 수동 파싱 ────────────────────────────────────────────────────
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
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "200", 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FINNHUB_API_KEY) {
  console.error(
    "필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FINNHUB_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── profile.ts 와 동일한 industry → sector 매핑 ────────────────────────────
const INDUSTRY_TO_SECTOR: Record<string, string> = {
  "Software": "Technology",
  "Semiconductors": "Technology",
  "Hardware": "Technology",
  "IT Services": "Technology",
  "Electronic Components": "Technology",
  "Computers and Peripherals": "Technology",
  "Biotechnology": "Healthcare",
  "Pharmaceuticals": "Healthcare",
  "Medical Devices": "Healthcare",
  "Health Care Equipment": "Healthcare",
  "Health Care Services": "Healthcare",
  "Managed Health Care": "Healthcare",
  "Banks": "Financial Services",
  "Insurance": "Financial Services",
  "Capital Markets": "Financial Services",
  "Consumer Finance": "Financial Services",
  "Financial Services": "Financial Services",
  "Asset Management": "Financial Services",
  "Retail": "Consumer Cyclical",
  "Automobiles": "Consumer Cyclical",
  "Hotels and Entertainment Services": "Consumer Cyclical",
  "Specialty Retail": "Consumer Cyclical",
  "Internet Retail": "Consumer Cyclical",
  "Food and Beverage": "Consumer Defensive",
  "Household Products": "Consumer Defensive",
  "Personal Products": "Consumer Defensive",
  "Tobacco": "Consumer Defensive",
  "Aerospace and Defense": "Industrials",
  "Machinery": "Industrials",
  "Transportation": "Industrials",
  "Commercial Services": "Industrials",
  "Construction": "Industrials",
  "Electrical Equipment": "Industrials",
  "Media": "Communication Services",
  "Telecommunications Services": "Communication Services",
  "Interactive Media": "Communication Services",
  "Entertainment": "Communication Services",
  "Oil and Gas": "Energy",
  "Energy": "Energy",
  "Renewable Energy": "Energy",
  "Chemicals": "Materials",
  "Metals and Mining": "Materials",
  "Paper and Forest Products": "Materials",
  "Real Estate": "Real Estate",
  "REITs": "Real Estate",
  "Utilities": "Utilities",
  "Electric Utilities": "Utilities",
  "Gas Utilities": "Utilities",
};

interface FinnhubProfile {
  finnhubIndustry?: string;
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

    result.push(...data.map((r: { ticker: string }) => r.ticker));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow backfill-sector (Finnhub) ===");
  console.log(`딜레이: ${DELAY_MS}ms/요청`);
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

  const estMinutes = Math.ceil((total * DELAY_MS) / 60000);
  console.log(`대상 종목: ${total}개  (예상 소요: 약 ${estMinutes}분)\n`);

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];
    const pad = String(total).length;
    const prefix = `[${String(i + 1).padStart(pad, " ")}/${total}] ${ticker.padEnd(8, " ")}`;

    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_API_KEY}`
      );

      if (!res.ok) {
        console.log(`${prefix} 스킵 — HTTP ${res.status}`);
        skipped++;
      } else {
        const profile: FinnhubProfile = await res.json();

        if (!profile.finnhubIndustry) {
          console.log(`${prefix} 스킵 — finnhubIndustry 없음`);
          skipped++;
        } else {
          const industry = profile.finnhubIndustry;
          const sector = INDUSTRY_TO_SECTOR[industry] ?? industry;

          const { error: updateErr } = await supabase
            .from("tickers")
            .update({ sector, industry })
            .eq("ticker", ticker);

          if (updateErr) {
            console.error(`${prefix} DB 오류 — ${updateErr.message}`);
            errors++;
          } else {
            console.log(`${prefix} 저장 — ${sector} / ${industry}`);
            saved++;
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${prefix} 오류 — ${msg}`);
      errors++;
    }

    if (i < total - 1) await delay(DELAY_MS);
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`전체:  ${total}`);
  console.log(`저장:  ${saved}`);
  console.log(`스킵:  ${skipped}  (Finnhub에 industry 데이터 없음)`);
  console.log(`오류:  ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
