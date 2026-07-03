/**
 * scripts/backfill-insider-title.ts
 * insider_trades.title이 NULL인 기존 행에 대해 SEC EDGAR Form 4 원문을 조회해
 * 직책(title)을 백필한다. Finnhub API는 재호출하지 않는다.
 *
 * 종목(ticker) 단위로 묶어서 처리 — 동일 종목의 여러 거래가 SEC Form 4 제출 목록
 * 조회(atom feed)와 XML을 공유할 수 있어 SEC 요청 횟수를 최소화한다.
 *
 * 실행:
 *   npx tsx scripts/backfill-insider-title.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { createInsiderTitleLookup } from "@/lib/collect/insider-form4";

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface InsiderTradeRow {
  id: string;
  ticker: string;
  name: string | null;
  filed_at: string | null;
  transaction_date: string | null;
}

// ── Supabase PostgREST 1000행 제한을 우회한 전체 조회 ────────────────────────
async function fetchAllNullTitleTrades(): Promise<InsiderTradeRow[]> {
  const PAGE = 1000;
  const result: InsiderTradeRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("insider_trades")
      .select("id, ticker, name, filed_at, transaction_date")
      .is("title", null)
      .not("name", "is", null)
      .order("ticker")
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`insider_trades 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;

    result.push(...(data as InsiderTradeRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

// ── 메인 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n=== TickerFlow backfill-insider-title (SEC Form 4 원문 파싱) ===");
  console.log("title NULL 거래 전체 조회 중...\n");

  let trades: InsiderTradeRow[];
  try {
    trades = await fetchAllNullTitleTrades();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const total = trades.length;
  if (total === 0) {
    console.log("title NULL 거래 없음. 완료.");
    return;
  }

  // 종목별로 묶어서 처리 — Form 4 목록 조회를 종목당 1회로 최소화
  const byTicker = new Map<string, InsiderTradeRow[]>();
  for (const t of trades) {
    const list = byTicker.get(t.ticker) ?? [];
    list.push(t);
    byTicker.set(t.ticker, list);
  }

  console.log(`대상 거래: ${total}건 (${byTicker.size}개 종목)\n`);

  let processed = 0;
  let matched = 0;
  let notFound = 0;
  let errors = 0;

  for (const [ticker, tickerTrades] of byTicker) {
    const lookupTitle = createInsiderTitleLookup(ticker);

    for (const trade of tickerTrades) {
      processed++;
      const filingDate = trade.filed_at
        ? toDateOnly(trade.filed_at)
        : trade.transaction_date
          ? toDateOnly(trade.transaction_date)
          : null;

      if (!trade.name || !filingDate) {
        notFound++;
        continue;
      }

      try {
        const title = await lookupTitle(trade.name, filingDate);

        if (title) {
          const { error: updateErr } = await supabase
            .from("insider_trades")
            .update({ title })
            .eq("id", trade.id);

          if (updateErr) {
            console.error(`[${processed}/${total}] ${ticker} ${trade.name} DB 오류 — ${updateErr.message}`);
            errors++;
          } else {
            matched++;
          }
        } else {
          notFound++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[${processed}/${total}] ${ticker} ${trade.name} 예외 — ${msg}`);
        errors++;
      }

      await delay(200);

      if (processed % 100 === 0) {
        console.log(
          `[${processed}/${total}] 처리 완료  (매칭 ${matched} · 미매칭 ${notFound} · 오류 ${errors})`
        );
      }
    }
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`전체:    ${total}`);
  console.log(`매칭:    ${matched}`);
  console.log(`미매칭:  ${notFound}  (Form 4 조회 실패 또는 이름 매칭 안 됨)`);
  console.log(`오류:    ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
