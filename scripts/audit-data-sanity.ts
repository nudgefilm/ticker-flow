/**
 * scripts/audit-data-sanity.ts
 *
 * audit-user-copy.ts와 목적은 같다("사람이 화면을 보다가 우연히 발견하기
 * 전에, 배포 전에 자동으로 먼저 걸러낸다") — 하지만 대상이 다르다.
 * audit-user-copy.ts는 소스 코드 문자열을 정적 스캔해서 "이 코드를 배포하면
 * 사고가 난다"를 잡는다. 이 스크립트는 실제 DB 행을 조회해서 "코드가 고쳐진
 * 시점 이전에 이미 저장된 나쁜 데이터"까지 잡는다 — 코드 가드는 새로 들어오는
 * 값만 막아주고, 예전에 이미 저장된 값은 그대로 남아있기 때문이다.
 *
 * 검사 항목 4가지 — 전부 2026-07-17 실제로 발견된 사고에서 나온 기존 가드를
 * 그대로 재사용한다(로직을 복제하지 않는다 — 복제하면 섹터 매핑 사고처럼
 * 한쪽만 갱신되며 어긋나는 drift가 재발할 수 있다):
 *
 * 1. tickers.sector — src/lib/sectors.ts의 SECTOR_KR 화이트리스트 밖 값.
 *    resolveCanonicalSector()가 새로 들어오는 값은 이미 막고 있지만, 그
 *    가드가 생기기 전에 저장된 원시값이 아직 남아있을 수 있다.
 * 2. insider_trades.value — limits.ts의 INSIDER_VALUE_REVIEW_THRESHOLD(10억
 *    달러) 초과 거래. insider.ts는 이 값을 넘으면 console.warn만 남기고
 *    저장은 그대로 진행하므로, 로그를 안 보면 아무도 모르고 지나간다.
 * 3~5. filings/news.summary_kr, tickers.description_kr — summarize.ts의
 *    REFUSAL_MARKERS(거절/사과성 응답)·endsWithSentenceTerminator(문장
 *    완결성) 검사. 이 두 가드는 현재 filings 경로(resolveFilingSummary)에만
 *    붙어 있고 news/description_kr 저장 경로에는 아예 없다 — 이 스크립트가
 *    news.summary_kr·tickers.description_kr에 대해서는 사실상 유일한
 *    방어선이다(2026-07-17 설계 중 확인, summarize.ts 자체는 고치지 않음 —
 *    범위 밖).
 *
 * 데이터 문제(코드가 아니라 이미 쌓인 행)를 다루기 때문에, 발견돼도 기본값은
 * 경고만 출력하고 빌드는 막지 않는다 — audit-user-copy.ts와의 의도적인 차이.
 * "이 코드를 배포하면 사고"인 경우와 달리 "예전 데이터를 검토해야 한다"는
 * 무관한 배포까지 막을 이유가 없다. 필요하면 --strict로 exit 1 가능.
 *
 * 실행:
 *   pnpm run audit:data              # 경고만 출력, 항상 exit 0
 *   pnpm run audit:data -- --strict  # 위반 있으면 exit 1
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { SECTOR_KR } from "@/lib/sectors";
import { INSIDER_VALUE_REVIEW_THRESHOLD } from "@/lib/collect/limits";
import { looksLikeRefusal, endsWithSentenceTerminator } from "@/lib/collect/summarize";

// ── .env.local 있으면 읽고, 없으면(Vercel 등) process.env에 이미 있다고 보고 넘어간다 ──
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
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

const STRICT = process.argv.includes("--strict");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAGE = 1000;

interface Section {
  title: string;
  findings: string[];
}

async function fetchAllPages<T>(
  build: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// ─── ① 섹터 화이트리스트 ────────────────────────────────────────────────────

async function checkSectorWhitelist(
  supabase: any
): Promise<string[]> {
  const rows = await fetchAllPages<{ ticker: string; sector: string | null }>((from, to) =>
    supabase.from("tickers").select("ticker, sector").not("sector", "is", null).range(from, to) as any
  );

  const bad = rows.filter((r) => r.sector && !Object.prototype.hasOwnProperty.call(SECTOR_KR, r.sector));
  if (bad.length === 0) return [];

  const counts = new Map<string, number>();
  for (const r of bad) counts.set(r.sector as string, (counts.get(r.sector as string) ?? 0) + 1);
  const breakdown = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sector, count]) => `"${sector}"(${count}건)`);

  return [
    `tickers.sector 화이트리스트 위반 ${bad.length}건, ${counts.size}종류: ` +
      breakdown.slice(0, 10).join(", ") +
      (breakdown.length > 10 ? ` 외 ${breakdown.length - 10}종류` : ""),
  ];
}

// ─── ② 내부자 거래 금액 이상치 ──────────────────────────────────────────────

async function checkInsiderOutliers(
  supabase: any
): Promise<string[]> {
  const { data, error } = await supabase
    .from("insider_trades")
    .select("ticker, name, transaction_type, value, transaction_date")
    .gt("value", INSIDER_VALUE_REVIEW_THRESHOLD)
    .order("value", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const lines = (data as any[]).map(
    (r) =>
      `  ${r.ticker} ${r.name ?? "?"} ${r.transaction_type} $${Number(r.value).toLocaleString()} (${r.transaction_date})`
  );
  return [
    `insider_trades.value가 임계값($${INSIDER_VALUE_REVIEW_THRESHOLD.toLocaleString()}) 초과 ${data.length}건(상위 20건):`,
    ...lines,
  ];
}

// ─── ③~⑤ 요약 텍스트 품질(거절 문구 / 문장 미완결) ───────────────────────────

async function checkTextQuality(
  supabase: any,
  table: "filings" | "news" | "tickers",
  idCol: string,
  textCol: string,
  labelCol?: string
): Promise<string[]> {
  const cols = [idCol, textCol, labelCol].filter(Boolean).join(", ");
  const rows = await fetchAllPages<Record<string, unknown>>((from, to) =>
    supabase.from(table).select(cols).not(textCol, "is", null).range(from, to) as any
  );

  const label = (r: Record<string, unknown>) => (labelCol ? `${r[labelCol]}/${r[idCol]}` : String(r[idCol]));

  const refusals = rows.filter((r) => looksLikeRefusal(String(r[textCol])));
  const refusalIds = new Set(refusals.map((r) => r[idCol]));
  const incomplete = rows.filter(
    (r) => !refusalIds.has(r[idCol]) && !endsWithSentenceTerminator(String(r[textCol]).trim())
  );

  const out: string[] = [];
  if (refusals.length > 0) {
    out.push(
      `${table}.${textCol} 거절/사과성 응답 ${refusals.length}건: ` +
        refusals.slice(0, 5).map(label).join(", ") +
        (refusals.length > 5 ? ` 외 ${refusals.length - 5}건` : "")
    );
  }
  if (incomplete.length > 0) {
    out.push(
      `${table}.${textCol} 문장 미완결 ${incomplete.length}건: ` +
        incomplete.slice(0, 5).map(label).join(", ") +
        (incomplete.length > 5 ? ` 외 ${incomplete.length - 5}건` : "")
    );
  }
  return out;
}

// ─── 실행 ────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[audit-data-sanity] Supabase 환경변수 없음 — 검사를 건너뜁니다.");
    return;
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const sections: Section[] = [];
  sections.push({ title: "① 섹터 화이트리스트(tickers.sector)", findings: await checkSectorWhitelist(supabase) });
  sections.push({ title: "② 내부자 거래 금액 이상치(insider_trades.value)", findings: await checkInsiderOutliers(supabase) });
  sections.push({
    title: "③ 공시 요약 품질(filings.summary_kr)",
    findings: await checkTextQuality(supabase, "filings", "id", "summary_kr", "ticker"),
  });
  sections.push({
    title: "④ 뉴스 요약 품질(news.summary_kr)",
    findings: await checkTextQuality(supabase, "news", "id", "summary_kr", "ticker"),
  });
  sections.push({
    title: "⑤ 기업개요 요약 품질(tickers.description_kr)",
    findings: await checkTextQuality(supabase, "tickers", "ticker", "description_kr"),
  });

  console.log("\n=== TickerFlow 데이터 정합성 점검(audit-data-sanity) ===\n");
  let total = 0;
  for (const s of sections) {
    if (s.findings.length === 0) {
      console.log(`${s.title}: 이상 없음`);
    } else {
      console.log(`${s.title}:`);
      for (const f of s.findings) console.log(`  ${f}`);
      total += s.findings.length;
    }
  }

  if (total === 0) {
    console.log("\n[audit-data-sanity] 전체 이상 없음.");
    return;
  }

  console.log(`\n[audit-data-sanity] 검토 필요 항목 ${total}건 발견 — 위 목록 참고. 이 자체가 배포를 막을 사유는 아니며(데이터 문제, 코드 문제 아님), 검토 후 별도로 정리 작업을 진행하면 됩니다.`);
  if (STRICT) process.exit(1);
}

main().catch((e) => {
  // 네트워크/일시적 오류로 빌드를 막지 않는다 — best-effort 가드레일 원칙.
  console.error("[audit-data-sanity] 실행 중 오류(무시하고 계속 진행):", e instanceof Error ? e.message : e);
});
