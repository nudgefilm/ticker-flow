/**
 * scripts/reset-filing-template-summaries.ts
 *
 * summarizeFilings()가 원문 미참조 템플릿("...를 제출했습니다." 등)으로 생성한
 * 기존 filings.summary_kr을 null로 리셋한다. 리셋된 행은 이후 정규 크론
 * (summarizeFilings)이 새 로직(8-K/10-K/10-Q/S-1/DEF14A는 원문 기반 Haiku 요약,
 * Form 4는 insider_trades 구조화 데이터 기반 사실 요약)으로 자연스럽게 채운다.
 * 이 스크립트 자체는 요약을 생성하지 않는다 — 리셋만 수행한다.
 *
 * 대상: filings.filed_at이 --days 이내이고, form_type이 TEXT_FORM_TYPES 중
 * 하나이며, summary_kr이 buildFilingSummary()가 생성했을 값과 정확히 일치하는
 * 행. (Haiku가 생성한 진짜 원문 요약이나 Form 4 구조화 요약은 이 템플릿
 * 문자열과 구조가 달라 오탐되지 않는다.)
 *
 * 실행:
 *   npx tsx scripts/reset-filing-template-summaries.ts               # 30일/10일 대상 건수만 카운트(기본, 안전)
 *   npx tsx scripts/reset-filing-template-summaries.ts --apply --days=30   # 실제 리셋 실행(승인 후에만)
 *   npx tsx scripts/reset-filing-template-summaries.ts --apply --days=10
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { buildFilingSummary } from "@/lib/collect/summarize";

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
  console.error("필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TEXT_FORM_TYPES = ["8-K", "10-K", "10-Q", "4", "S-1", "DEF 14A", "DEF14A"];

interface FilingRow {
  id: string;
  ticker: string;
  form_type: string;
  summary_kr: string | null;
}

async function fetchCandidateRows(sinceIso: string): Promise<FilingRow[]> {
  const PAGE = 1000;
  const result: FilingRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("filings")
      .select("id, ticker, form_type, summary_kr")
      .gte("filed_at", sinceIso)
      .in("form_type", TEXT_FORM_TYPES)
      .not("summary_kr", "is", null)
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`filings 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;

    result.push(...(data as FilingRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return result;
}

async function fetchNameMap(tickers: string[]): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  const PAGE = 1000;
  const unique = [...new Set(tickers)];

  for (let i = 0; i < unique.length; i += PAGE) {
    const chunk = unique.slice(i, i + PAGE);
    const { data, error } = await supabase
      .from("tickers")
      .select("ticker, name_kr, name_en")
      .in("ticker", chunk);
    if (error) throw new Error(`tickers 조회 실패: ${error.message}`);
    for (const t of data ?? []) {
      nameMap.set(t.ticker, (t.name_kr as string | null) ?? (t.name_en as string) ?? t.ticker);
    }
  }

  return nameMap;
}

/** rows 중 summary_kr이 옛 템플릿 출력과 정확히 일치하는 행의 id만 반환한다. */
async function findTemplateMatchIds(rows: FilingRow[]): Promise<string[]> {
  if (rows.length === 0) return [];
  const nameMap = await fetchNameMap(rows.map((r) => r.ticker));

  const matched: string[] = [];
  for (const row of rows) {
    const companyName = nameMap.get(row.ticker) ?? row.ticker;
    const expected = buildFilingSummary(row.ticker, companyName, row.form_type);
    if (row.summary_kr === expected) matched.push(row.id);
  }
  return matched;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

async function resetIds(ids: string[]): Promise<{ done: number; failed: number }> {
  const CHUNK = 200;
  let done = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("filings")
      .update({ summary_kr: null })
      .in("id", chunk);
    if (error) {
      console.error(`리셋 실패(청크 ${i}~${i + chunk.length}): ${error.message}`);
      failed += chunk.length;
    } else {
      done += chunk.length;
    }
  }

  return { done, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const daysArg = args.find((a) => a.startsWith("--days="));
  const applyDays = daysArg ? Number(daysArg.split("=")[1]) : null;

  console.log("\n=== TickerFlow reset-filing-template-summaries ===");
  console.log("대상 form_type:", TEXT_FORM_TYPES.join(", "));

  // 30일/10일/60일 세 기준 모두 카운트해서 함께 보고 (승인 판단용). 60일은
  // Form 4/S-1 전체 히스토리를 커버하기 위한 체크포인트(2026-07-16 기준 최고
  // 오래된 행이 51일 전 — 8-K/10-K/10-Q처럼 매일 대량 유입되는 유형이 아니라
  // 전체 리셋 비용이 낮다).
  const checkpoints = [30, 10, 60];
  const results = new Map<number, { rows: FilingRow[]; matched: string[] }>();
  for (const days of checkpoints) {
    const rows = await fetchCandidateRows(daysAgoIso(days));
    const matched = await findTemplateMatchIds(rows);
    results.set(days, { rows, matched });
    console.log(`[${days}일 기준] summary_kr 존재: ${rows.length}건 / 템플릿 패턴 일치(리셋 대상): ${matched.length}건`);
  }

  if (!apply) {
    console.log("\n--apply 플래그 없음 — 카운트만 수행하고 종료합니다. (리셋 없음)");
    console.log("실행 예: npx tsx scripts/reset-filing-template-summaries.ts --apply --days=30");
    return;
  }

  if (!applyDays || !Number.isInteger(applyDays) || applyDays <= 0) {
    console.error("\n--apply 사용 시 --days=N(양의 정수)을 명시해야 합니다.");
    process.exit(1);
  }

  const target = results.get(applyDays);
  const targetIds = target ? target.matched : (await findTemplateMatchIds(await fetchCandidateRows(daysAgoIso(applyDays))));
  console.log(`\n--days=${applyDays} 기준으로 ${targetIds.length}건을 summary_kr = null로 리셋합니다...`);

  const { done, failed } = await resetIds(targetIds);
  console.log(`\n완료: ${done}건 리셋 / 실패: ${failed}건`);
  console.log("이후 정규 크론(summarizeFilings)이 새 로직으로 다시 채웁니다.");
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
