/**
 * scripts/refetch-insider-trades.ts
 *
 * insider_trades.shares/value가 Finnhub의 share(거래 후 총 보유 주식수)를
 * change(이번 거래 변동량) 대신 읽던 버그로 테이블 전체가 오염되어 있었다
 * (2026-07-16 확인, insider.ts에서 근본 수정 완료). 소비 지점 중 최장 조회
 * 기간(analysis/page.tsx, 180일)을 기준으로:
 *   - 180일 이내: 삭제 후 고쳐진 로직(insider.ts의 collectForTicker, lookbackDays=180)
 *     으로 재수집
 *   - 180일 이전: 삭제만 하고 재수집하지 않음(소비 지점 없음)
 *
 * 이 스크립트는 insider.ts의 collectForTicker()를 그대로 재사용한다(로직
 * 복제 금지 — 이번 사고와 같은 종류의 drift 재발 방지).
 *
 * 실행:
 *   npx tsx scripts/refetch-insider-trades.ts               # 대상 건수만 보고(기본, 안전)
 *   npx tsx scripts/refetch-insider-trades.ts --apply        # 실제 삭제+재수집 실행
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FINNHUB_API_KEY) {
  console.error("필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FINNHUB_API_KEY");
  process.exit(1);
}

// createAdminClient()는 Next.js 서버 컨텍스트 의존이라 스크립트에선 직접 생성.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const LOOKBACK_DAYS = 180;
// Finnhub 무료 플랜 60 calls/min 기준 안전 마진(다른 스크립트와 동일 관행).
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "1100", 10);

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
function daysAgoDate(days: number): string {
  return daysAgoIso(days).slice(0, 10);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchRecollectTickers(cutoffIso: string, cutoffDate: string): Promise<string[]> {
  const tickers = new Set<string>();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("insider_trades")
      .select("ticker")
      .or(`filed_at.gte.${cutoffIso},transaction_date.gte.${cutoffDate}`)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    for (const r of data as { ticker: string }[]) tickers.add(r.ticker);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return [...tickers];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const cutoffIso = daysAgoIso(LOOKBACK_DAYS);
  const cutoffDate = daysAgoDate(LOOKBACK_DAYS);

  console.log("\n=== TickerFlow refetch-insider-trades ===");
  console.log(`컷오프: ${LOOKBACK_DAYS}일 (${cutoffDate} 이후)\n`);

  const { count: total } = await supabase.from("insider_trades").select("id", { count: "exact", head: true });
  const recollectTickers = await fetchRecollectTickers(cutoffIso, cutoffDate);

  const { count: recentCount } = await supabase
    .from("insider_trades")
    .select("id", { count: "exact", head: true })
    .or(`filed_at.gte.${cutoffIso},transaction_date.gte.${cutoffDate}`);

  const oldCount = (total ?? 0) - (recentCount ?? 0);

  console.log(`전체: ${total}건`);
  console.log(`180일 이내(삭제 후 재수집 대상): ${recentCount}건 / ${recollectTickers.length}개 종목`);
  console.log(`180일 이전(삭제만, 재수집 안 함): ${oldCount}건`);

  if (!apply) {
    console.log("\n--apply 플래그 없음 — 카운트만 수행하고 종료합니다. (삭제/재수집 없음)");
    return;
  }

  // 삭제+재수집처럼 되돌리기 어려운 --apply 작업만 락을 건다(카운트 전용 조회는
  // 동시 실행돼도 안전하므로 위에서 이미 return). resume-refetch-insider-trades.ts와
  // 같은 데이터·체크포인트를 다루므로 락 이름을 공유해 서로도 상호 배제한다.
  const lock = acquireLock("insider-trades-refetch");

  console.log("\n1단계: 180일 이전 데이터 영구 삭제...");
  const { error: delOldErr, count: delOldCount } = await supabase
    .from("insider_trades")
    .delete({ count: "exact" })
    .lt("filed_at", cutoffIso)
    .lt("transaction_date", cutoffDate);
  if (delOldErr) {
    console.error("180일 이전 삭제 실패:", delOldErr.message);
    process.exit(1);
  }
  console.log(`삭제 완료: ${delOldCount}건`);

  console.log("\n2단계: 180일 이내 데이터 삭제(재수집 준비)...");
  const { error: delRecentErr, count: delRecentCount } = await supabase
    .from("insider_trades")
    .delete({ count: "exact" })
    .or(`filed_at.gte.${cutoffIso},transaction_date.gte.${cutoffDate}`);
  if (delRecentErr) {
    console.error("180일 이내 삭제 실패:", delRecentErr.message);
    process.exit(1);
  }
  console.log(`삭제 완료: ${delRecentCount}건`);

  console.log(`\n3단계: ${recollectTickers.length}개 종목 재수집 시작 (딜레이 ${DELAY_MS}ms/종목, 고쳐진 로직 사용)...\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let errorTickers = 0;

  for (let i = 0; i < recollectTickers.length; i++) {
    const ticker = recollectTickers[i];
    try {
      const { inserted, skipped } = await collectForTicker(ticker, FINNHUB_API_KEY!, supabase as any, LOOKBACK_DAYS);
      totalInserted += inserted;
      totalSkipped += skipped;
    } catch (e) {
      errorTickers++;
      console.error(`[${i + 1}/${recollectTickers.length}] ${ticker} 예외 — ${e instanceof Error ? e.message : e}`);
    }

    if ((i + 1) % 50 === 0 || i === recollectTickers.length - 1) {
      console.log(
        `[${i + 1}/${recollectTickers.length}] 진행 중... (삽입 ${totalInserted} · 스킵 ${totalSkipped} · 오류종목 ${errorTickers})`
      );
    }

    if (i < recollectTickers.length - 1) await delay(DELAY_MS);
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`종목: ${recollectTickers.length}`);
  console.log(`삽입: ${totalInserted}`);
  console.log(`스킵: ${totalSkipped}`);
  console.log(`오류 종목: ${errorTickers}`);

  lock.release();
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
