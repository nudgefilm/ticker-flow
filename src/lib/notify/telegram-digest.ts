import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";

const TELEGRAM_API = "https://api.telegram.org";

const EVENT_TYPE_LABELS: Record<string, string> = {
  ceo_change: "CEO 교체",
  cfo_change: "CFO 교체",
  buyback: "자사주 매입",
  ma: "M&A",
  guidance: "가이던스 변경",
  contract: "대규모 계약",
  offering: "증자",
  dividend: "배당",
};

const NOTIFY_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS);

async function postMessage(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }
}

type FilingRow = {
  id: string;
  ticker: string;
  event_type: string;
  summary_kr: string | null;
  filed_at: string;
};

type TickerRow = {
  ticker: string;
  name_kr: string | null;
  name_en: string | null;
};

export async function sendTelegramFilingDigest(): Promise<{ sent: boolean; count: number }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) throw new Error("TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 없음");

  // requires: ALTER TABLE filings ADD COLUMN notified_telegram boolean NOT NULL DEFAULT false;
  const admin = createAdminClient() as unknown as ReturnType<typeof createAdminClient> & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };

  const { data: filings, error } = await (admin as any)
    .from("filings")
    .select("id, ticker, event_type, summary_kr, filed_at")
    .in("event_type", NOTIFY_EVENT_TYPES)
    .eq("notified_telegram", false)
    .not("summary_kr", "is", null)
    .order("filed_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  if (!filings || filings.length === 0) return { sent: false, count: 0 };

  const rows = filings as FilingRow[];

  const { data: tickerRows } = await (admin as any)
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", rows.map((r) => r.ticker));

  const nameMap = new Map<string, string>(
    ((tickerRows ?? []) as TickerRow[]).map((r) => [
      r.ticker,
      r.name_kr ?? r.name_en ?? r.ticker,
    ])
  );

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;

  const lines: string[] = [`📋 오늘의 주요 공시 (${dateLabel})`, ""];

  rows.forEach((row, i) => {
    const name = nameMap.get(row.ticker) ?? row.ticker;
    const typeLabel = EVENT_TYPE_LABELS[row.event_type] ?? row.event_type;
    const summary = row.summary_kr ? row.summary_kr.slice(0, 100) : "";

    lines.push(`${i + 1}. $${row.ticker} · ${name}`);
    lines.push(`   ${typeLabel}`);
    if (summary) lines.push(`   ${summary}`);
    lines.push("");
  });

  lines.push("▶ 전체 내용 확인: tickerflow.net");
  lines.push("");
  lines.push("─");
  lines.push("※ 공개된 정보를 수집·정리한 참고용 자료입니다.");
  lines.push("※ 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.");

  await postMessage(botToken, chatId, lines.join("\n"));

  const ids = rows.map((r) => r.id);
  await (admin as any)
    .from("filings")
    .update({ notified_telegram: true })
    .in("id", ids);

  return { sent: true, count: rows.length };
}

export async function runTelegramDigest(): Promise<CollectResult> {
  try {
    const { sent, count } = await sendTelegramFilingDigest();
    return { ok: true, sent, count };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "텔레그램 다이제스트 발송 실패";
    console.error("[notify/telegram-digest]", msg);
    return { ok: false, error: msg, retryable: true };
  }
}
