import Link from "next/link";
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
import AdminTriggerButtons from "./trigger-buttons";
import { computeScores } from "@/lib/collect/scoring";

export const dynamic = "force-dynamic";

// ─── 표시 레이블 (어드민 배지용 축약형) ────────────────────────────────────────

const TAG_LABELS: Record<string, string> = {
  fda_approval: "FDA승인", contract: "대형계약", buyback: "자사주매입", ma: "M&A",
  dividend_increase: "배당증가", ceo_change: "CEO교체",
  offering: "유상증자", sec_investigation: "SEC조사", bankruptcy: "파산",
  insider_buy: "내부자취득", insider_buy_large: "대규모취득",
  "13f_new": "13F신규", "13f_increase": "13F증가",
  eps_beat: "EPS상회", revenue_beat: "매출상회", both_beat: "실적상회",
  beat_streak_4: "4분기연속상회",
  guidance_up: "가이던스Up", price_up_20: "30일+20%", price_up_10: "30일+10%",
  volume_spike: "거래량급증", volatility_spike: "변동성급증",
  short_decrease: "공매도↓", target_up: "목표가↑",
};

function tagStyle(tag: string): string {
  switch (tag) {
    case "sec_investigation": case "bankruptcy": case "offering":
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    case "ceo_change":
    case "eps_beat": case "revenue_beat": case "both_beat": case "beat_streak_4":
      return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    case "fda_approval": case "buyback": case "ma": case "contract": case "dividend_increase":
    case "13f_new": case "13f_increase":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "insider_buy": case "insider_buy_large":
      return "bg-green-500/10 text-green-400 border border-green-500/20";
    case "guidance_up":
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "volume_spike": case "volatility_spike": case "short_decrease":
      return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
    case "target_up":
      return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
    default:
      return "bg-white/[0.06] text-[#a6a6a6] border border-white/[0.08]";
  }
}

// ─── 섹션 ──────────────────────────────────────────────────────────────────────

