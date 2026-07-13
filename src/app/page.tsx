import {
  IconFileText,
  IconMicrophone,
  IconUsers,
  IconLayoutBoard,
  IconChartLine,
  IconGridDots,
  IconBookmark,
  IconCheck,
  IconArrowRight,
} from "@tabler/icons-react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import LandingShell from "@/components/landing-shell";
import Footer from "@/components/footer";
import FaqAccordion from "@/components/landing/faq-accordion";
import ScreenTabs from "@/components/landing/screen-tabs";
import { StatsSection } from "@/components/stats-section";
import { CtaCard } from "@/components/cta-card";
import { normalizeSector, SECTOR_KR } from "@/lib/sectors";
import { LANDING_DATA_CACHE_TAG } from "@/lib/landing-cache";
import { computeRange, fetchTopCompanies } from "@/lib/watchlist-brief";

export const dynamic = "force-dynamic";

// 랜딩 캐시 데이터(히어로 차트·통계 카운트·최근 7일 활동 기업)는 시간 기반 revalidate를
// 쓰지 않고 LANDING_DATA_CACHE_TAG 태그로만 갱신한다 — 매일 04:00 KST에
// /api/revalidate/landing 크론이 revalidateTag()로 한 번에 무효화한다
// (docs: src/lib/landing-cache.ts). 이 문구를 바꾸면 갱신 주기 설명도 맞춰 바꿀 것.
const HERO_UPDATE_LABEL = "매일 새벽 업데이트";

const HERO_TYPE_COLORS: Record<string, string> = {
  "8-K": "#fbbf24",
  "10-K": "#60a5fa",
  "10-Q": "#93c5fd",
  "Form 4": "#c084fc",
  "기타": "#6b7280",
};

// 히어로 목업 차트 3종 전용 데이터 fetch — 페이지 전체(force-dynamic)와 분리해
// LANDING_DATA_CACHE_TAG 태그로만 캐시한다(시간 기반 revalidate 중복 사용 안 함).
async function fetchHeroChartsData() {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: heroFilingsRaw }, heroSectorRaw] = await Promise.all([
    admin.from("filings").select("form_type, filed_at").gte("filed_at", sevenDaysAgo),
    admin.from("filings").select("tickers!inner(sector)").gte("filed_at", sevenDaysAgo),
  ]);

  const heroFilings = heroFilingsRaw ?? [];

  const heroTypeCounts: Record<string, number> = {};
  const heroTrendMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    heroTrendMap[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
  }
  for (const f of heroFilings) {
    const typeKey =
      f.form_type.startsWith("8-K") ? "8-K" :
      f.form_type.startsWith("10-K") ? "10-K" :
      f.form_type.startsWith("10-Q") ? "10-Q" :
      f.form_type.startsWith("4") ? "Form 4" :
      "기타";
    heroTypeCounts[typeKey] = (heroTypeCounts[typeKey] ?? 0) + 1;

    const d = new Date(f.filed_at);
    const trendKey = `${d.getMonth() + 1}/${d.getDate()}`;
    if (trendKey in heroTrendMap) heroTrendMap[trendKey]++;
  }

  const heroTotal = heroFilings.length;
  const heroTypeData = Object.entries(heroTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value, color: HERO_TYPE_COLORS[name] ?? "#6b7280" }));
  const heroTrendData = Object.entries(heroTrendMap).map(([day, count]) => ({ day, count }));
  const heroTrendMax = Math.max(...heroTrendData.map((d) => d.count), 1);

  const heroConicGradient = heroTypeData
    .reduce<{ cumulative: number; parts: string[] }>(
      (acc, item) => {
        const pct = heroTotal > 0 ? (item.value / heroTotal) * 100 : 0;
        const to = acc.cumulative + pct;
        return { cumulative: to, parts: [...acc.parts, `${item.color} ${acc.cumulative}% ${to}%`] };
      },
      { cumulative: 0, parts: [] }
    )
    .parts.join(", ");

  type HeroSectorRow = { tickers: { sector: string | null } | null };
  const heroSectorCounts: Record<string, number> = {};
  for (const row of (heroSectorRaw.data ?? []) as unknown as HeroSectorRow[]) {
    const raw = row.tickers?.sector;
    if (raw) {
      const sector = normalizeSector(raw);
      heroSectorCounts[sector] = (heroSectorCounts[sector] ?? 0) + 1;
    }
  }
  const heroSectorData = Object.entries(heroSectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sector, count]) => ({ sector, sectorKr: SECTOR_KR[sector] ?? sector, count }));
  const heroSectorMax = Math.max(...heroSectorData.map((d) => d.count), 1);

  return { heroTotal, heroTypeData, heroTrendData, heroTrendMax, heroConicGradient, heroSectorData, heroSectorMax };
}

