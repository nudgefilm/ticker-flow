import { createAdminClient } from "@/lib/supabase/admin";
import FilingCard from "@/components/filing-card";

export const revalidate = 1800;

type BadgeColor = "blue" | "green" | "amber";

const EVENT_TYPE_KR: Record<string, string> = {
  ceo_change:    "CEO 교체",
  cfo_change:    "CFO 교체",
  buyback:       "자사주 매입",
  insider_trade: "내부자 거래",
  ma:            "인수합병",
  guidance:      "가이던스 변경",
  contract:      "대규모 계약",
  dilution:      "증자",
  bond:          "전환사채",
};

function getFormTypeBadge(formType: string): { color: BadgeColor; label: string } {
  const ft = (formType ?? "").toUpperCase().trim();
  if (ft === "10-K" || ft.startsWith("10-K/")) return { color: "green", label: "10-K 연간보고서" };
  if (ft === "10-Q" || ft.startsWith("10-Q/")) return { color: "green", label: "10-Q 분기보고서" };
  if (ft === "8-K" || ft.startsWith("8-K/")) return { color: "blue", label: "8-K 주요이벤트" };
  if (ft === "4" || ft === "4/A") return { color: "amber", label: "Form 4 내부자거래" };
  if (ft.startsWith("DEF 14A") || ft.startsWith("DEF14A")) return { color: "blue", label: "위임장 설명서" };
  if (ft.startsWith("SC 13")) return { color: "amber", label: `${formType} 지분신고` };
  if (ft.startsWith("S-")) return { color: "amber", label: `${formType} 증권신고` };
  return { color: "blue", label: formType };
}

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const h = kstDate.getUTCHours().toString().padStart(2, "0");
    const m = kstDate.getUTCMinutes().toString().padStart(2, "0");
    return `오늘 ${h}:${m} KST`;
  }
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

