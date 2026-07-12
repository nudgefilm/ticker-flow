import { createAdminClient } from "@/lib/supabase/admin";
import type { CollectResult } from "./types";
import { resend } from "@/lib/email/resend";
import { weeklyDigestEmail } from "@/lib/email/templates";
import type { WeeklyBriefData } from "@/lib/watchlist-brief";
import {
  computeThisWeekRange,
  fetchTopCompanies,
  fetchMarketChangeStats,
  fetchPeriodComparison,
  fetchSectorTrends,
  fetchTopFilings,
  fetchEarningsHighlights,
  generateBriefSummary,
} from "@/lib/watchlist-brief";
import { DIGEST_FROM, getDigestRecipientEmails } from "./digest";

// 2026-07-13 신설 — 토요일(주말) 전용 TICKERFLOW WEEKLY 이메일. 어드민 "주간
// BRIEF 생성"(weekly-brief.ts)이 매주 월요일 09:00 KST에 만드는 weekly_briefs
// 캐시는 대시보드 위젯("지난 주 리뷰")용이라, 토요일 발송 시점엔 최대 5일 지난
// 데이터가 된다. 그래서 이 파일은 weekly-brief.ts와 **동일한 집계 함수**를
// 그대로 재사용하되(집계 로직 신규 작성 없음), computeThisWeekRange()로
// "이번 주 월요일 00:00 UTC ~ 지금(발송 시점)" 구간만 새로 계산해 그 주
// 월~금 데이터가 온전히 반영되도록 한다. weekly_briefs 테이블에는 쓰지
// 않는다(대시보드 캐시와 의미가 다른 별도 계산이므로 서로 덮어쓰지 않음).

// 헤더에 표시할 "이번 주" 기간 라벨 — "7월 7일 ~ 7월 11일" 형식(월~금).
function weekRangeLabel(mondayIso: string): string {
  const monday = new Date(mondayIso);
  const friday = new Date(monday.getTime() + 4 * 86_400_000);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(d);
  return `${fmt(monday)} ~ ${fmt(friday)}`;
}

/**
 * weekly-brief.ts(runWeeklyBriefCollect)와 동일한 조회 함수 조합을 이번 주
 * 월~금 range로 호출해 WeeklyBriefData를 만든다. 오늘 활동이 전혀 없으면
 * null을 반환한다(gatherDigestData와 동일한 규칙).
 */
export async function gatherWeeklyDigestData(): Promise<{ data: WeeklyBriefData; label: string } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const range = computeThisWeekRange();

  const [topCompanies, marketStats, comparison, sectors, filings, earningsHighlights] = await Promise.all([
    fetchTopCompanies(admin, range, 10),
    fetchMarketChangeStats(admin, range),
    fetchPeriodComparison(admin, range),
    fetchSectorTrends(admin, range, 5),
    fetchTopFilings(admin, range, 10),
    fetchEarningsHighlights(admin, range, 10),
  ]);

  if (topCompanies.length === 0) return null;

  const summary = await generateBriefSummary({
    periodLabel:        "이번 주",
    top1Name:            topCompanies[0]?.name ?? "",
    newEntrantCount:     comparison.newEntrants.length,
    filingsCount:        marketStats.filingsCount,
    epsBeatCount:        marketStats.epsBeatCount,
    institutionalCount:  marketStats.institutionalCount,
    insiderBuyCount:     marketStats.insiderBuyCount,
    sentenceCount:       "2~3문장",
  });

  const data: WeeklyBriefData = {
    topCompanies,
    marketStats,
    newEntrants: comparison.newEntrants,
    dropped: comparison.dropped,
    movers: comparison.movers,
    sectors,
    filings,
    earningsHighlights,
    summary,
  };

  return { data, label: weekRangeLabel(range.startIso) };
}

export async function runWeeklyDigestCollect(): Promise<CollectResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { emails: targetEmails, error: recipientError } = await getDigestRecipientEmails(admin);
  if (recipientError) return { ok: false, error: recipientError };
  if (targetEmails.length === 0) return { ok: true, sent: 0, message: "발송 대상 없음" };

  const weekly = await gatherWeeklyDigestData();
  if (!weekly) return { ok: true, sent: 0, message: "이번 주 활동 데이터 없음" };

  const html = weeklyDigestEmail(weekly.data, weekly.label);
  const subject = `TickerFlow Pro 위클리 다이제스트 · ${weekly.label} KST`;
  let sent = 0;
  let errors = 0;
  let lastErrorDetail: string | null = null;

  for (let i = 0; i < targetEmails.length; i++) {
    const email = targetEmails[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 550));

    let { error } = await resend.emails.send({ from: DIGEST_FROM, to: email, subject, html });

    if (error?.name === "rate_limit_exceeded") {
      await new Promise((r) => setTimeout(r, 1100));
      ({ error } = await resend.emails.send({ from: DIGEST_FROM, to: email, subject, html }));
    }

    if (error) {
      errors++;
      lastErrorDetail = `${error.name}: ${error.message}`;
    } else {
      sent++;
    }
  }

  return {
    ok: true,
    sent,
    errors,
    total: targetEmails.length,
    ...(errors > 0 && lastErrorDetail ? { firstError: lastErrorDetail } : {}),
  };
}
