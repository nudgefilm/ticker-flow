import Link from "next/link";
import { Suspense } from "react";
import {
  IconUsers,
  IconCurrencyDollar,
  IconEye,
  IconTrendingUp,
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
  date: string;
};

async function AdminWatchSection() {
  const admin = createAdminClient();

  // 오늘 날짜로 고정 조회하면 당일 Cron(TOP30 선정) 실행 전에는 항상 비어 보인다.
  // 가장 최근 저장된 날짜의 TOP30을 표시하도록 date DESC, rank ASC 순으로 가져온다.
  const { data: rows } = await admin
    .from("top30_daily")
    .select("ticker, rank, final_score, reason_tags, metadata, date")
    .order("date", { ascending: false })
    .order("rank", { ascending: true })
    .limit(30);

  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-[#a6a6a6]">
        스크리너 데이터가 없습니다. 트리거 페이지에서 &apos;TOP30 선정&apos;을 실행해 주세요.
      </p>
    );
  }

  // limit(30)이 최근 날짜의 row 수가 30개 미만일 때 전날 데이터까지 끌어올 수 있으므로
  // 가장 최근 날짜(첫 row 기준)로 한 번 더 필터링해 날짜 혼재를 방지한다.
  const latestDate = (rows[0] as unknown as Top30Row).date;
  const candidates = (rows as unknown as Top30Row[]).filter((r) => r.date === latestDate);

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
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const kstHH = String(kst.getUTCHours()).padStart(2, "0");
  const kstMM = String(kst.getUTCMinutes()).padStart(2, "0");
  const m   = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${m}. ${day} · KST ${kstHH}:${kstMM}`;
}

async function CollectionTimeBadge() {
  // updated_at은 top30_daily에 신규 추가되는 컬럼 — 생성된 타입에 아직 없어 any 캐스트 사용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  // 오늘 날짜 고정 조회 대신 가장 최근 저장된 날짜 기준으로 조회
  const { data } = await admin
    .from("top30_daily")
    .select("updated_at")
    .order("date", { ascending: false })
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

// ─── 수집 현황 (collect_runs 기준) ──────────────────────────────────────────────
// collect_runs는 어드민 트리거 페이지에서 수동 실행한 기록만 남는다. Vercel Cron
// 자동 실행은 이 테이블에 기록되지 않으므로, 자동으로는 정상 동작 중이어도
// 그날 관리자가 버튼을 누르지 않았다면 "미실행"으로 표시될 수 있다.

type JobSpec = { job: string; label: string };

const DAILY_JOBS: JobSpec[] = [
  { job: "filings",           label: "공시 수집 (SEC EDGAR)" },
  { job: "news",               label: "뉴스 수집 (Finnhub)" },
  { job: "translate",          label: "번역 재실행 (Haiku)" },
  { job: "earnings",           label: "실적 캘린더" },
  { job: "macro",              label: "경제지표" },
  { job: "calls",              label: "어닝콜 요약" },
  { job: "analyst",            label: "애널리스트 추천" },
  { job: "prices",             label: "주가 히스토리" },
  { job: "earnings-actual",    label: "실적 어닝서프라이즈" },
  { job: "classify-filings",   label: "공시 이벤트 자동 분류" },
  { job: "top30",              label: "TOP30 스크리너 선정" },
  { job: "digest",             label: "이메일 다이제스트 발송" },
];

const WEEKLY_JOBS: JobSpec[] = [
  { job: "13f",             label: "13F 기관 보유" },
  { job: "short-interest",  label: "Short Interest" },
  { job: "price-targets",   label: "Price Target" },
  { job: "profile",         label: "종목 프로필" },
];

type RunInfo = { job_type: string; status: string; started_at: string; finished_at: string | null };

function formatRunTimeKst(iso: string): string {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const m  = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d  = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${m}/${d} ${hh}:${mm} KST`;
}

function classifyRunStatus(run: RunInfo | undefined, isRecentEnough: boolean): { label: string; className: string } {
  if (!run || !isRecentEnough) {
    return { label: "미실행", className: "bg-white/[0.06] text-[#a6a6a6] border border-white/[0.08]" };
  }
  if (run.status === "error") {
    return { label: "실패", className: "bg-red-500/10 text-red-400 border border-red-500/20" };
  }
  if (run.status === "running") {
    return { label: "실행중", className: "bg-blue-500/10 text-blue-400 border border-blue-500/20" };
  }
  return { label: "성공", className: "bg-green-500/10 text-green-400 border border-green-500/20" };
}