function relativeTime(isoString: string): string {
  const diffDays = Math.floor((Date.now() - new Date(isoString).getTime()) / 86_400_000);
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

function getMockupBadgeClass(formType: string): string {
  const ft = (formType ?? "").toUpperCase().trim();
  if (ft === "8-K" || ft.startsWith("8-K/")) return "bg-amber-500/20 text-amber-400";
  if (ft === "10-K" || ft.startsWith("10-K/") || ft === "10-Q" || ft.startsWith("10-Q/"))
    return "bg-blue-500/20 text-blue-400";
  if (ft === "4" || ft === "4/A") return "bg-purple-500/20 text-purple-400";
  return "bg-white/10 text-white/40";
}

type FilingRow = {
  id: string;
  ticker: string;
  form_type: string;
  summary_kr: string | null;
  filed_at: string;
  url: string | null;
  event_type: string | null;
};

export default async function Hero() {
  let filings: FilingRow[] = [];
  const nameMap = new Map<string, string>();

  try {
    const admin = createAdminClient();

    const { data } = await admin
      .from("filings")
      .select("id, ticker, form_type, summary_kr, filed_at, url, event_type")
      .not("summary_kr", "is", null)
      .order("filed_at", { ascending: false })
      .limit(3);

    filings = (data ?? []) as unknown as FilingRow[];

    // 회사명 조회
    if (filings.length > 0) {
      const { data: tickerRows } = await admin
        .from("tickers")
        .select("ticker, name_kr, name_en")
        .in("ticker", filings.map((f) => f.ticker));
      for (const t of tickerRows ?? []) {
        nameMap.set(t.ticker, t.name_kr ?? t.name_en ?? t.ticker);
      }
    }
  } catch {
    // admin 자격증명 없으면 더미 데이터로 fallback
  }

  const showRealData = filings.length >= 2;
  const mockupFilings = filings.slice(0, 3);

  return (
    <section className="pb-20 pt-36 md:pt-40">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* 좌측: 기존 텍스트 + CTA */}
        <div className="animate-fade-in flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            나스닥 모니터링
            <br />
            <span
              className="text-blue-400"
              style={{ filter: "drop-shadow(0 0 10px rgba(96, 165, 250, 0.7))" }}
            >
              티커플로우
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            미국 기업의 공시, 뉴스, 실적 변화를 한곳에서 확인하세요.
          </p>

          <p className="mt-3 max-w-xl text-sm text-muted-foreground/70">
            TickerFlow는 SEC 공시, 뉴스, 실적 일정 등 공개된 정보를 수집·정리하여 미국 기업의 중요한 변화를 빠르게 파악할 수 있도록 돕는 모니터링 서비스입니다. 투자 자문이나 투자 권유를 제공하지 않습니다.
          </p>

          {/* 공시 샘플 카드 */}
          <div className="mt-16 grid w-full max-w-2xl gap-4 text-left md:grid-cols-2">
            {showRealData ? (
              filings.slice(0, 2).map((filing) => {
                const badge = getFormTypeBadge(filing.form_type);
                const event = filing.event_type ? EVENT_TYPE_KR[filing.event_type] : undefined;
                const companyName = nameMap.get(filing.ticker) ?? filing.ticker;
                const company = `${filing.ticker} · ${companyName}`;
                return (
                  <FilingCard
                    key={`${filing.ticker}-${filing.filed_at}`}
                    badgeColor={badge.color}
                    badgeLabel={badge.label}
                    event={event}
                    company={company}
                    summary={filing.summary_kr ?? ""}
                    time={formatRelativeTime(filing.filed_at)}
                    url={filing.url ?? undefined}
                  />
                );
              })
            ) : (
              <>
                <FilingCard
                  badgeColor="blue"
                  badgeLabel="8-K 주요이벤트"
                  event="생산 목표 변경"
                  company="TSLA · 테슬라"
                  summary="머스크 CEO, 2026 2분기 생산 목표 하향 조정. 픽업트럭 사이버트럭 생산량을 기존 계획 대비 15% 축소."
                  keyNumbers="생산 목표 -15% · 완공 연기 2027"
                  time="오늘 10:42 KST"
                />
                <FilingCard
                  badgeColor="green"
                  badgeLabel="10-Q 분기보고서"
                  event="가이던스 변경"
                  company="NVDA · 엔비디아"
                  summary="2026 회계연도 2분기 데이터센터 매출 $39B 기록. 전분기 대비 21% 성장."
                  keyNumbers="데이터센터 $39B · +21% QoQ"
                  time="어제 06:02 KST"
                />
              </>
            )}
          </div>
        </div>

        {/* 우측: 시각화 카드 목업 (공시피드 레이아웃 그대로) */}
        <div className="hidden lg:block">
          {/* 목업 컨테이너 */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f0f] shadow-2xl">

            {/* 브라우저 탭 바 */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <span className="ml-2 font-mono text-xs text-white/30">tickerflow.net</span>
            </div>

            {/* 2열: 공시피드 실제 레이아웃 */}
            <div className="grid grid-cols-2 items-stretch gap-3 p-4">

              {/* 카드 1 — 공시 유형 분포 (좌측, 전체 높이) */}
              <div className="flex flex-col rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                  공시 유형 분포
                </p>
                <div className="flex flex-1 flex-col items-center gap-4">
                  {/* 도넛 */}
                  <div className="relative h-40 w-40 shrink-0">
                    <div
                      className="h-full w-full rounded-full"
                      style={{
                        background:
                          "conic-gradient(#fbbf24 0% 42%, #60a5fa 42% 65%, #93c5fd 65% 82%, #c084fc 82% 95%, #6b7280 95% 100%)",
                      }}
                    />
                    <div className="absolute inset-[40px] flex items-center justify-center rounded-full bg-[#111111]">
                      <span className="text-xl font-semibold tabular-nums text-white">142</span>
                    </div>
                  </div>
                  {/* 범례 */}
                  <ul className="flex w-full flex-1 flex-col justify-between">
                    {[
                      { label: "8-K",    pct: 42, count: 60, color: "#fbbf24" },
                      { label: "10-K",   pct: 23, count: 33, color: "#60a5fa" },
                      { label: "10-Q",   pct: 17, count: 24, color: "#93c5fd" },
                      { label: "Form 4", pct: 13, count: 18, color: "#c084fc" },
                      { label: "기타",    pct: 5,  count: 7,  color: "#6b7280" },
                    ].map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                        <span className="min-w-0 truncate text-[11px] text-[#a6a6a6]">{item.label}</span>
                        <span className="ml-auto text-[11px] font-medium tabular-nums text-white">{item.pct}%</span>
                        <span className="text-[10px] tabular-nums text-[#a6a6a6]">({item.count})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 우측: 카드 2·3 위아래 스택 */}
              <div className="flex flex-col gap-3">

                {/* 카드 2 — 최근 7일 트렌드 */}
                <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                    최근 7일 트렌드
                  </p>
                  <div className="flex items-end gap-1" style={{ height: "52px" }}>
                    {[
                      { day: "6/21", count: 18 },
                      { day: "6/22", count: 24 },
                      { day: "6/23", count: 32 },
                      { day: "6/24", count: 15 },
                      { day: "6/25", count: 27 },
                      { day: "6/26", count: 20 },
                      { day: "6/27", count: 11 },
                    ].map((bar) => {
                      const h = Math.max(2, Math.round((bar.count / 32) * 36));
                      return (
                        <div key={bar.day} className="flex flex-1 flex-col items-center">
                          <div className="flex w-full flex-col justify-end" style={{ height: "36px" }}>
                            <div className="w-full rounded-sm bg-[#60a5fa]" style={{ height: `${h}px` }} />
                          </div>
                          <span className="mt-1 text-[8px] tabular-nums text-[#a6a6a6]">{bar.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 카드 3 — 섹터별 공시 활동 (5개 항목 전부) */}
                <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                    섹터별 공시 활동
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { label: "기술",       count: 45, pct: 100 },
                      { label: "커뮤니케이션", count: 32, pct: 71 },
                      { label: "금융",       count: 28, pct: 62 },
                      { label: "헬스케어",    count: 21, pct: 47 },
                      { label: "경기소비재",  count: 15, pct: 33 },
                    ].map((row) => (
                      <div key={row.label}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] text-[#a6a6a6]">{row.label}</span>
                          <span className="text-[11px] font-medium tabular-nums text-white">{row.count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-[#60a5fa]" style={{ width: `${row.pct}%` }} />
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
    </section>
  );
}