const getHeroChartsData = unstable_cache(
  fetchHeroChartsData,
  ["landing-hero-charts"],
  { revalidate: false, tags: [LANDING_DATA_CACHE_TAG] }
);

// 통계 카운트 7종(가입자 수는 별도 profiles 카운트로 실시간 유지, 아래는 콘텐츠
// 수집량 카운트) — 히어로와 동일하게 태그 전용 캐시.
async function fetchLandingStatsCounts() {
  const admin = createAdminClient();
  const counts = await Promise.allSettled([
    admin.from("tickers").select("ticker", { count: "exact", head: true }),
    admin.from("filings").select("id", { count: "exact", head: true }),
    admin.from("news").select("id", { count: "exact", head: true }),
    (admin as any).from("macro_indicators").select("id", { count: "exact", head: true }),
    (admin as any).from("insider_trades").select("id", { count: "exact", head: true }),
    (admin as any).from("earnings_calls").select("id", { count: "exact", head: true }),
    (admin as any).from("earnings").select("id", { count: "exact", head: true }),
  ]);

  const [tc, fc, nc, mc, ic, ec, ear] = counts.map((r) =>
    r.status === "fulfilled" ? (r.value.count ?? 0) : 0
  );
  return { tc, fc, nc, mc, ic, ec, ear };
}

const getLandingStatsCounts = unstable_cache(
  fetchLandingStatsCounts,
  ["landing-stats-counts"],
  { revalidate: false, tags: [LANDING_DATA_CACHE_TAG] }
);

// 최근 7일 활동이 많았던 기업(구 landing-top10.tsx) — 병합 패널(§1)에서 LIVE
// 피드와 한 컴포넌트로 묶여야 해서 page.tsx로 이동. 로직은 그대로.
const getCachedTopCompanies = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const range = computeRange(7);
    return fetchTopCompanies(admin, range, 10);
  },
  ["landing-top-companies"],
  { revalidate: false, tags: [LANDING_DATA_CACHE_TAG] }
);

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}


function formTypeKr(ft: string): string {
  if (ft.startsWith("8-K")) return "8-K 주요이벤트";
  if (ft.startsWith("10-K")) return "10-K 연간보고서";
  if (ft.startsWith("10-Q")) return "10-Q 분기보고서";
  if (ft === "4" || ft === "4/A") return "Form 4 내부자거래";
  return ft;
}

function SectionLabel({ text }: { text: string }) {
  return (
    <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
      {text}
    </span>
  );
}

