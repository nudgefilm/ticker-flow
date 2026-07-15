/**
 * scripts/fix-filing-urls.ts
 *
 * filings.ts의 과거 버그(EFTS hit._id를 accession-number로 오인해 파일명이
 *붙은 채로 저장)로 생성된 기존 filings.url을 정상적인 "...-index.htm" 형태로
 * 재계산해 백필한다. 같은 accession인데 exhibit별로 별도 로우가 생긴 경우
 * (filings.url이 UNIQUE라 그대로 UPDATE하면 충돌) 로우당 하나만 남기고
 * 나머지는 삭제한다(2026-07-15 사용자 승인).
 *
 * 남길 로우 선택 기준: id 오름차순 첫 번째. filings 테이블에 created_at이 없어
 * "가장 먼저 저장된 로우"를 구분할 방법이 없고, filed_at/ticker/form_type은
 * 같은 accession이면 항상 동일하며 url은 이 스크립트가 재계산해 덮어쓰므로
 * 어느 로우를 남기든 결과는 같다. summary_kr 내용을 기준으로 고르지 않는 이유:
 * 남은 로우가 8-K/10-K/10-Q이고 summary_kr이 옛 템플릿과 정확히 일치해야 이후
 * reset-filing-template-summaries.ts가 null로 리셋해 새 로직으로 재생성한다 —
 * "이미 내용이 달라 보이는" 로우를 우선 남기면 오히려 템플릿 불일치로 리셋
 * 대상에서 빠져 옛 부정확한 요약이 영구히 남을 수 있다.
 *
 * 실행:
 *   npx tsx scripts/fix-filing-urls.ts               # 계획만 출력(기본, 안전)
 *   npx tsx scripts/fix-filing-urls.ts --apply        # 실제 UPDATE/DELETE 실행
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

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

interface FilingRow {
  id: string;
  ticker: string;
  form_type: string;
  url: string;
  summary_kr: string | null;
}

async function fetchAllFilings(): Promise<FilingRow[]> {
  const PAGE = 1000;
  const result: FilingRow[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("filings")
      .select("id, ticker, form_type, url, summary_kr")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`filings 조회 실패: ${error.message}`);
    if (!data || data.length === 0) break;
    result.push(...(data as FilingRow[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return result;
}

function isMalformed(url: string): boolean {
  return (url.match(/:/g) ?? []).length > 1;
}

/** 잘못된 URL에서 CIK와 accession-number를 뽑아 올바른 index.htm URL을 재구성한다. */
function buildCorrectedUrl(url: string): { cik: string; accession: string; correctedUrl: string } | null {
  const cikMatch = url.match(/\/data\/(\d+)\//);
  const accMatch = url.match(/(\d{10}-\d{2}-\d{6})/);
  if (!cikMatch || !accMatch) return null;
  const cik = cikMatch[1];
  const accession = accMatch[1];
  const accNoDashes = accession.replace(/-/g, "");
  return {
    cik,
    accession,
    correctedUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${accession}-index.htm`,
  };
}

interface Plan {
  correctedUrl: string;
  keepId: string;
  keepIsAlreadyCorrect: boolean; // keep row's url === correctedUrl already(변경 불필요)
  deleteIds: string[];
}

async function buildPlan(rows: FilingRow[]): Promise<{ plans: Plan[]; skipped: { id: string; reason: string }[] }> {
  const malformed = rows.filter((r) => isMalformed(r.url));
  const cleanUrls = new Set(rows.filter((r) => !isMalformed(r.url)).map((r) => r.url));

  const groups = new Map<string, FilingRow[]>();
  const skipped: { id: string; reason: string }[] = [];

  for (const row of malformed) {
    const parsed = buildCorrectedUrl(row.url);
    if (!parsed) {
      skipped.push({ id: row.id, reason: "URL에서 CIK/accession 추출 실패" });
      continue;
    }
    if (cleanUrls.has(parsed.correctedUrl)) {
      skipped.push({ id: row.id, reason: `재계산된 URL이 이미 다른(정상) 로우와 충돌: ${parsed.correctedUrl}` });
      continue;
    }
    const list = groups.get(parsed.correctedUrl) ?? [];
    list.push(row);
    groups.set(parsed.correctedUrl, list);
  }

  const plans: Plan[] = [];
  for (const [correctedUrl, groupRows] of groups) {
    const sorted = [...groupRows].sort((a, b) => a.id.localeCompare(b.id));
    const keeper = sorted[0];
    const deleteIds = sorted.slice(1).map((r) => r.id);

    plans.push({
      correctedUrl,
      keepId: keeper.id,
      keepIsAlreadyCorrect: keeper.url === correctedUrl,
      deleteIds,
    });
  }

  return { plans, skipped };
}

async function applyPlan(plans: Plan[]): Promise<void> {
  let updated = 0;
  let deleted = 0;
  let failed = 0;

  for (const plan of plans) {
    if (plan.deleteIds.length > 0) {
      const { error: delErr } = await supabase.from("filings").delete().in("id", plan.deleteIds);
      if (delErr) {
        console.error(`삭제 실패 (keep=${plan.keepId}): ${delErr.message}`);
        failed++;
        continue;
      }
      deleted += plan.deleteIds.length;
    }

    if (!plan.keepIsAlreadyCorrect) {
      const { error: updErr } = await supabase
        .from("filings")
        .update({ url: plan.correctedUrl })
        .eq("id", plan.keepId);
      if (updErr) {
        console.error(`URL 업데이트 실패 (id=${plan.keepId}): ${updErr.message}`);
        failed++;
        continue;
      }
      updated++;
    }
  }

  console.log(`\n완료: URL 업데이트 ${updated}건 / 로우 삭제 ${deleted}건 / 실패 ${failed}건`);
}

async function main() {
  const apply = process.argv.includes("--apply");

  console.log("\n=== TickerFlow fix-filing-urls ===");
  const rows = await fetchAllFilings();
  console.log(`filings 전체: ${rows.length}건`);

  const malformedCount = rows.filter((r) => isMalformed(r.url)).length;
  console.log(`malformed URL: ${malformedCount}건`);

  const { plans, skipped } = await buildPlan(rows);
  const dupeGroups = plans.filter((p) => p.deleteIds.length > 0);
  const totalDeletes = plans.reduce((s, p) => s + p.deleteIds.length, 0);
  const totalUpdates = plans.filter((p) => !p.keepIsAlreadyCorrect).length;

  console.log(`\n계획: URL 업데이트 대상 ${totalUpdates}건 / 중복 그룹 ${dupeGroups.length}개(삭제 대상 로우 ${totalDeletes}건)`);
  if (skipped.length > 0) {
    console.log(`스킵(수동 확인 필요): ${skipped.length}건`);
    for (const s of skipped) console.log(`  - ${s.id}: ${s.reason}`);
  }

  if (!apply) {
    console.log("\n--apply 플래그 없음 — 계획만 출력하고 종료합니다. (변경 없음)");
    console.log("실행 예: npx tsx scripts/fix-filing-urls.ts --apply");
    return;
  }

  console.log("\n실행합니다...");
  await applyPlan(plans);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
