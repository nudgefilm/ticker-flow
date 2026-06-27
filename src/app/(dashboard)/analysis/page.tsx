import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import ProGate from "@/components/dashboard/pro-gate";
import StockHeader from "@/components/dashboard/insights/stock-header";
import ChangeSummary from "@/components/dashboard/insights/change-summary";
import RecentFilings from "@/components/dashboard/insights/recent-filings";
import ChangeTimeline from "@/components/dashboard/insights/change-timeline";
import InsiderTrading from "@/components/dashboard/insights/insider-trading";
import EarningsFlow from "@/components/dashboard/insights/earnings-flow";
import RelatedNews from "@/components/dashboard/insights/related-news";
import DataSources from "@/components/dashboard/insights/data-sources";
import type {
  Filing,
  TimelineEvent,
  InsiderTrade,
  InsiderSummary,
  EarningsRow,
  NewsItem,
  StockInsight,
} from "@/lib/insights/types";

export const dynamic = "force-dynamic";

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  ceo_change:    "CEO 변경",
  cfo_change:    "CFO 변경",
  buyback:       "자사주 매입",
  contract:      "대규모 계약",
  dividend:      "배당",
  guidance:      "Guidance 변경",
  ma:            "M&A",
  lawsuit:       "소송",
  restructuring: "구조조정",
  insider_trade: "내부자 거래",
};

function deriveQuarter(reportDate: string): string {
  const parts = reportDate.slice(0, 10).split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const q = Math.ceil(month / 3);
  return `${String(year).slice(2)}.Q${q}`;
}