function CollectStatusRow({ label, run, isRecentEnough }: { label: string; run: RunInfo | undefined; isRecentEnough: boolean }) {
  const status = classifyRunStatus(run, isRecentEnough);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[6px] border border-white/[0.06] bg-[#0f0f0f] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-white">{label}</p>
        <p className="mt-0.5 text-[11px] text-[#a6a6a6]">
          {run ? formatRunTimeKst(run.started_at) : "기록 없음"}
        </p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", status.className)}>
        {status.label}
      </span>
    </div>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const admin = createAdminClient();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const allJobTypes = [...DAILY_JOBS, ...WEEKLY_JOBS].map((j) => j.job);
  const todayDateStr = todayStart.toISOString().slice(0, 10);

  const [
    { count: totalCount },
    { count: proCount },
    { count: newTodayCount },
    { data: runRows },
    { data: signupRows },
    { count: visitTotalCount },
    { count: visitLoggedInCount },
    { count: visitAnonCount },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
    admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayISO),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from("collect_runs")
      .select("job_type, status, started_at, finished_at")
      .in("job_type", allJobTypes)
      .gte("started_at", sevenDaysAgoIso)
      .order("started_at", { ascending: false }) as Promise<{ data: RunInfo[] | null }>,
    admin.from("profiles").select("created_at").gte("created_at", sevenDaysAgoIso),
    admin.from("page_visits").select("*", { count: "exact", head: true }).eq("visited_date", todayDateStr),
    admin.from("page_visits").select("*", { count: "exact", head: true }).eq("visited_date", todayDateStr).not("user_id", "is", null),
    admin.from("page_visits").select("*", { count: "exact", head: true }).eq("visited_date", todayDateStr).is("user_id", null),
  ]);

  const total    = totalCount ?? 0;
  const pro      = proCount ?? 0;
  const free     = total - pro;
  const convRate = total > 0 ? ((pro / total) * 100).toFixed(1) : "—";
  const freePct  = total > 0 ? (free / total) * 100 : 0;

  // job_type별 가장 최근 실행 1건만 유지 (started_at desc 정렬 결과이므로 첫 등장이 최신)
  const latestRunByJob = new Map<string, RunInfo>();
  for (const row of runRows ?? []) {
    if (!latestRunByJob.has(row.job_type)) latestRunByJob.set(row.job_type, row);
  }

  // 최근 7일 일별 신규 가입 집계 (Vercel Analytics 미연동 — 방문자 대신 신규 가입으로 대체)
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const signupMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    signupMap[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = 0;
  }
  for (const row of signupRows ?? []) {
    if (!row.created_at) continue;
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key in signupMap) signupMap[key]++;
  }
  const dailySignups = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    return {
      day:   dayNames[d.getDay()],
      value: signupMap[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] ?? 0,
    };
  });
  const maxSignup = Math.max(...dailySignups.map((d) => d.value), 1);

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
              <p className="mt-1.5 text-2xl font-semibold text-white">
                {(visitTotalCount ?? 0).toLocaleString("ko-KR")}명
              </p>
              <p className="mt-1 text-xs text-[#a6a6a6]">
                로그인 {visitLoggedInCount ?? 0} · 비로그인 {visitAnonCount ?? 0}
              </p>
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

      {/* 오늘 현황 — 수집 파이프라인 실행 상태 (collect_runs 기준) */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-white">오늘 현황</h2>
          <p className="text-[11px] text-[#666666]">
            관리자 수동 실행 기록 기준 — Cron 자동 실행은 별도 기록되지 않습니다
          </p>
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">매일 수집</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {DAILY_JOBS.map(({ job, label }) => {
            const run = latestRunByJob.get(job);
            const isRecentEnough = !!run && run.started_at >= todayISO;
            return <CollectStatusRow key={job} label={label} run={run} isRecentEnough={isRecentEnough} />;
          })}
        </div>

        <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">매주 수집 (최근 7일)</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {WEEKLY_JOBS.map(({ job, label }) => {
            const run = latestRunByJob.get(job);
            return <CollectStatusRow key={job} label={label} run={run} isRecentEnough={!!run} />;
          })}
        </div>
      </div>

      {/* 일별 신규 가입 (7일) — Vercel Analytics 미연동으로 방문자 대신 신규 가입 수 표시 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-white">일별 신규 가입 (7일)</h2>
          <p className="text-[11px] text-[#666666]">방문자 통계 미연동 — 신규 가입 수로 대체 표시</p>
        </div>
        <div className="flex h-28 items-end justify-between gap-2">
          {dailySignups.map((d, i) => {
            const isLatest = i === dailySignups.length - 1;
            return (
              <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white">{d.value}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn("w-full rounded-t-sm", isLatest ? "bg-blue-500" : "bg-blue-500/35")}
                    style={{ height: `${(d.value / maxSignup) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#a6a6a6]">{d.day}</span>
              </div>
            );
          })}
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
