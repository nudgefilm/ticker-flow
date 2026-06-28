/**
 * scripts/seed-tickers.ts
 * SEC EDGAR company_tickers_exchange.json에서 NASDAQ+NYSE 전체 종목을
 * tickers 테이블에 일괄 upsert하는 로컬 실행 스크립트.
 *
 * 실행:
 *   npx tsx scripts/seed-tickers.ts
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SEC_URL = "https://www.sec.gov/files/company_tickers_exchange.json";
const USER_AGENT = "TickerFlow support@tickerflow.net";
const TARGET_EXCHANGES = new Set(["Nasdaq", "NYSE", "NYSE MKT", "NYSE Arca"]);
const BATCH_SIZE = 500;

// company_tickers_exchange.json field order: [cik_str, name, ticker, exchange]
type SecRow = [number, string, string, string];

async function main() {
  console.log("\n=== TickerFlow seed-tickers ===");
  console.log("SEC EDGAR에서 종목 데이터 다운로드 중...\n");

  const res = await fetch(SEC_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.error(`SEC EDGAR 요청 실패: HTTP ${res.status}`);
    process.exit(1);
  }

  const secData: { data: SecRow[] } = await res.json();
  const rows = secData.data.filter(([, , , exchange]) => TARGET_EXCHANGES.has(exchange));
  const total = rows.length;

  console.log(`대상 종목: ${total}개 (Nasdaq + NYSE + NYSE MKT + NYSE Arca)\n`);

  let saved = 0;
  let errors = 0;
  const batches = Math.ceil(total / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const start = b * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, total);
    const batch = rows
      .slice(start, end)
      .map(([, name, ticker, exchange]) => ({ ticker, name_en: name, exchange }));

    const { error } = await supabase
      .from("tickers")
      .upsert(batch, { onConflict: "ticker" });

    if (error) {
      console.error(`배치 ${b + 1}/${batches} [${start + 1}~${end}] 오류 — ${error.message}`);
      errors += batch.length;
    } else {
      saved += batch.length;
      console.log(`배치 ${String(b + 1).padStart(String(batches).length, " ")}/${batches}  [${String(start + 1).padStart(5, " ")}~${String(end).padStart(5, " ")}]  누적 저장: ${saved}`);
    }
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`전체: ${total}`);
  console.log(`저장: ${saved}`);
  console.log(`오류: ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
