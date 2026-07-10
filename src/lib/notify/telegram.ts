import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "@/lib/collect/types";
import { computeRange, fetchTopCompanies } from "@/lib/watchlist-brief";

// 2026-07-11: 이 함수는 어떤 cron/트리거에도 연결되어 있지 않은 비활성(dead
// code) 상태였다(세션97 규제 리스크 점검에서 발견). 재활성화 시를 대비해,
// top30_daily.rank(TickerFlow 자체 스코어링 순위) 기반 "오늘의 기업 동향
// TOP10"을 다른 공개 지면과 동일하게 최근 7일 공시+뉴스+내부자매수 건수
// 기반(fetchTopCompanies)으로 미리 교체해둔다.

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

export async function sendTelegramActivitySummary(): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) throw new Error("TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID 없음");

  const admin = createAdminClient();
  const range = computeRange(7);
  const companies = await fetchTopCompanies(admin, range, 10);

  if (companies.length === 0) throw new Error("최근 7일 활동 데이터 없음");

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일`;

  const lines: string[] = [
    `📊 최근 7일 활동이 많았던 기업 (${dateLabel} 기준)`,
    "",
  ];

  for (const company of companies) {
    lines.push(`· $${company.ticker} ${company.name} — ${company.activityCount}건`);
    if (company.descriptions.length > 0) lines.push(`   ${company.descriptions.join(" · ")}`);
  }

  lines.push("");
  lines.push("※ 본 정보는 공개된 데이터를 기반으로 한 참고용입니다.");
  lines.push("※ 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.");

  await postMessage(botToken, chatId, lines.join("\n"));
}

export async function runTelegramNotify(): Promise<CollectResult> {
  try {
    await sendTelegramActivitySummary();
    return { ok: true, sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "텔레그램 발송 실패";
    console.error("[notify/telegram]", msg);
    return { ok: false, error: msg, retryable: true };
  }
}
