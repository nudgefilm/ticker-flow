import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import { SnapshotHeader } from "@/components/dashboard/snapshot/snapshot-header";
import { StockBrief, StockBriefPending } from "@/components/dashboard/snapshot/stock-brief";
import { PriceCard } from "@/components/dashboard/snapshot/price-card";
import { KeyMetrics } from "@/components/dashboard/snapshot/key-metrics";
import { SnapshotFilings } from "@/components/dashboard/snapshot/snapshot-filings";
import { SnapshotNews } from "@/components/dashboard/snapshot/snapshot-news";
import { CompanyInfo } from "@/components/dashboard/snapshot/company-info";
import { SnapshotInsider } from "@/components/dashboard/snapshot/snapshot-insider";
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
import { fetchPastEarnings } from "@/lib/insights/earnings";

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

  // ── 인증 + BRIEF ─────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  let briefContent: string | null = null;
  let briefGeneratedAt: string | null = null;
  let briefEligible = false;

  if (user) {
    const [profileRes, watchlistRes] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
      supabase
        .from("watchlist")
        .select("ticker")
        .eq("user_id", user.id)
        .eq("ticker", ticker)
        .maybeSingle(),
    ]);

    const isPro = profileRes.data?.plan === "pro";
    const inWatchlist = watchlistRes.data !== null;

    if (isPro && inWatchlist) {
      briefEligible = true;
      const { data: brief } = await supabase
        .from("stock_briefs")
        .select("content, generated_at")
        .eq("ticker", ticker)
        .maybeSingle();
      if (brief) {
        briefContent = brief.content as string;
        briefGeneratedAt = brief.generated_at as string;
      } else {
        // BRIEF 미생성 → 응답 전송 후 백그라운드에서 1회 생성 (다음 방문 시 표시)
        after(async () => {
          const { runStockBriefCollect } = await import("@/lib/collect/brief");
          await runStockBriefCollect(ticker, "snapshot_view").catch(() => {});
        });
      }
    }
  }

  const [tickerRes, pricesRes, filingsRes, newsRes, insiderRes, earnings, nextEarningsRes, splitsRes] =
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
      fetchPastEarnings(supabase, ticker, today),
      supabase
        .from("earnings")
        .select("report_date, eps_estimate, time_of_day")
        .eq("ticker", ticker)
        .gte("report_date", today)
        .order("report_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
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
  const nextEarningsRow = nextEarningsRes.data;
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

      {briefContent && briefGeneratedAt ? (
        <StockBrief
          ticker={ticker}
          content={briefContent}
          generatedAt={briefGeneratedAt}
        />
      ) : briefEligible ? (
        <StockBriefPending ticker={ticker} />
      ) : null}

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

      <SnapshotFilings filings={filings} ticker={ticker} />
      <SnapshotNews news={news} />

      <EarningsFlow earnings={earnings} />

      <DataSources
        description="미국 증권거래위원회(SEC EDGAR) 공시 및 시장 데이터를 기반으로 제공됩니다."
        updatedAt={updatedAt}
      />

      <DashboardDisclaimer />
    </div>
  );
}
