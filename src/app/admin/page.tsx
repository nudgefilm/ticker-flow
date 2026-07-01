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
  guidance_up: "가이던스Up", guidance_down: "가이던스Down",
  price_up_20: "30일+20%", price_up_10: "30일+10%",
  volume_spike: "거래량급증", volatility_spike: "변동성급증",
  short_decrease: "공매도↓", target_up: "목표가↑",
};

function tagStyle(tag: string): string {
  switch (tag) {
    // 신규 Corporate Events 카테고리 — 요청된 개별 색상
    case "fda_approval":
      return "bg-green-500/10 text-green-400 border border-green-500/20";
    case "dividend_increase":
      return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "sec_investigation":
      return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
    case "bankruptcy":
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    case "offering": case "guidance_down":
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    case "ceo_change":
    case "eps_beat": case "revenue_beat": case "both_beat": case "beat_streak_4":
      return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    case "buyback": case "ma": case "contract":
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

type ScreenerMetadata = {
  smart: number;
  earnings: number;
  events: number;
  market: number;
  news: number;
  filingCount: number;
  newsCount: number;
  sectorPenalty: boolean;
};

type Top30Row = {
  ticker: string;
  rank: number | null;
  final_score: number | null;
  reason_tags: string[] | null;
  metadata: ScreenerMetadata | null;
};

function todayDateStr(): string {
  // top30.ts가 저장 시 사용하는 날짜 포맷(UTC 기준)과 동일하게 맞춘다.
  return new Date().toISOString().slice(0, 10);
}

async function AdminWatchSection() {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("top30_daily")
    .select("ticker, rank, final_score, reason_tags, metadata")
    .eq("date", todayDateStr())
    .order("rank", { ascending: true });

  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-[#a6a6a6]">
        오늘 스크리너 데이터가 없습니다. 트리거 페이지에서 &apos;TOP30 선정&apos;을 실행해 주세요.
      </p>
    );
  }

  const candidates = rows as unknown as Top30Row[];

  const { data: tickerRows } = await admin
    .from("tickers")
    .select("ticker, name_kr, name_en")
    .in("ticker", candidates.map(c => c.ticker));
  const nameMap = new Map(
    (tickerRows ?? []).map(r => [r.ticker, r.name_kr ?? r.name_en ?? r.ticker])
  );

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {candidates.map((item) => {
        const meta = item.metadata;
        return (
          <div
            key={item.ticker}
            className={cn(
              "rounded-[6px] border p-4",
              meta?.sectorPenalty
                ? "border-white/[0.04] bg-[#0d0d0d] opacity-70"
                : "border-white/[0.08] bg-[#0f0f0f]"
            )}
          >
            <div className="flex items-start justify-between gap-1">
              <Link
                href={`/stocks/${item.ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-medium text-[#cccccc]"
              >
                {item.ticker}
              </Link>
              <span className="shrink-0 text-[10px] text-[#a6a6a6]">
                {(item.final_score ?? 0).toFixed(1)}pt
              </span>
            </div>
            <Link
              href={`/stocks/${item.ticker}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate text-sm font-medium text-white hover:underline"
            >
              {nameMap.get(item.ticker) ?? item.ticker}
            </Link>
            <div className="mt-2 flex flex-wrap gap-1">
              {(item.reason_tags ?? []).slice(0, 4).map((tag) => (
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
            <p className="mt-2.5 text-[10px] text-[#d4d4d4]">
              공시 {meta?.filingCount ?? 0}건 · 뉴스 {meta?.newsCount ?? 0}건
            </p>
            <p className="mt-0.5 text-[9px] text-[#999999]">
              S:{(meta?.smart ?? 0).toFixed(1)} P:{(meta?.earnings ?? 0).toFixed(1)} E:{(meta?.events ?? 0).toFixed(1)} M:{(meta?.market ?? 0).toFixed(1)} N:{(meta?.news ?? 0).toFixed(1)}
            </p>
          </div>
        );
      })}
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

// ─── 수집 시각 배지 ──────────────────────────────────────────────────────────────

function formatCollectionTime(iso: string): string {
  const d = new Date(iso);
  const utcHH = String(d.getUTCHours()).padStart(2, "0");
  const utcMM = String(d.getUTCMinutes()).padStart(2, "0");
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const kstHH = String(kst.getUTCHours()).padStart(2, "0");
  const kstMM = String(kst.getUTCMinutes()).padStart(2, "0");
  const y   = kst.getUTCFullYear();
  const m   = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `[ KST ${kstHH}:${kstMM}, ${y}. ${m}. ${day} | UTC ${utcHH}:${utcMM} ]`;
}

async function CollectionTimeBadge() {
  // updated_at은 top30_daily에 신규 추가되는 컬럼 — 생성된 타입에 아직 없어 any 캐스트 사용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const { data } = await admin
    .from("top30_daily")
    .select("updated_at")
    .eq("date", todayDateStr())
    .order("updated_at", { ascending: false })
    .limit(1);

  const updatedAt = data?.[0]?.updated_at as string | undefined;
  if (!updatedAt) return null;

  return (
    <span className="shrink-0 whitespace-nowrap text-xs text-[#a6a6a6]">
      {formatCollectionTime(updatedAt)}
    </span>
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
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-white">티커플로우 스크리너(TickerFlow Screener)</h2>
            <p className="mt-1 text-xs text-red-400/70">
              스마트머니(45%) + 실적품질(30%) + 기업이벤트(15%) + 시장활동(5%) + 뉴스신뢰도(5%) | 시간감쇠 적용 | 섹터 분산 보정 | 음수 종목 제외 | 상위 30개 선정
            </p>
          </div>
          <Suspense fallback={null}>
            <CollectionTimeBadge />
          </Suspense>
        </div>
        <Suspense fallback={<AdminWatchSkeleton />}>
          <AdminWatchSection />
        </Suspense>
        <AdminTriggerButtons />
      </div>
    </div>
  );
}
