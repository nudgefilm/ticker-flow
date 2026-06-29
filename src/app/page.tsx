import Link from "next/link";
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
import { createAdminClient } from "@/lib/supabase/admin";
import LandingShell from "@/components/landing-shell";
import Footer from "@/components/footer";
import FaqAccordion from "@/components/landing/faq-accordion";
import ScreenTabs from "@/components/landing/screen-tabs";
import LandingTop10 from "@/components/landing-top10";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function fmtCount(n: number): string {
  if (n >= 100000) return `${Math.floor(n / 10000)}만+`;
  if (n >= 10000) return `${Math.floor(n / 1000) * 10}K+`;
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  return `${n}+`;
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

  const [{ data: rawFilings }, { data: newsList }] = await Promise.all([
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
  ]);

  const priorityFilings = (rawFilings ?? [])
    .filter((f) => !SKIP_FORMS.has(f.form_type))
    .slice(0, 2);

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

  // ── 통계 ────────────────────────────────────────────────────────────────────
  const counts = await Promise.allSettled([
    admin.from("tickers").select("id", { count: "exact", head: true }),
    admin.from("filings").select("id", { count: "exact", head: true }),
    admin.from("news").select("id", { count: "exact", head: true }),
    (admin as any).from("earnings_calls").select("id", { count: "exact", head: true }),
  ]);

  const [tc, fc, nc, ec] = counts.map((r) =>
    r.status === "fulfilled" ? (r.value.count ?? 0) : 0
  );

  const STATS = [
    { label: "모니터링 기업", value: fmtCount(Math.max(tc, 8000)) },
    { label: "수집 공시", value: fmtCount(Math.max(fc, 150000)) },
    { label: "뉴스", value: fmtCount(Math.max(nc, 320000)) },
    { label: "어닝콜", value: fmtCount(Math.max(ec, 5000)) },
  ];

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
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5">
                    <span className="text-xs font-medium text-amber-400">미국 기업의 변화, 놓치지 마세요.</span>
                  </div>

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
                    <div className="grid grid-cols-2 gap-3 p-4">
                      {/* 좌: 도넛 차트 */}
                      <div className="flex flex-col rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">공시 유형 분포</p>
                        <div className="flex flex-1 flex-col items-center gap-4">
                          <div className="relative h-32 w-32 shrink-0">
                            <div className="h-full w-full rounded-full" style={{ background: "conic-gradient(#fbbf24 0% 42%, #60a5fa 42% 65%, #93c5fd 65% 82%, #c084fc 82% 95%, #6b7280 95% 100%)" }} />
                            <div className="absolute inset-[30px] flex items-center justify-center rounded-full bg-[#111111]">
                              <span className="text-lg font-semibold text-white">142</span>
                            </div>
                          </div>
                          <ul className="flex w-full flex-1 flex-col justify-between">
                            {[
                              { label: "8-K", pct: 42, color: "#fbbf24" },
                              { label: "10-K", pct: 23, color: "#60a5fa" },
                              { label: "10-Q", pct: 17, color: "#93c5fd" },
                              { label: "Form 4", pct: 13, color: "#c084fc" },
                              { label: "기타", pct: 5, color: "#6b7280" },
                            ].map((item) => (
                              <li key={item.label} className="flex items-center gap-2">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                                <span className="text-[11px] text-[#a6a6a6]">{item.label}</span>
                                <span className="ml-auto text-[11px] font-medium text-white">{item.pct}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {/* 우: 트렌드 + 섹터 */}
                      <div className="flex flex-col gap-3">
                        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">최근 7일 트렌드</p>
                          <div className="flex items-end gap-1" style={{ height: "44px" }}>
                            {[18, 24, 32, 15, 27, 20, 11].map((v, i) => (
                              <div key={i} className="flex flex-1 items-end">
                                <div className="w-full rounded-sm bg-[#60a5fa]" style={{ height: `${Math.max(2, Math.round((v / 32) * 36))}px` }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">섹터별 활동</p>
                          <div className="flex flex-col gap-2">
                            {[["기술", 100], ["금융", 62], ["헬스케어", 47], ["소비재", 33]].map(([label, pct]) => (
                              <div key={label as string}>
                                <div className="mb-1 flex justify-between">
                                  <span className="text-[10px] text-[#a6a6a6]">{label}</span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/[0.06]">
                                  <div className="h-full rounded-full bg-[#60a5fa]" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              1-b. 오늘의 기업 동향 TOP10
          ══════════════════════════════════════════════ */}
          <LandingTop10 />

          {/* ══════════════════════════════════════════════
              2. 실시간 변화 피드
          ══════════════════════════════════════════════ */}
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-8 text-center">
                <SectionLabel text="LIVE" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  지금 일어나고 있는 변화
                </h2>
              </div>
              {feedItems.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {feedItems.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-[12px] border border-border bg-card p-5 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-[4px] bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                          {item.ticker}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.category}</span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                지금 이 순간에도 새로운 공시와 실적 발표, 내부자 거래가 발생하고 있습니다.
              </p>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              3. 문제 제기
          ══════════════════════════════════════════════ */}
          <section className="py-16 lg:py-20">
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
          <section className="py-16 lg:py-20">
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
              5. 핵심 기능 카드
          ══════════════════════════════════════════════ */}
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="FEATURES" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  필요한 정보를 한 곳에서
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { icon: IconFileText,    title: "공시 인사이트",   desc: "최근 공시와 기업 변화를 빠르게 확인",     pro: true },
                  { icon: IconMicrophone,  title: "어닝콜 요약",     desc: "긴 컨퍼런스콜을 핵심만 한국어로",         pro: true },
                  { icon: IconUsers,       title: "내부자 거래",     desc: "경영진의 실제 매수·매도 내역 확인",       pro: true },
                  { icon: IconGridDots,    title: "섹터 히트맵",     desc: "최근 활동이 많은 섹터를 한눈에",           pro: true },
                  { icon: IconBookmark,    title: "와치리스트",      desc: "관심 종목의 변화를 자동으로 추적",         pro: false },
                  { icon: IconLayoutBoard, title: "종목 스냅샷",     desc: "기업 정보를 한 페이지에서 확인",           pro: false },
                  { icon: IconChartLine,   title: "경제지표",        desc: "미국 거시경제 흐름 모니터링",              pro: false },
                ].map(({ icon: Icon, title, desc, pro }) => (
                  <div
                    key={title}
                    className="group relative flex flex-col gap-3 rounded-[12px] border border-border bg-card p-6 transition-colors hover:bg-muted/30"
                  >
                    {pro && (
                      <span className="absolute right-4 top-4 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                        Pro
                      </span>
                    )}
                    <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-muted">
                      <Icon size={18} stroke={1.5} className="text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
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
              7. 왜 TickerFlow인가 (비교표)
          ══════════════════════════════════════════════ */}
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mb-10 text-center">
                <SectionLabel text="WHY" />
                <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl">
                  기존 방식과 비교해 보세요
                </h2>
              </div>
              <div className="mx-auto max-w-2xl overflow-hidden rounded-[14px] border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">항목</th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-muted-foreground">기존 방식</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">TickerFlow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["공시 확인", "SEC 직접 검색", "한국어 요약 제공"],
                      ["어닝콜", "직접 청취 (1시간+)", "핵심만 정리"],
                      ["정보 수집", "여러 사이트 이동", "한 곳에서 확인"],
                      ["내부자 거래", "별도 검색 필요", "자동 수집·분류"],
                      ["정보 형태", "영어 원문", "한국어 정리"],
                    ].map(([item, before, after]) => (
                      <tr key={item} className="border-b border-border last:border-0">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{item}</td>
                        <td className="px-6 py-4 text-center text-sm text-muted-foreground">{before}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400">
                            <IconCheck size={14} stroke={2} />
                            {after}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════
              8. 운영 규모·신뢰 수치
          ══════════════════════════════════════════════ */}
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-7xl px-6">
              <div className="rounded-[16px] border border-border bg-card px-8 py-12">
                <div className="mb-8 text-center">
                  <h2 className="text-xl font-semibold text-foreground">매일 수집하고 정리합니다</h2>
                </div>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {STATS.map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-3xl font-bold tabular-nums text-foreground md:text-4xl">{value}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

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
              <div className="rounded-[20px] border border-border bg-card px-8 py-16 text-center">
                <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                  미국 기업의 변화를
                  <br />
                  가장 빠르게 확인해 보세요.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">
                  공시부터 어닝콜까지, 하나의 화면에서 모니터링할 수 있습니다.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-8 inline-flex items-center gap-2 rounded-xl bg-foreground px-8 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  무료로 시작하기
                </Link>
              </div>
            </div>
          </section>

        </main>

        <Footer />

      </LandingShell>
    </div>
  );
}
