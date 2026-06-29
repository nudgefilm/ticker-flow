import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";
import { TAG_LABELS_KR } from "@/lib/collect/scoring";

const TELEGRAM_API = "https://api.telegram.org";

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

type Top10Row = {
  ticker: string;
  rank: number;
  reason_tags: string[] | null;
};

type TickerRow = { ticker: string; name_kr: string | null; name_en: string | null };

export async function sendTelegramTop10(): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) throw new Error("TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 없음");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: top10, error } = await admin
    .from("top30_daily")
    .select("ticker, rank, reason_tags")
    .eq("date", todayStr)
    .lte("rank", 10)
    .order("rank", { ascending: true });

  if (error) throw new Error(error.message);
  if (!top10 || top10.length === 0) throw new Error("오늘 TOP10 데이터 없음 — top30 먼저 실행");

  const { data: tickerRows } = await admin
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", (top10 as Top10Row[]).map(r => r.ticker));

  const nameMap = new Map<string, string>(
    ((tickerRows ?? []) as TickerRow[]).map(r => [
      r.ticker, r.name_kr ?? r.name_en ?? r.ticker,
    ])
  );

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;

  const lines: string[] = [
    `📊 오늘의 기업 동향 TOP10 (${dateLabel})`,
    "",
  ];

  for (const row of top10 as Top10Row[]) {
    const name = nameMap.get(row.ticker) ?? row.ticker;
    const tagStr = (row.reason_tags ?? [])
      .slice(0, 3)
      .map(t => TAG_LABELS_KR[t] ?? t)
      .join(" · ");

    lines.push(`${row.rank}. $${row.ticker} ${name}`);
    if (tagStr) lines.push(`   ${tagStr}`);
  }

  lines.push("");
  lines.push("※ 본 정보는 공개된 데이터를 기반으로 한 참고용입니다.");
  lines.push("※ 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.");

  await postMessage(botToken, chatId, lines.join("\n"));
}

export async function runTelegramNotify(): Promise<CollectResult> {
  try {
    await sendTelegramTop10();
    return { ok: true, sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "텔레그램 발송 실패";
    console.error("[notify/telegram]", msg);
    return { ok: false, error: msg, retryable: true };
  }
}