function fmtVolume(total: number): string {
  if (total >= 1_000_000_000) return `$${(total / 1_000_000_000).toFixed(1)}B`;
  if (total >= 1_000_000) return `$${Math.round(total / 1_000_000)}M`;
  if (total >= 1_000) return `$${Math.round(total / 1_000)}K`;
  return `$${Math.round(total)}`;
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const supabase = await createClient();
  const { symbol: symbolParam } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  type WatchlistRow = {
    ticker: string;
    tickers: { name_kr: string | null; name_en: string | null } | null;
  };

  const { data: watchlistData } = user
    ? await supabase
        .from("watchlist")
        .select("ticker, tickers(name_kr, name_en)")
        .eq("user_id", user.id)
        .order("added_at", { ascending: true })
    : { data: null };

  const watchlistRows = (watchlistData ?? []) as unknown as WatchlistRow[];
  const watchlistOptions = watchlistRows.map((r) => ({
    ticker: r.ticker,
    name: r.tickers?.name_kr ?? r.tickers?.name_en ?? r.ticker,
  }));

  const symbol = symbolParam || watchlistRows[0]?.ticker || "AAPL";

  const now = new Date();
  const d30  = new Date(now.getTime() - 30  * 86_400_000).toISOString();
  const d90  = new Date(now.getTime() - 90  * 86_400_000).toISOString();
  const d180 = new Date(now.getTime() - 180 * 86_400_000).toISOString().slice(0, 10);

  const [tickerRes, pricesRes, filingsRes, newsRes, insiderRes, earningsRes] =
    await Promise.all([
      supabase
        .from("tickers")
        .select("ticker, name_kr, name_en, exchange, sector, industry")
        .eq("ticker", symbol)
        .maybeSingle(),
      supabase
        .from("stock_prices")
        .select("date, close")
        .eq("ticker", symbol)
        .order("date", { ascending: true })
        .limit(30),
      supabase
        .from("filings")
        .select("id, filed_at, form_type, event_type, summary_kr, url")
        .eq("ticker", symbol)
        .gte("filed_at", d30)
        .order("filed_at", { ascending: false }),
      supabase
        .from("news")
        .select("id, headline, source, published_at, url, summary_kr")
        .eq("ticker", symbol)
        .gte("published_at", d90)
        .order("published_at", { ascending: false })
        .limit(10),
      supabase
        .from("insider_trades")
        .select("id, name, title, transaction_type, shares, price, value, transaction_date")
        .eq("ticker", symbol)
        .gte("transaction_date", d180)
        .order("transaction_date", { ascending: false }),
      supabase
        .from("earnings")
        .select("id, report_date, eps_estimate, actual_eps")
        .eq("ticker", symbol)
        .order("report_date", { ascending: false })
        .limit(4),
    ]);

  function dedupeById<T extends { id: string | number }>(rows: T[]): T[] {
    const seen = new Set<string>();
    return rows.filter((r) => {
      const key = String(r.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const tickerRow    = tickerRes.data;
  const prices       = pricesRes.data   ?? [];
  const filingRows   = dedupeById(filingsRes.data  ?? []);
  const newsRows     = dedupeById(newsRes.data     ?? []);
  const insiderRows  = dedupeById(insiderRes.data  ?? []);
  const earningsRows = dedupeById(earningsRes.data ?? []);

  // ── filings ───────────────────────────────────────────────────────────────
  const filings: Filing[] = filingRows.map((f) => {
    const eventLabel = f.event_type ? (EVENT_TYPE_LABELS[f.event_type] ?? f.event_type) : undefined;
    const ft = f.form_type;
    const importance =
      f.event_type ? "high"
      : ft.startsWith("10-K") || ft.startsWith("10-Q") ? "medium"
      : "low";
    return {
      id: f.id,
      date: f.filed_at.slice(0, 10),
      formType: f.form_type,
      eventType: eventLabel,
      summary: f.summary_kr ?? "요약 준비 중",
      importance,
      url: f.url ?? "#",
    };
  });

  // ── insider ───────────────────────────────────────────────────────────────
  const insiderTrades: InsiderTrade[] = insiderRows.map((t) => ({
    id: t.id,
    name: t.name ?? "—",
    titleLabel: t.title ?? undefined,
    type: t.transaction_type === "buy" ? "매수" : "매도",
    shares: t.shares,
    price: t.price,
    value: t.value,
    date: t.transaction_date ?? "—",
  }));

  const buyCount = insiderTrades.filter((t) => t.type === "매수").length;
  const sellCount = insiderTrades.filter((t) => t.type === "매도").length;
  const totalVolumeNum = insiderRows.reduce((s, t) => s + (t.value ?? 0), 0);
  const insider: InsiderSummary = {
    buyCount,
    sellCount,
    totalVolume: fmtVolume(totalVolumeNum),
    trades: insiderTrades,
  };

  // ── earnings ──────────────────────────────────────────────────────────────
  const earnings: EarningsRow[] = earningsRows.map((e) => ({
    id: e.id,
    quarter: deriveQuarter(e.report_date),
    epsEstimate: e.eps_estimate,
    epsActual: e.actual_eps,
    reportDate: e.report_date,
  }));

  // ── news ──────────────────────────────────────────────────────────────────
  const news: NewsItem[] = newsRows.map((n) => ({
    id: n.id,
    headline: n.headline,
    source: n.source,
    publishedAt: n.published_at,
    url: n.url,
    summaryKr: n.summary_kr,
  }));

  // ── timeline ──────────────────────────────────────────────────────────────
  const timeline: TimelineEvent[] = [
    ...filingRows.map((f) => ({
      id: `f-${f.id}`,
      kind: "filing" as const,
      date: f.filed_at.slice(0, 10),
      title: [
        f.form_type,
        f.event_type ? (EVENT_TYPE_LABELS[f.event_type] ?? f.event_type) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      description: f.summary_kr ?? undefined,
    })),
    ...newsRows.map((n) => ({
      id: `n-${n.id}`,
      kind: "news" as const,
      date: n.published_at.slice(0, 10),
      title: n.headline,
      description: n.summary_kr ?? undefined,
    })),
    ...insiderRows.map((t) => ({
      id: `i-${t.id}`,
      kind: "insider" as const,
      date: t.transaction_date ?? "",
      title: "내부자 거래",
      description: `${t.name ?? "—"} ${t.transaction_type === "buy" ? "매수" : "매도"}`,
    })),
    ...earningsRows.map((e) => ({
      id: `e-${e.id}`,
      kind: "earnings" as const,
      date: e.report_date,
      title: "실적 발표",
      description: `${deriveQuarter(e.report_date)} EPS ${e.actual_eps ?? "—"}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // ── 주가 정보 ─────────────────────────────────────────────────────────────
  const lastPrice = prices[prices.length - 1];
  const lastDate  = lastPrice?.date ?? null;
  const updatedAt = lastDate
    ? (() => {
        const d = new Date(lastDate + "T00:00:00Z");
        return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
      })()
    : null;

  const insight: StockInsight = {
    ticker: symbol,
    name: tickerRow?.name_kr ?? tickerRow?.name_en ?? symbol,
    exchange: tickerRow?.exchange ?? null,
    sector: tickerRow?.sector ?? null,
    industry: tickerRow?.industry ?? null,
    lastClose: lastPrice?.close ?? null,
    updatedAt,
    marketCap: "준비 중",
    summary: {
      filings: filingRows.length,
      keyEvents: filingRows.filter((f) => f.event_type !== null).length,
      insiderTrades: insiderRows.length,
      news: newsRows.length,
      earnings: earningsRows.length,
    },
    filings,
    timeline,
    insider,
    earnings,
    news,
  };

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="공시 인사이트" badge />

      <div className="mt-6 flex-1">
        <ProGate
          iconName="flame"
          title="공시 인사이트는 Pro 전용 기능입니다"
          description="SEC 공시를 기반으로 기업의 주요 변화를 모니터링합니다.&#10;공시 요약, 내부자 거래, 실적, 뉴스를 하나의 화면에서 확인하세요."
        >
          <div className="flex flex-col gap-6">
            {/* 종목 헤더 + 콤보박스 + 5 통계 */}
            <StockHeader
              ticker={symbol}
              name={insight.name}
              exchange={insight.exchange}
              sector={insight.sector}
              industry={insight.industry}
              updatedAt={insight.updatedAt}
              summary={insight.summary}
              comboboxOptions={watchlistOptions}
            />

            {/* 최근 공시 (필터 탭 포함) */}
            <RecentFilings filings={insight.filings} />

            {/* 변화 타임라인 */}
            <ChangeTimeline events={insight.timeline} />

            {/* 내부자 거래 전체 테이블 */}
            <InsiderTrading insider={insight.insider} />

            {/* 실적 흐름 */}
            <EarningsFlow earnings={insight.earnings} />

            {/* 관련 뉴스 */}
            <RelatedNews news={insight.news} />

            {/* 주요 변화 요약 */}
            <ChangeSummary events={insight.timeline} />

            {/* 데이터 출처 */}
            <DataSources updatedAt={insight.updatedAt} />
          </div>
        </ProGate>
      </div>

      <DashboardDisclaimer />
    </div>
  );
}