export default async function HomePage() {
  const admin = createAdminClient();

  // ── 실시간 피드 데이터 ──────────────────────────────────────────────────────
  const SKIP_FORMS = new Set(["S-1", "S-1/A", "DEF 14A", "424B4", "S-3", "S-3/A"]);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: rawFilings }, { data: newsList }, weeklyFilingsRaw, weeklyNewsRaw] = await Promise.all([
    admin
      .from("filings")
      .select("id, ticker, form_type, filed_at")
      .order("filed_at", { ascending: false })
      .limit(20),
    admin
      .from("news")
      .select("id, ticker, summary_kr, published_at")
      .not("summary_kr", "is", null)
      .order("published_at", { ascending: false })
      .limit(5),
    admin.from("filings").select("filed_at").gte("filed_at", sevenDaysAgo),
    admin.from("news").select("published_at").gte("published_at", sevenDaysAgo),
  ]);

  const priorityFilings = (rawFilings ?? [])
    .filter((f) => !SKIP_FORMS.has(f.form_type))
    .slice(0, 2);

  // 병합 패널 하단 티커 테이프용 — 새 쿼리 없이 위에서 이미 가져온 rawFilings를
  // 더 넉넉히(최대 12건) 재사용한다.
  const tapeFilings = (rawFilings ?? [])
    .filter((f) => !SKIP_FORMS.has(f.form_type))
    .slice(0, 12)
    .map((f) => ({ ticker: f.ticker, label: formTypeKr(f.form_type) }));

  type FeedItem = { ticker: string; label: string; time: string; category: string };
  const feedItems: FeedItem[] = [
    ...priorityFilings.map((f) => ({
      ticker: f.ticker,
      label: formTypeKr(f.form_type),
      time: timeAgo(f.filed_at),
      category: "공시",
    })),
    ...((newsList ?? []).slice(0, 1).map((n) => ({
      ticker: n.ticker ?? "—",
      label: n.summary_kr!,
      time: timeAgo(n.published_at),
      category: "뉴스",
    }))),
  ].slice(0, 3);

  // ── 통계 ──────────────────────────────────────────────────────────────────
  // 태그 캐시(LANDING_DATA_CACHE_TAG) — 매일 04:00 KST에만 갱신
  const { tc, fc, nc, mc, ic, ec, ear } = await getLandingStatsCounts();

  // ── 최근 7일 활동이 많았던 기업 (병합 패널용) ─────────────────────────────────
  const companies = await getCachedTopCompanies();

  // ── 최근 7일 일별 수집량 (공시+뉴스 합산) ──────────────────────────────────
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const weeklyMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    weeklyMap[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = 0;
  }
  for (const f of weeklyFilingsRaw.data ?? []) {
    const d = new Date(f.filed_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key in weeklyMap) weeklyMap[key]++;
  }
  for (const n of weeklyNewsRaw.data ?? []) {
    const d = new Date(n.published_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key in weeklyMap) weeklyMap[key]++;
  }
  const weeklyCollection = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    return { day: dayNames[d.getDay()], value: weeklyMap[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] ?? 0 };
  });

  // ── 히어로 목업: 최근 7일 공시 유형 분포 + 일별 트렌드 + 섹터별 활동 ──────────
  // 태그 캐시(LANDING_DATA_CACHE_TAG) — 페이지 나머지 데이터(force-dynamic)와
  // 분리되어 매일 04:00 KST에만 갱신된다.
  const {
    heroTotal, heroTypeData, heroTrendData, heroTrendMax, heroConicGradient,
    heroSectorData, heroSectorMax,
  } = await getHeroChartsData();

  return (
    <div id="site-content" className="min-h-screen bg-background">
      <LandingShell>
        <main>

          {/* ══════════════════════════════════════════════
              1. HERO
          ══════════════════════════════════════════════ */}
          <section className="pb-16 pt-32 md:pt-40">
            <div className="mx-auto max-w-7xl px-6">
              <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">

                {/* 좌측 */}
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <p className="mb-3 text-sm font-medium text-amber-400 md:text-base">
                    미국 기업 변화를 추적하는 데이터 플랫폼
                  </p>

                  <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
                    나스닥 모니터링
                    <br />
                    <span className="text-blue-400" style={{ filter: "drop-shadow(0 0 12px rgba(96,165,250,0.5))" }}>
                      TickerFlow
                    </span>
                  </h1>

                  <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                    공시, 어닝콜, 내부자 거래, 뉴스를 한국어로.
                    <br />
                    여러 사이트를 오갈 필요 없이 하나의 화면에서 확인하세요.
                  </p>

                </div>

                {/* 우측: 대시보드 목업 */}
                <div className="hidden lg:block">
                  <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f0f] shadow-2xl">
                    <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                      <div className="h-3 w-3 rounded-full bg-white/10" />
                      <div className="h-3 w-3 rounded-full bg-white/10" />
                      <div className="h-3 w-3 rounded-full bg-white/10" />
                      <span className="ml-2 font-mono text-xs text-white/30">tickerflow.net</span>
                    </div>
                    <p className="px-4 pt-3 text-[10px] text-[#a6a6a6]">{HERO_UPDATE_LABEL}</p>
                    <div className="grid grid-cols-2 gap-3 p-4">
                      {/* 좌: 도넛 차트 */}
                      <div className="flex flex-col rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">공시 유형 분포</p>
                        {heroTotal === 0 ? (
                          <p className="flex flex-1 items-center justify-center text-xs text-[#a6a6a6]">데이터 없음</p>
                        ) : (
                          <div className="flex flex-1 flex-col items-center gap-4">
                            <div className="relative h-32 w-32 shrink-0">
                              <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${heroConicGradient})` }} />
                              <div className="absolute inset-[30px] flex items-center justify-center rounded-full bg-[#111111]">
                                <span className="text-lg font-semibold text-white">{heroTotal}</span>
                              </div>
                            </div>
                            <ul className="flex w-full flex-1 flex-col justify-between">
                              {heroTypeData.map((item) => (
                                <li key={item.name} className="flex items-center gap-2">
                                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                                  <span className="text-[11px] text-[#a6a6a6]">{item.name}</span>
                                  <span className="ml-auto text-[11px] font-medium text-white">
                                    {Math.round((item.value / heroTotal) * 100)}%
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {/* 우: 트렌드 + 섹터 */}
                      <div className="flex flex-col gap-3">
                        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">최근 7일 트렌드</p>
                          <div className="flex items-end gap-1" style={{ height: "44px" }}>
                            {heroTrendData.map((d) => (
                              <div key={d.day} className="flex flex-1 items-end">
                                <div className="w-full rounded-sm bg-[#60a5fa]" style={{ height: `${Math.max(2, Math.round((d.count / heroTrendMax) * 36))}px` }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">섹터별 활동</p>
                          {heroSectorData.length === 0 ? (
                            <p className="py-2 text-center text-[11px] text-[#a6a6a6]">데이터 없음</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {heroSectorData.map((d) => (
                                <div key={d.sector}>
                                  <div className="mb-1 flex justify-between">
                                    <span className="text-[10px] text-[#a6a6a6]">{d.sectorKr}</span>
                                  </div>
                                  <div className="h-1 w-full rounded-full bg-white/[0.06]">
                                    <div className="h-full rounded-full bg-[#60a5fa]" style={{ width: `${(d.count / heroSectorMax) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              1-b/2. 실시간 대시보드 패널 — 좌: 최근 7일 활동 랭킹 · 우: LIVE 피드
              (구 "최근 7일 활동" + "지금 일어나고 있는 변화" 두 섹션을 하나의
              패널로 병합. 세로 스크롤 대신 좌우로 시선이 이동하는 대시보드형
              구성 — 왼쪽이 메인 데이터(넓게), 오른쪽이 실시간 피드(사이드바처럼
              좁게)로 실제 서비스 화면에 가깝게 배치한다.)
          ══════════════════════════════════════════════ */}
          <section className="bg-popover py-10 lg:py-14">
            <div className="mx-auto max-w-7xl px-6">
              <div className="overflow-hidden rounded-2xl border border-border">
                <div className={`grid ${companies.length > 0 ? "lg:grid-cols-[3fr_2fr]" : ""}`}>

                  {/* 좌: 최근 7일 활동이 많았던 기업 (랭킹 리스트) */}
                  {companies.length > 0 && (
                    <div className="border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8">
                      <div className="mb-5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-foreground md:text-xl">
                          최근 7일 활동이 많았던 기업
                        </h2>
                        <SectionLabel text="최근 7일" />
                      </div>
                      <div className="flex flex-col divide-y divide-border">
                        {companies.map((company, i) => (
                          <div key={company.ticker} className="flex items-center gap-3 py-2.5">
                            <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">{i + 1}</span>
                            <span className="shrink-0 rounded-[4px] bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                              ${company.ticker}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                              {company.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{company.activityCount}건</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-5 text-xs text-muted-foreground">
                        📌 본 정보는 공개된 데이터를 기반으로 한 참고용입니다.
                        투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.
                      </p>
                    </div>
                  )}

                  {/* 우: 지금 일어나고 있는 변화 (LIVE 피드) */}
                  <div className="bg-background/40 p-6 lg:p-8">
                    <div className="mb-5 flex items-center gap-2">
                      <SectionLabel text="LIVE" />
                      <h2 className="text-lg font-semibold text-foreground md:text-xl">
                        지금 일어나고 있는 변화
                      </h2>
                    </div>
                    {feedItems.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {feedItems.map((item, i) => (
                          <div
                            key={i}
                            className="rounded-[12px] border border-border bg-card p-4 transition-colors hover:bg-muted/30"
                          >
                            <div className="flex items-center justify-between">
                              <span className="rounded-[4px] bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                                {item.ticker}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{item.category}</span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-foreground">{item.label}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-5 text-xs text-muted-foreground">
                      지금 이 순간에도 새로운 공시와 실적 발표, 내부자 거래가 발생하고 있습니다.
                    </p>
                  </div>

                </div>

                {/* 하단: 실시간 티커 테이프 — 최근 공시 제목을 가로로 흘려보내는 스트립 */}
                {tapeFilings.length > 0 && (
                  <div className="border-t border-border bg-background/60 px-6 py-3">
                    <div
                      className="overflow-hidden"
                      style={{
                        maskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
                        WebkitMaskImage: "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
                      }}
                    >
                      <ul className="animate-ticker-left flex w-max items-center gap-8 whitespace-nowrap">
                        {[...tapeFilings, ...tapeFilings].map((entry, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-[4px] bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                              ${entry.ticker}
                            </span>
                            {entry.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              3. 문제 제기
          ══════════════════════════════════════════════ */}
          <section className="border-t border-border bg-background py-10 lg:py-14">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="PROBLEM" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  이런 경험, 한 번쯤 있으셨나요?
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: "📄", text: "SEC 공시를 열었는데 영어라 이해하기 어려웠습니다." },
                  { icon: "🎙", text: "어닝콜이 1시간이 넘어서 끝까지 보기 어려웠습니다." },
                  { icon: "🌐", text: "여러 사이트를 오가며 정보를 확인해야 했습니다." },
                  { icon: "⏰", text: "중요한 변화를 뒤늦게 알게 되었습니다.", highlight: true },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-[12px] border p-6 ${
                      item.highlight
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              4. TickerFlow 해결 방식
          ══════════════════════════════════════════════ */}
          <section className="bg-popover py-10 lg:py-14">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="SOLUTION" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  TickerFlow는 기업의 변화를 한곳에서 보여드립니다.
                </h2>
              </div>
              <div className="flex flex-col items-center gap-0 sm:flex-row sm:justify-center">
                {["공시", "뉴스", "어닝콜", "내부자 거래", "하나의 화면"].map((step, i, arr) => (
                  <div key={step} className="flex flex-col items-center sm:flex-row">
                    <div className={`rounded-[10px] px-5 py-3 text-sm font-medium ${
                      i === arr.length - 1
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        : "border border-border bg-card text-foreground"
                    }`}>
                      {step}
                    </div>
                    {i < arr.length - 1 && (
                      <span className="my-2 text-muted-foreground sm:my-0 sm:mx-3">↓<span className="hidden sm:inline">→</span></span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              5. 핵심 기능 카드 (벤토 그리드 — 핵심 기능 1개만 크게)
          ══════════════════════════════════════════════ */}
          <section className="border-t border-border bg-background py-10 lg:py-14">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="FEATURES" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  필요한 정보를 한 곳에서
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr]">
                {[
                  { icon: IconFileText,    title: "공시 인사이트",   desc: "최근 공시와 기업 변화를 빠르게 확인",     pro: true },
                  { icon: IconMicrophone,  title: "어닝콜 요약",     desc: "긴 컨퍼런스콜을 핵심만 한국어로",         pro: true },
                  { icon: IconUsers,       title: "내부자 거래",     desc: "경영진의 실제 매수·매도 내역 확인",       pro: true },
                  { icon: IconGridDots,    title: "섹터 히트맵",     desc: "최근 활동이 많은 섹터를 한눈에",           pro: true },
                  { icon: IconBookmark,    title: "와치리스트",      desc: "관심 종목의 변화를 자동으로 추적",         pro: false },
                  { icon: IconLayoutBoard, title: "종목 스냅샷",     desc: "기업 정보를 한 페이지에서 확인",           pro: false },
                  { icon: IconChartLine,   title: "경제지표",        desc: "미국 거시경제 흐름 모니터링",              pro: false },
                ].map(({ icon: Icon, title, desc, pro }, i) => {
                  const isFeatured = i === 0;
                  return (
                    <div
                      key={title}
                      className={`group relative flex flex-col gap-3 rounded-[12px] border border-border bg-card p-6 transition-colors hover:bg-muted/30 ${
                        isFeatured ? "lg:row-span-2 lg:p-8" : ""
                      }`}
                    >
                      {pro && (
                        <span className="absolute right-4 top-4 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                          Pro
                        </span>
                      )}
                      <div className={`flex items-center justify-center rounded-[8px] bg-muted ${
                        isFeatured ? "h-11 w-11 lg:h-14 lg:w-14" : "h-9 w-9"
                      }`}>
                        <Icon size={isFeatured ? 22 : 18} stroke={1.5} className="text-foreground" />
                      </div>
                      <div>
                        <p className={`font-semibold text-foreground ${isFeatured ? "text-base lg:text-lg" : "text-sm"}`}>
                          {title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                        {isFeatured && (
                          <p className="mt-3 hidden text-xs leading-relaxed text-muted-foreground/90 lg:block">
                            어떤 공시가 등록됐는지, 그 공시가 왜 중요한지까지 한국어로
                            정리해 드립니다.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              6. 실제 화면 (탭 전환)
          ══════════════════════════════════════════════ */}
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="PREVIEW" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  실제 화면을 확인해 보세요
                </h2>
              </div>
              <ScreenTabs />
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              7. 왜 TickerFlow인가 (비대칭 2단 비교)
          ══════════════════════════════════════════════ */}
          <section className="bg-popover py-10 lg:py-14">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="WHY" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  기존 방식과 비교해 보세요
                </h2>
              </div>
              {(() => {
                const comparisons = [
                  ["공시 확인", "SEC 직접 검색", "한국어 요약 제공"],
                  ["어닝콜", "직접 청취 (1시간+)", "핵심만 정리"],
                  ["정보 수집", "여러 사이트 이동", "한 곳에서 확인"],
                  ["내부자 거래", "별도 검색 필요", "자동 수집·분류"],
                  ["정보 형태", "영어 원문", "한국어 정리"],
                ] as const;
                return (
                  <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">

                    {/* 좌: 기존 방식 */}
                    <div className="rounded-[14px] border border-border bg-card p-6 lg:p-8">
                      <p className="text-sm font-semibold text-muted-foreground">기존 방식</p>
                      <div className="mt-5 flex flex-col divide-y divide-border">
                        {comparisons.map(([item, before]) => (
                          <div key={item} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                            <span className="text-sm font-medium text-foreground">{item}</span>
                            <span className="text-sm text-muted-foreground">{before}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 우: TickerFlow (강조) */}
                    <div className="rounded-[14px] border border-chart-2/30 bg-chart-2/10 p-6 lg:p-8">
                      <p className="text-sm font-semibold text-foreground">TickerFlow</p>
                      <div className="mt-5 flex flex-col divide-y divide-chart-2/20">
                        {comparisons.map(([item, , after]) => (
                          <div key={item} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                            <span className="text-sm font-medium text-foreground">{item}</span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400">
                              <IconCheck size={14} stroke={2} />
                              {after}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              8. 운영 규모·신뢰 수치
          ══════════════════════════════════════════════ */}
          <StatsSection
            featured={tc}
            filingCount={fc}
            newsCount={nc}
            macroCount={mc}
            insiderCount={ic}
            earningsCallCount={ec}
            earningsCount={ear}
            weeklyCollection={weeklyCollection}
          />

          {/* ══════════════════════════════════════════════
              10. FAQ
          ══════════════════════════════════════════════ */}
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="FAQ" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  자주 묻는 질문
                </h2>
              </div>
              <FaqAccordion />
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              11. 마지막 CTA
          ══════════════════════════════════════════════ */}
          <section className="py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-6">
              <CtaCard />
            </div>
          </section>

        </main>

        <Footer />

      </LandingShell>
    </div>
  );
}
