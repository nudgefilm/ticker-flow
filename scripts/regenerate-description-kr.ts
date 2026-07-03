/**
 * scripts/regenerate-description-kr.ts
 * tickers.description(영문)은 있지만 description_kr이 구 프롬프트로 생성되어
 * 문장이 중간에 잘린 종목들을 대상으로, FMP API 재호출 없이 DB에 저장된
 * description을 그대로 읽어 개선된 프롬프트(summarizeCompanyDescription)로
 * description_kr만 재생성한다.
 *
 * 대상: description IS NOT NULL 전체 (description_kr 기존값 유무와 무관하게 덮어쓴다)
 *
 * 실행:
 *   npx tsx scripts/regenerate-description-kr.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { summarizeCompanyDescription } from "@/lib/collect/summarize";

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("필수 환경변수 누락: ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Supabase PostgREST 1000행 제한을 우회한 전체 조회 ────────────────────────
async function fetchAllTickersWithDescription(): Promise<{ ticker: string; description: string }[]> {
  const PAGE = 1000;
  const result: { ticker: string; description: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("tickers")
      .select("ticker, description")
      .not("description", "is", null)
      .order("ticker")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`tickers 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      if (row.description) result.push({ ticker: row.ticker, description: row.description });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow regenerate-description-kr (Haiku 재호출, FMP 재호출 없음) ===");
  console.log("description NOT NULL 종목 전체 조회 중...\n");

  let targets: { ticker: string; description: string }[];
  try {
    targets = await fetchAllTickersWithDescription();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const total = targets.length;
  if (total === 0) {
    console.log("description NOT NULL 종목 없음. 완료.");
    return;
  }

  console.log(`대상 종목: ${total}개\n`);

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const { ticker, description } = targets[i];

    try {
      const result = await summarizeCompanyDescription(ticker, description);
      await delay(200);

      if (result.ok) {
        updated++;
      } else {
        console.error(`[${i + 1}/${total}] ${ticker} 오류 — ${result.error}`);
        errors++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${i + 1}/${total}] ${ticker} 예외 — ${msg}`);
      errors++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`[${i + 1}/${total}] ${ticker} 처리 완료  (재생성 ${updated} · 오류 ${errors})`);
    }
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`전체:    ${total}`);
  console.log(`재생성:  ${updated}`);
  console.log(`오류:    ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
