/**
 * scripts/seed-profiles-full.ts
 * tickers 테이블 전체 종목의 description/ceo/full_time_employees/website/
 * image/ipo_date/headquarters/market_cap을 FMP profile API로 일괄 수집하고,
 * description은 Claude Haiku로 한국어 요약(description_kr)까지 채운다.
 *
 * 대상: description IS NULL인 종목만 (이미 채워진 종목은 스킵)
 *
 * 실행:
 *   npx tsx scripts/seed-profiles-full.ts
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
const FMP_API_KEY = process.env.FMP_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !FMP_API_KEY) {
  console.error(
    "필수 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FMP_API_KEY"
  );
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "⚠ ANTHROPIC_API_KEY 누락 — description은 채워지지만 description_kr 한국어 요약은 스킵됩니다.\n"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── FMP API 응답 타입 ────────────────────────────────────────────────────────
interface FmpProfile {
  description?: string | null;
  ceo?: string | null;
  fullTimeEmployees?: string | null;
  website?: string | null;
  image?: string | null;
  ipoDate?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  marketCap?: number | null;
}

function buildHeadquarters(
  city?: string | null,
  state?: string | null,
  country?: string | null
): string | null {
  const parts = [city, state, country].filter((v): v is string => Boolean(v));
  return parts.length > 0 ? parts.join(", ") : null;
}

function parseEmployees(v?: string | null): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

async function fetchProfile(ticker: string): Promise<FmpProfile | null> {
  const url = `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as FmpProfile[];
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

// ── Supabase PostgREST 1000행 제한을 우회한 전체 조회 ────────────────────────
async function fetchAllNoDescriptionTickers(): Promise<string[]> {
  const PAGE = 1000;
  const result: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("tickers")
      .select("ticker")
      .is("description", null)
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
  console.log("\n=== TickerFlow seed-profiles-full (FMP + Haiku) ===");
  console.log("description NULL 종목 전체 조회 중...\n");

  let tickers: string[];
  try {
    tickers = await fetchAllNoDescriptionTickers();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const total = tickers.length;
  if (total === 0) {
    console.log("description NULL 종목 없음. 완료.");
    return;
  }

  console.log(`대상 종목: ${total}개\n`);

  let saved = 0;
  let translated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < total; i++) {
    const ticker = tickers[i];

    try {
      const profile = await fetchProfile(ticker);
      await delay(300);

      if (!profile || !profile.description) {
        skipped++;
        continue;
      }

      const update: Record<string, unknown> = { description: profile.description };
      if (profile.ceo) update.ceo = profile.ceo;
      const employees = parseEmployees(profile.fullTimeEmployees);
      if (employees != null) update.full_time_employees = employees;
      if (profile.website) update.website = profile.website;
      if (profile.image) update.image = profile.image;
      if (profile.ipoDate) update.ipo_date = profile.ipoDate;
      const headquarters = buildHeadquarters(profile.city, profile.state, profile.country);
      if (headquarters) update.headquarters = headquarters;
      if (profile.marketCap != null) update.market_cap = profile.marketCap;

      const { error: updateErr } = await supabase
        .from("tickers")
        .update(update)
        .eq("ticker", ticker);

      if (updateErr) {
        console.error(`[${i + 1}/${total}] ${ticker} DB 오류 — ${updateErr.message}`);
        errors++;
        continue;
      }

      saved++;

      const summaryResult = await summarizeCompanyDescription(ticker, profile.description);
      await delay(200);

      if (summaryResult.ok) translated++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[${i + 1}/${total}] ${ticker} 오류 — ${msg}`);
      errors++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(
        `[${i + 1}/${total}] ${ticker} 처리 완료  (저장 ${saved} · 번역 ${translated} · 스킵 ${skipped} · 오류 ${errors})`
      );
    }
  }

  console.log("\n=== 최종 결과 ===");
  console.log(`전체:  ${total}`);
  console.log(`저장:  ${saved}`);
  console.log(`번역:  ${translated}`);
  console.log(`스킵:  ${skipped}  (FMP에 description 없음)`);
  console.log(`오류:  ${errors}`);
}

main().catch((e) => {
  console.error("예외:", e);
  process.exit(1);
});
