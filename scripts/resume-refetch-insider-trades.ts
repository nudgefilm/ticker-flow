/**
 * scripts/resume-refetch-insider-trades.ts
 *
 * refetch-insider-trades.ts --apply가 중단된 지점(work/tmp/remaining-tickers.json)부터
 * 재수집만 이어서 진행한다. 삭제 단계는 이미 완료됐으므로(전체 종목의 180일 이내
 * insider_trades가 이미 삭제된 상태) 재실행하지 않는다 — collectForTicker() 재사용은
 * refetch-insider-trades.ts와 동일 원칙(로직 복제 금지).
 *
 * 체크포인트: 종목 1개 완료마다 work/tmp/remaining-tickers.json / done-tickers.json을
 * 갱신한다. 중단돼도 다음 실행이 정확히 이어서 시작한다.
 *
 * 실행:
 *   npx tsx scripts/resume-refetch-insider-trades.ts
 */

import * as fs from "fs";
import * as path from "path";

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

import { createClient } from "@supabase/supabase-js";
import { collectForTicker } from "@/lib/collect/insider";
import { acquireLock } from "./lib/pid-lock";
import { invalidateInsiderDerivedCaches } from "@/lib/collect/cache-invalidation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FINNHUB_API_KEY) {
  console.error("필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FINNHUB_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LOOKBACK_DAYS = 180;
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1100", 10);

const TMP_DIR = path.resolve(process.cwd(), "work/tmp");
const REMAINING_PATH = path.join(TMP_DIR, "remaining-tickers.json");
const DONE_PATH = path.join(TMP_DIR, "done-tickers.json");

function readJsonArray(filePath: string): string[] {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJsonArray(filePath: string, arr: string[]) {
  fs.writeFileSync(filePath, JSON.stringify(arr));
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // refetch-insider-trades.ts --apply와 같은 데이터·체크포인트를 다루므로 락 이름을
  // 공유해 서로도 상호 배제한다(둘 중 하나가 "중단됐다"고 오인된 채 살아있는 상태에서
  // 이 스크립트를 재실행하는 사고 재발 방지).
  const lock = acquireLock("insider-trades-refetch");

  const remaining = readJsonArray(REMAINING_PATH);
  const done = readJsonArray(DONE_PATH);
  const total = remaining.length;
  // 캐시 무효화 대상은 "이번 실행에서 실제로 처리한 종목"만 — 이전 실행에서
  // 이미 처리·무효화된 종목까지 다시 돌릴 필요는 없다.
  const processedThisRun = [...remaining];

  console.log("\n=== TickerFlow resume-refetch-insider-trades ===");
  console.log(`이미 완료: ${done.length}개 종목`);
  console.log(`남은 종목: ${total}개\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let errorTickers = 0;

  while (remaining.length > 0) {
    const ticker = remaining[0];
    const idx = total - remaining.length + 1;
    try {
      const { inserted, skipped } = await collectForTicker(ticker, FINNHUB_API_KEY!, supabase as any, LOOKBACK_DAYS);
      totalInserted += inserted;
      totalSkipped += skipped;
    } catch (e) {
      errorTickers++;
      console.error(`[${idx}/${total}] ${ticker} 예외 — ${e instanceof Error ? e.message : e}`);
    }

    remaining.shift();
    done.push(ticker);
    writeJsonArray(REMAINING_PATH, remaining);
    writeJsonArray(DONE_PATH, done);

    if (idx % 50 === 0 || remaining.length === 0) {
      console.log(
        `[${idx}/${total}] 진행 중... (삽입 ${totalInserted} · 스킵 ${totalSkipped} · 오류종목 ${errorTickers})`
      );
    }

    if (remaining.length > 0) await delay(DELAY_MS);
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`종목: ${total}`);
  console.log(`삽입: ${totalInserted}`);
  console.log(`스킵: ${totalSkipped}`);
  console.log(`오류 종목: ${errorTickers}`);

  // insider_trades 대량 보정 스크립트는 끝에 캐시 무효화가 필수다(CLAUDE.md
  // 5항, 2026-07-18 NVDA 종목 스냅샷 사고 참고).
  console.log("\n관련 캐시(stock_briefs·Form 4 요약) 무효화...");
  const cacheResult = await invalidateInsiderDerivedCaches(processedThisRun);
  console.log(
    `Form 4 리셋 ${cacheResult.form4Reset}건 → 재생성 ${cacheResult.form4Regenerated}건 ` +
    `(멀티필자 날짜라 건너뜀 ${cacheResult.form4MultiFilerSkipped}건) / ` +
    `BRIEF 재생성 ${cacheResult.briefsRegenerated}건(스킵 ${cacheResult.briefsSkipped}, 실패 ${cacheResult.briefsFailed})`
  );

  lock.release();
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
