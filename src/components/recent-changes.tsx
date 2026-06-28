import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 1800;

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

const PRIORITY_EVENT_TYPES = ["ceo_change", "cfo_change", "buyback", "insider_trade", "ma", "guidance", "contract"];

const FORM_TYPE_KR: Record<string, string> = {
  "8-K":    "8-K 주요이벤트",
  "10-K":   "10-K 연간보고서",
  "10-Q":   "10-Q 분기보고서",
  "4":      "Form 4 내부자거래",
  "DEF 14A": "위임장 설명서",
};

// 낮을수록 먼저 노출
function getFormPriority(formType: string, eventType: string | null): number {
  const ft = formType.toUpperCase();
  if (ft.startsWith("8-K") && eventType && PRIORITY_EVENT_TYPES.includes(eventType)) return 0;
  if (ft === "4" || ft === "4/A") return 2;
  if (ft.startsWith("10-K")) return 3;
  if (ft.startsWith("10-Q")) return 4;
  if (ft.startsWith("8-K")) return 5;
  // S-1, DEF 14A 등 후순위
  return 10;
}

type BadgeVariant = "blue" | "green" | "amber" | "purple";

function getEventBadge(eventType: string | null, formType: string): { variant: BadgeVariant; label: string } {
  if (eventType && EVENT_TYPE_KR[eventType]) {
    const label = EVENT_TYPE_KR[eventType];
    if (eventType === "ceo_change" || eventType === "cfo_change") return { variant: "purple", label };
    if (eventType === "buyback" || eventType === "insider_trade") return { variant: "amber", label };
    if (eventType === "guidance" || eventType === "ma") return { variant: "blue", label };
    return { variant: "green", label };
  }
  const ft = formType.toUpperCase();
  if (ft.startsWith("10-K")) return { variant: "green", label: "10-K 연간보고서" };
  if (ft.startsWith("10-Q")) return { variant: "green", label: "10-Q 분기보고서" };
  if (ft.startsWith("8-K"))  return { variant: "blue",  label: "8-K 주요이벤트" };
  if (ft === "4" || ft === "4/A") return { variant: "amber", label: "Form 4 내부자거래" };
  return { variant: "blue", label: FORM_TYPE_KR[formType] ?? formType };
}

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  blue:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green:  "bg-green-500/10 text-green-400 border-green-500/20",
  amber:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${Math.floor(diffDays / 7)}주 전`;
}

type FilingRow = {
  ticker: string;
  form_type: string;
  event_type: string | null;
  summary_kr: string | null;
  filed_at: string;
};

type NewsRow = {
  ticker: string | null;
  headline: string;
  summary_kr: string | null;
  published_at: string;
};

type CardItem =
  | { kind: "filing"; data: FilingRow }
  | { kind: "news"; data: NewsRow };

export default async function RecentChanges() {
  let cards: CardItem[] = [];
  const nameMap = new Map<string, string>();

  try {
    const admin = createAdminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const { data: rawFilings } = await admin
      .from("filings")
      .select("ticker, form_type, event_type, summary_kr, filed_at")
      .not("summary_kr", "is", null)
      .gte("filed_at", sevenDaysAgo)
      .order("filed_at", { ascending: false })
      .limit(50);

    const allFilings = (rawFilings ?? []) as unknown as FilingRow[];

    // 우선순위 오름차순 → 동일 우선순위 내 최신 순
    const sorted = allFilings.sort((a, b) => {
      const pDiff = getFormPriority(a.form_type, a.event_type) - getFormPriority(b.form_type, b.event_type);
      if (pDiff !== 0) return pDiff;
      return new Date(b.filed_at).getTime() - new Date(a.filed_at).getTime();
    });

    cards = sorted.slice(0, 6).map((f) => ({ kind: "filing", data: f }));

    // 공시가 6건 미만이면 뉴스로 채움
    if (cards.length < 6) {
      const { data: rawNews } = await admin
        .from("news")
        .select("ticker, headline, summary_kr, published_at")
        .not("headline", "is", null)
        .gte("published_at", sevenDaysAgo)
        .order("published_at", { ascending: false })
        .limit(20);

      const validNews = ((rawNews ?? []) as unknown as NewsRow[]).filter(
        (n) => n.headline && n.headline.trim().length > 0
      );

      const needed = 6 - cards.length;
      for (const n of validNews.slice(0, needed)) {
        cards.push({ kind: "news", data: n });
      }
    }

    // 회사명 일괄 조회
    const tickers = [
      ...new Set(
        cards
          .map((c) => (c.kind === "filing" ? c.data.ticker : c.data.ticker))
          .filter((t): t is string => t !== null && t !== undefined)
      ),
    ];

    if (tickers.length > 0) {
      const { data: tickerRows } = await admin
        .from("tickers")
        .select("ticker, name_kr, name_en")
        .in("ticker", tickers);
      for (const t of tickerRows ?? []) {
        nameMap.set(t.ticker, t.name_kr ?? t.name_en ?? t.ticker);
      }
    }
  } catch {
    // admin 자격증명 없으면 빈 상태로 fallback
  }

  if (cards.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-foreground md:text-3xl">최근 7일 주요 변화</h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            나스닥 주요 기업에서 발생한 변화를 유형별로 정리합니다.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">공시 데이터를 수집하고 있습니다.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">최근 7일 주요 변화</h2>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          나스닥 주요 기업에서 발생한 변화를 유형별로 정리합니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, idx) => {
          if (card.kind === "filing") {
            const filing = card.data;
            const badge = getEventBadge(filing.event_type, filing.form_type);
            const companyName = nameMap.get(filing.ticker) ?? filing.ticker;
            return (
              <div
                key={`filing-${filing.ticker}-${filing.filed_at}-${idx}`}
                className="rounded-lg border border-border bg-card p-5 flex flex-col gap-2.5"
              >
                {/* ticker */}
                <p className="text-base font-bold text-foreground">
                  {filing.ticker}
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">· {companyName}</span>
                </p>

                {/* 배지 */}
                <span
                  className={`self-start inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium ${BADGE_CLASSES[badge.variant]}`}
                >
                  {badge.label}
                </span>

                {/* 요약 */}
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground flex-1">
                  {filing.summary_kr}
                </p>

                {/* 시간 */}
                <p className="text-xs text-muted-foreground text-right">
                  {formatRelativeTime(filing.filed_at)}
                </p>
              </div>
            );
          }

          // 뉴스 카드
          const news = card.data;
          const ticker = news.ticker ?? null;
          const companyName = ticker ? (nameMap.get(ticker) ?? ticker) : null;
          return (
            <div
              key={`news-${ticker ?? "general"}-${news.published_at}-${idx}`}
              className="rounded-lg border border-border bg-card p-5 flex flex-col gap-2.5"
            >
              {/* ticker */}
              <p className="text-base font-bold text-foreground">
                {ticker ?? "시장 뉴스"}
                {ticker && companyName && companyName !== ticker && (
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">· {companyName}</span>
                )}
              </p>

              {/* 배지 */}
              <span
                className={`self-start inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium ${BADGE_CLASSES["blue"]}`}
              >
                뉴스
              </span>

              {/* 제목 */}
              <p className="line-clamp-2 text-sm font-medium text-foreground">
                {news.headline}
              </p>

              {/* 요약 */}
              {news.summary_kr && (
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground flex-1">
                  {news.summary_kr}
                </p>
              )}

              {/* 시간 */}
              <p className="text-xs text-muted-foreground text-right">
                {formatRelativeTime(news.published_at)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
