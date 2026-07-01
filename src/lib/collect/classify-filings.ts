import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const BATCH_LIMIT = 50;
const DELAY_MS    = 200;

const CATEGORIES = [
  "ceo_change", "cfo_change", "buyback", "ma", "guidance",
  "contract", "dividend", "offering", "lawsuit", "earnings",
  "fda_approval", "dividend_increase", "sec_investigation", "bankruptcy", "other",
] as const;
type Category = typeof CATEGORIES[number];

async function callHaiku(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[callHaiku] ANTHROPIC_API_KEY 없음");
    return null;
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key":           apiKey,
        "anthropic-version":   "2023-06-01",
        "content-type":        "application/json",
      },
      body: JSON.stringify({
        model:      HAIKU_MODEL,
        max_tokens: 20,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[callHaiku] API error", { status: res.status, body });
      return null;
    }
    const data = await res.json();
    const raw = (data?.content?.[0]?.text as string | undefined)?.trim().toLowerCase() ?? null;
    console.log("[callHaiku] raw response:", raw);
    return raw;
  } catch (err) {
    console.error("[callHaiku] fetch exception", err);
    return null;
  }
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function runClassifyFilings(): Promise<CollectResult> {
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("filings")
    .select("id, title, summary_kr")
    .is("event_type", null)
    .eq("form_type", "8-K")
    .not("summary_kr", "is", null)
    .order("filed_at", { ascending: false })
    .limit(BATCH_LIMIT);

  if (error) return { ok: false, error: error.message, retryable: true };

  const emptyDist = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;

  if (!rows || rows.length === 0) {
    return { ok: true, total: 0, classified: 0, distribution: emptyDist, otherRate: "0%" };
  }

  const distribution: Record<Category, number> = { ...emptyDist };
  let classified = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title       = row.title       ?? "";
    const description = row.summary_kr  ?? "";

    const prompt = `다음 SEC 8-K 공시 제목과 설명을 읽고 아래 카테고리 중 하나만 반환하라.
카테고리: ceo_change, cfo_change, buyback, ma, guidance, contract, dividend, offering, lawsuit, earnings, fda_approval, dividend_increase, sec_investigation, bankruptcy, other

카테고리 설명 (아래 4개는 특히 구분해서 판단):
- fda_approval: FDA 승인, 신약 허가, 임상시험 승인 관련
- dividend_increase: 배당 확대, 배당금 인상 관련
- sec_investigation: SEC 조사, 증권거래위원회 조사, 회계 부정 조사 관련
- bankruptcy: 파산 신청, Chapter 11, 법정관리 관련

제목: ${title}
설명: ${description}
카테고리 단어 하나만 출력. 다른 텍스트 금지.`;

    const raw      = await callHaiku(prompt);
    const category = (raw && (CATEGORIES as readonly string[]).includes(raw))
      ? (raw as Category)
      : "other";

    const { error: updateErr } = await admin
      .from("filings")
      .update({ event_type: category })
      .eq("id", row.id);

    if (!updateErr) {
      distribution[category]++;
      classified++;
    } else {
      console.error("[classify-filings] UPDATE failed", {
        id: row.id,
        category,
        error: updateErr.message,
      });
    }

    if (i < rows.length - 1) await delay(DELAY_MS);
  }

  const otherPct  = classified > 0 ? Math.round((distribution.other / classified) * 100) : 0;
  const otherRate = `${otherPct}%`;

  const result: CollectResult = {
    ok: true,
    total: rows.length,
    classified,
    distribution,
    otherRate,
  };

  if (otherPct > 40) {
    result.warning = "other 비율 높음 — 프롬프트 개선 검토";
  }

  return result;
}