async function AdminWatchSection() {
  const admin = createAdminClient();
  const scored = await computeScores();

  if (scored.length === 0) {
    return <p className="text-sm text-[#a6a6a6]">최근 14일 내 해당 조건의 종목이 없습니다.</p>;
  }

  const candidates = scored.slice(0, 30);

  const { data: tickerRows } = await admin
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", candidates.map(c => c.ticker));
  const nameMap = new Map(
    (tickerRows ?? []).map(r => [r.ticker, r.name_kr ?? r.name_en ?? r.ticker])
  );

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {candidates.map((item) => (
        <div
          key={item.ticker}
          className={cn(
            "rounded-[6px] border p-4",
            item.metadata.sectorPenalty
              ? "border-white/[0.04] bg-[#0d0d0d] opacity-70"
              : "border-white/[0.08] bg-[#0f0f0f]"
          )}
        >
          <div className="flex items-start justify-between gap-1">
            <Link
              href={`/stocks/${item.ticker}`}
              className="inline-block rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-medium text-[#cccccc]"
            >
              {item.ticker}
            </Link>
            <span className="shrink-0 text-[10px] text-[#a6a6a6]">
              {item.finalScore.toFixed(1)}pt
            </span>
          </div>
          <p className="mt-2 truncate text-sm font-medium text-white">
            {nameMap.get(item.ticker) ?? item.ticker}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.reasonTags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium",
                  tagStyle(tag)
                )}
              >
                {TAG_LABELS[tag] ?? tag}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[10px] text-[#a6a6a6]">
            공시 {item.metadata.filingCount}건 · 뉴스 {item.metadata.newsCount}건
          </p>
          <p className="mt-0.5 text-[9px] text-[#a6a6a6]/60">
            S:{item.metadata.smart.toFixed(1)} P:{item.metadata.earnings.toFixed(1)} E:{item.metadata.events.toFixed(1)} M:{item.metadata.market.toFixed(1)} N:{item.metadata.news.toFixed(1)}
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
        <div key={i} className="h-28 animate-pulse rounded-[6px] bg-white/[0.04]" />
      ))}
    </div>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const admin = createAdminClient();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const [
    { count: totalCount },
    { count: proCount },
    { count: newTodayCount },
    { count: filingsTodayCount },
    { count: newsTodayCount },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    admin.from("filings").select("*", { count: "exact", head: true }).gte("filed_at", todayISO),
    admin.from("news").select("*", { count: "exact", head: true }).gte("published_at", todayISO),
  ]);

  const total    = totalCount ?? 0;
  const pro      = proCount ?? 0;
  const free     = total - pro;
  const convRate = total > 0 ? ((pro / total) * 100).toFixed(1) : "—";
  const freePct  = total > 0 ? (free / total) * 100 : 0;

  const activityItems = [
    { label: "오늘 신규 가입",       value: `${newTodayCount ?? 0}명` },
    { label: "오늘 공시 수집",       value: `${(filingsTodayCount ?? 0).toLocaleString("ko-KR")}건` },
    { label: "오늘 뉴스 수집",       value: `${(newsTodayCount ?? 0).toLocaleString("ko-KR")}건` },
    { label: "수집 오류",           value: "준비 중" },
    { label: "Claude API 오늘 비용", value: "준비 중" },
    { label: "마지막 수집",          value: "준비 중" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">어드민 홈</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">TickerFlow 운영 현황 요약</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">총 가입자</p>
              <p className="mt-1.5 text-2xl font-semibold text-white">
                {total.toLocaleString("ko-KR")}명
              </p>
              <p className="mt-1 text-xs text-[#a6a6a6]">오늘 +{newTodayCount ?? 0}명 신규</p>
            </div>
            <IconUsers size={20} stroke={1.5} className="text-blue-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">유료 전환율</p>
              <p className="mt-1.5 text-2xl font-semibold text-white">{convRate}%</p>
              <p className="mt-1 text-xs text-[#a6a6a6]">Pro {pro}명 / Free {free}명</p>
            </div>
            <IconTrendingUp size={20} stroke={1.5} className="text-green-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">일별 방문자</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#a6a6a6]">준비 중</p>
              <p className="mt-1 text-xs text-[#a6a6a6]">—</p>
            </div>
            <IconEye size={20} stroke={1.5} className="text-purple-400" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#a6a6a6]">월 매출</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#a6a6a6]">준비 중</p>
              <p className="mt-1 text-xs text-[#a6a6a6]">—</p>
            </div>
            <IconCurrencyDollar size={20} stroke={1.5} className="text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 현황 */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">오늘 현황</h2>
          <div className="space-y-3">
            {activityItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                  <span className="text-sm text-[#a6a6a6]">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 일별 방문자 (준비 중) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">일별 방문자 (7일)</h2>
          <div className="flex h-28 items-center justify-center">
            <p className="text-sm text-[#a6a6a6]">준비 중</p>
          </div>
        </div>
      </div>

      {/* 플랜 분포 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">플랜 분포</h2>
        <div className="flex items-center gap-4">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${freePct.toFixed(1)}%` }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm">
            <span className="text-[#a6a6a6]">
              Free <span className="font-medium text-white">{free}명</span>
            </span>
            <span className="text-[#a6a6a6]">
              Pro <span className="font-medium text-green-400">{pro}명</span>
            </span>
          </div>
        </div>
      </div>

      {/* TickerFlow Screener (내부용) */}
      <div className="rounded-xl border border-red-500/60 bg-red-500/[0.03] p-4 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-red-400">TickerFlow Screener</h2>
          <p className="mt-1 text-xs text-red-400/70">
            SmartMoney×0.45 + Earnings×0.30 + Events×0.15 + Market×0.05 + News×0.05 | Decay | 섹터다양성 | 상위 30개
          </p>
        </div>
        <Suspense fallback={<AdminWatchSkeleton />}>
          <AdminWatchSection />
        </Suspense>
        <AdminTriggerButtons />
      </div>
    </div>
  );
}
