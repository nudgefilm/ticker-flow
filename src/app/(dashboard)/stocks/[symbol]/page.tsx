import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import { SnapshotHeader } from "@/components/dashboard/snapshot/snapshot-header";
import { PriceCard } from "@/components/dashboard/snapshot/price-card";
import { KeyMetrics } from "@/components/dashboard/snapshot/key-metrics";
import { SnapshotFilings } from "@/components/dashboard/snapshot/snapshot-filings";
import { SnapshotNews } from "@/components/dashboard/snapshot/snapshot-news";
import { CompanyInfo } from "@/components/dashboard/snapshot/company-info";
import { SnapshotInsider } from "@/components/dashboard/snapshot/snapshot-insider";
import { SnapshotAnalyst } from "@/components/dashboard/snapshot/snapshot-analyst";
import { StockSplits } from "@/components/dashboard/snapshot/stock-splits";
import EarningsFlow from "@/components/dashboard/insights/earnings-flow";
import DataSources from "@/components/dashboard/insights/data-sources";
import type {
  Quote,
  NextEarnings,
  Filing,
  NewsItem,
  InsiderTrade,
  EarningsRow,
} from "@/lib/insights/types";
import type { AnalystRow } from "@/components/dashboard/snapshot/snapshot-analyst";

export const dynamic = "force-dynamic";

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  ceo_change: "CEO 변경", cfo_change: "CFO 변경", buyback: "자사주 매입",
  contract: "대규모 계약", dividend: "배당", guidance: "Guidance 변경",
  ma: "M&A", lawsuit: "소송", restructuring: "구조조정", insider_trade: "내부자 거래",
};

