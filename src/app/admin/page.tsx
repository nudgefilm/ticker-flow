import { Suspense } from "react";
import {
  IconUsers,
  IconCurrencyDollar,
  IconEye,
  IconTrendingUp,
  IconCircleCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const kpiCards = [
  { label: "총 가입자", value: "127명", sub: "+18 이번 주", icon: IconUsers, color: "text-blue-400" },
  { label: "유료 전환율", value: "8.7%", sub: "Pro 11명 / Free 116명", icon: IconTrendingUp, color: "text-green-400" },
  { label: "일별 방문자", value: "342명", sub: "오늘 기준", icon: IconEye, color: "text-purple-400" },
  { label: "월 매출", value: "₩1,328,100", sub: "이번 달 예상", icon: IconCurrencyDollar, color: "text-yellow-400" },
];

const recentActivity = [
  { label: "오늘 신규 가입", value: "5명", status: "ok" },
  { label: "오늘 공시 수집", value: "1,203건", status: "ok" },
  { label: "오늘 뉴스 수집", value: "847건", status: "ok" },
  { label: "수집 오류", value: "0건", status: "ok" },
  { label: "Claude API 오늘 비용", value: "$1.24", status: "ok" },
  { label: "마지막 수집", value: "09:15", status: "ok" },
];

// ─── 내부 관심 종목 ────────────────────────────────────────────────────────────

type SignalTag = "내부자 매수" | "가이던스" | "실적 상회" | "활동 활발";

function tagStyle(tag: SignalTag): string {
  switch (tag) {
    case "내부자 매수": return "bg-green-500/10 text-green-400 border border-green-500/20";
    case "가이던스":   return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "실적 상회":  return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    case "활동 활발":  return "bg-white/[0.06] text-[#a6a6a6] border border-white/[0.08]";
  }
}

async function AdminWatchSection() {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

  const [insiderRes, guidanceRes, earningsRes, filingsRes, newsRes] = await Promise.all([
    admin.from("insider_trades")
      .select("ticker")
      .eq("transaction_type", "buy")
      .gte("transaction_date", sevenDaysAgo.slice(0, 10))
      .limit(300),
    admin.from("filings")
      .select("ticker")
      .eq("event_type", "guidance")
      .gte("filed_at", sevenDaysAgo)
      .limit(200),
    admin.from("earnings")
      .select("ticker, actual_eps, eps_estimate")
      .not("actual_eps", "is", null)
      .not("eps_estimate", "is", null)
      .gte("report_date", ninetyDaysAgo)
      .limit(300),
    admin.from("filings")
      .select("ticker")
      .gte("filed_at", sevenDaysAgo)
      .limit(1000),
    admin.from("news")
      .select("ticker")
      .gte("published_at", sevenDaysAgo)
      .limit(1000),
  ]);

  const insiderBuySet = new Set((insiderRes.data ?? []).map((r) => r.ticker));
  const guidanceSet   = new Set((guidanceRes.data ?? []).map((r) => r.ticker));
  const epsBeatSet    = new Set(
    (earningsRes.data ?? [])
      .filter((r) => r.actual_eps != null && r.eps_estimate != null && r.actual_eps > r.eps_estimate)
      .map((r) => r.ticker)
  );

  const filingsCount = new Map<string, number>();
  for (const r of filingsRes.data ?? []) {
    filingsCount.set(r.ticker, (filingsCount.get(r.ticker) ?? 0) + 1);
  }
  const newsCount = new Map<string, number>();
  for (const r of newsRes.data ?? []) {
    if (!r.ticker) continue;
    newsCount.set(r.ticker, (newsCount.get(r.ticker) ?? 0) + 1);
  }

  // 신호가 있는 종목만 후보로
  const signalTickers = new Set([...insiderBuySet, ...guidanceSet, ...epsBeatSet]);

  const candidates = Array.from(signalTickers)
    .map((ticker) => {
      const fc = filingsCount.get(ticker) ?? 0;
      const nc = newsCount.get(ticker) ?? 0;
      const tags: SignalTag[] = [];
      if (insiderBuySet.has(ticker)) tags.push("내부자 매수");
      if (guidanceSet.has(ticker))   tags.push("가이던스");
      if (epsBeatSet.has(ticker))    tags.push("실적 상회");
      if (fc + nc >= 5)              tags.push("활동 활발");
      const score = tags.length * 10 + Math.min(fc + nc, 20);
      return { ticker, tags, filings: fc, news: nc, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-[#a6a6a6]">최근 7일 내 해당 조건의 종목이 없습니다.</p>
    );
  }

  const { data: tickerRows } = await admin
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", candidates.map((c) => c.ticker));

  const nameMap = new Map(
    (tickerRows ?? []).map((r) => [r.ticker, r.name_kr ?? r.name_en ?? r.ticker])
  );

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {candidates.map((item) => (
        <div
          key={item.ticker}
          className="rounded-[6px] border border-white/[0.08] bg-[#0f0f0f] p-4"
        >
          <span className="inline-block rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-medium text-[#cccccc]">
            {item.ticker}
          </span>
          <p className="mt-2 truncate text-sm font-medium text-white">
            {nameMap.get(item.ticker) ?? item.ticker}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium",
                  tagStyle(tag)
                )}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-[#a6a6a6]">
            공시 {item.filings}건 · 뉴스 {item.news}건
          </p>
        </div>
      ))}
    </div>
  );
}

function AdminWatchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[6px] bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">어드민 홈</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">TickerFlow 운영 현황 요약</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#a6a6a6]">{card.label}</p>
                <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
                <p className="mt-1 text-xs text-[#a6a6a6]">{card.sub}</p>
              </div>
              <card.icon size={20} stroke={1.5} className={card.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 현황 */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">오늘 현황</h2>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.status === "ok" ? (
                    <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                  ) : (
                    <IconAlertCircle size={14} stroke={1.5} className="text-red-400" />
                  )}
                  <span className="text-sm text-[#a6a6a6]">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 일별 방문자 추이 (목업) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">일별 방문자 (7일)</h2>
          <div className="flex items-end gap-1.5 h-28">
            {[210, 265, 190, 320, 280, 305, 342].map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-blue-500/30"
                  style={{ height: `${(v / 342) * 100}%` }}
                />
                <span className="text-[10px] text-[#a6a6a6]">
                  {["월", "화", "수", "목", "금", "토", "일"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 플랜 분포 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">플랜 분포</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 overflow-hidden rounded-full bg-[#1a1a1a] h-3">
            <div className="h-full rounded-full bg-blue-500" style={{ width: "91.3%" }} />
          </div>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <span className="text-[#a6a6a6]">Free <span className="text-white font-medium">116명</span></span>
            <span className="text-[#a6a6a6]">Pro <span className="text-green-400 font-medium">11명</span></span>
          </div>
        </div>
      </div>

      {/* 내부 관심 종목 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-white">내부 관심 종목</h2>
          <p className="mt-1 text-xs text-[#a6a6a6]">
            내부자 매수 + 가이던스 상향 공시 + 실적 예상치 상회 + 뉴스 활발도 증가 종목을 종합해 선정합니다.
          </p>
        </div>
        <Suspense fallback={<AdminWatchSkeleton />}>
          <AdminWatchSection />
        </Suspense>
      </div>
    </div>
  );
}