function daysUntil(isoStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function deriveQuarter(reportDate: string): string {
  const parts = reportDate.slice(0, 10).split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const q = Math.ceil(month / 3);
  return `${String(year).slice(2)}.Q${q}`;
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const ticker = symbol.toUpperCase();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const d30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const oneYearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  const [tickerRes, pricesRes, filingsRes, newsRes, insiderRes, earningsRes, nextEarningsRes, analystRes, splitsRes] =
    await Promise.all([
      supabase
        .from("tickers")
        .select("ticker, name_kr, name_en, exchange, sector, industry")
        .eq("ticker", ticker)
        .maybeSingle(),
      supabase
        .from("stock_prices")
        .select("date, close")
        .eq("ticker", ticker)
        .gte("date", oneYearAgo)
        .order("date", { ascending: true }),
      supabase
        .from("filings")
        .select("id, form_type, filed_at, summary_kr, event_type, url")
        .eq("ticker", ticker)
        .gte("filed_at", d30)
        .order("filed_at", { ascending: false })
        .limit(5),
      supabase
        .from("news")
        .select("id, headline, summary_kr, published_at, url, source")
        .eq("ticker", ticker)
        .gte("published_at", d30)
        .order("published_at", { ascending: false })
        .limit(5),
      supabase
        .from("insider_trades")
        .select("id, name, title, transaction_type, shares, price, value, transaction_date")
        .eq("ticker", ticker)
        .order("transaction_date", { ascending: false })
        .limit(10),
      supabase
        .from("earnings")
        .select("id, report_date, eps_estimate, actual_eps")
        .eq("ticker", ticker)
        .order("report_date", { ascending: false })
        .limit(4),
      supabase
        .from("earnings")
        .select("report_date, eps_estimate, time_of_day")
        .eq("ticker", ticker)
        .gte("report_date", today)
        .order("report_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("analyst_ratings")
        .select("id, period, strong_buy, buy, hold, sell, strong_sell")
        .eq("ticker", ticker)
        .order("period", { ascending: false })
        .limit(3),
      supabase
        .from("stock_splits")
        .select("id, split_date, numerator, denominator")
        .eq("ticker", ticker)
        .order("split_date", { ascending: false }),
    ]);

  const info            = tickerRes.data;
  const priceRows       = pricesRes.data ?? [];
  const filingRows      = filingsRes.data ?? [];
  const newsRows        = newsRes.data ?? [];
  const insiderRows     = insiderRes.data ?? [];
  const earningsRows    = earningsRes.data ?? [];
  const nextEarningsRow = nextEarningsRes.data;
  const analystRows     = (analystRes.data ?? []) as AnalystRow[];
  const splitRows       = splitsRes.data ?? [];

  // ── Quote ────────────────────────────────────────────────────────────────
  let quote: Quote | null = null;
  if (priceRows.length >= 2) {
    const history = priceRows.map((p) => p.close);
    const last = priceRows[priceRows.length - 1];
    const prev = priceRows[priceRows.length - 2];
    const change = last.close - prev.close;
    quote = {
      close: last.close,
      change,
      changePct: (change / prev.close) * 100,
      dataDate: last.date,
      history,
      week52High: Math.max(...history),
      week52Low: Math.min(...history),
    };
  } else if (priceRows.length === 1) {
    const last = priceRows[0];
    quote = {
      close: last.close,
      change: 0,
      changePct: 0,
      dataDate: last.date,
      history: [last.close],
      week52High: last.close,
      week52Low: last.close,
    };
  }

  // ── NextEarnings ─────────────────────────────────────────────────────────
  let nextEarnings: NextEarnings | null = null;
  if (nextEarningsRow) {
    const raw = nextEarningsRow.time_of_day?.toUpperCase();
    nextEarnings = {
      date: nextEarningsRow.report_date,
      daysUntil: daysUntil(nextEarningsRow.report_date),
      timing: raw === "BMO" ? "BMO" : "AMC",
      epsEstimate: nextEarningsRow.eps_estimate ?? 0,
    };
  }

  // ── Filings ───────────────────────────────────────────────────────────────
  const filings: Filing[] = filingRows.map((f) => {
    const eventLabel = f.event_type
      ? (EVENT_TYPE_LABELS[f.event_type] ?? f.event_type)
      : undefined;
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

  // ── News ──────────────────────────────────────────────────────────────────
  const news: NewsItem[] = newsRows.map((n) => ({
    id: n.id,
    headline: n.headline,
    source: n.source,
    publishedAt: n.published_at,
    url: n.url,
    summaryKr: n.summary_kr,
  }));

  // ── InsiderTrades ─────────────────────────────────────────────────────────
  const trades: InsiderTrade[] = insiderRows.map((t) => ({
    id: t.id,
    name: t.name ?? "—",
    titleLabel: t.title ?? undefined,
    type: t.transaction_type === "buy" ? "매수" : "매도",
    shares: t.shares,
    price: t.price,
    value: t.value,
    date: t.transaction_date ?? "—",
  }));

  // ── Earnings ──────────────────────────────────────────────────────────────
  // Chart requires oldest-first (left→right = past→present); table reverses internally.
  const earnings: EarningsRow[] = earningsRows
    .map((e) => ({
      id: e.id,
      quarter: deriveQuarter(e.report_date),
      epsEstimate: e.eps_estimate,
      epsActual: e.actual_eps,
      reportDate: e.report_date,
    }))
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate));

  const companyName = info?.name_kr ?? info?.name_en ?? ticker;
  const updatedAt = quote?.dataDate
    ? (() => {
        const [, m, d] = quote.dataDate.split("-");
        return `${parseInt(m)}월 ${parseInt(d)}일`;
      })()
    : null;

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader title="종목 스냅샷" />

      <SnapshotHeader
        ticker={ticker}
        name={companyName}
        exchange={info?.exchange ?? null}
        sector={info?.sector ?? null}
        industry={info?.industry ?? null}
        updatedAt={updatedAt}
      />

      <PriceCard quote={quote} />

      <StockSplits splits={splitRows} />

      <KeyMetrics quote={quote} nextEarnings={nextEarnings} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CompanyInfo
          exchange={info?.exchange ?? null}
          sector={info?.sector ?? null}
          industry={info?.industry ?? null}
        />
        <SnapshotInsider trades={trades} />
      </div>

      <SnapshotAnalyst ratings={analystRows} />

      <SnapshotFilings filings={filings} ticker={ticker} />
      <SnapshotNews news={news} />

      <EarningsFlow earnings={earnings} />

      <DataSources updatedAt={updatedAt} />

      <DashboardDisclaimer />
    </div>
  );
}
