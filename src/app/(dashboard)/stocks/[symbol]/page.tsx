import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import SnapshotHeader from "@/components/dashboard/snapshot/snapshot-header";
import { PriceCardFull } from "@/components/dashboard/snapshot/price-card";
import KeyMetrics from "@/components/dashboard/snapshot/key-metrics";
import SnapshotFilings from "@/components/dashboard/snapshot/snapshot-filings";
import SnapshotNews from "@/components/dashboard/snapshot/snapshot-news";
import CompanyInfo from "@/components/dashboard/snapshot/company-info";
import SnapshotInsider from "@/components/dashboard/snapshot/snapshot-insider";
import DataSources from "@/components/dashboard/insights/data-sources";
import type {
  Quote,
  NextEarnings,
  Filing,
  NewsItem,
  InsiderTrade,
} from "@/lib/insights/types";

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

  const [tickerRes, pricesRes, filingsRes, newsRes, insiderRes, earningsRes, nextEarningsRes] =
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
        .order("date", { ascending: true })
        .limit(30),
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
        .limit(5),
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
    ]);

  const info        = tickerRes.data;
  const priceRows   = pricesRes.data ?? [];
  const filingRows  = filingsRes.data ?? [];
  const newsRows    = newsRes.data ?? [];
  const insiderRows = insiderRes.data ?? [];
  const nextEarningsRow = nextEarningsRes.data;

  // ── Quote 변환 ────────────────────────────────────────────────────────────
  let quote: Quote | null = null;
  if (priceRows.length >= 2) {
    const history = priceRows.map((p) => p.close);
    const last = priceRows[priceRows.length - 1];
    const prev = priceRows[priceRows.length - 2];
    const change = last.close - prev.close;
    const changePct = (change / prev.close) * 100;
    quote = {
      close: last.close,
      change,
      changePct,
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

  const priceDates = priceRows.map((p) => p.date);

  // ── NextEarnings 변환 ─────────────────────────────────────────────────────
  let nextEarnings: NextEarnings | null = null;
  if (nextEarningsRow) {
    const raw = nextEarningsRow.time_of_day?.toUpperCase();
    const timing: "BMO" | "AMC" = raw === "BMO" ? "BMO" : "AMC";
    nextEarnings = {
      date: nextEarningsRow.report_date,
      daysUntil: daysUntil(nextEarningsRow.report_date),
      timing,
      epsEstimate: nextEarningsRow.eps_estimate ?? 0,
    };
  }

  // ── Filing 변환 ───────────────────────────────────────────────────────────
  const filings: Filing[] = filingRows.map((f) => {
    const eventLabel = f.event_type
      ? (EVENT_TYPE_LABELS[f.event_type] ?? f.event_type)
      : undefined;
    const ft = f.form_type;
    const importance =
      f.event_type
        ? "high"
        : ft.startsWith("10-K") || ft.startsWith("10-Q")
        ? "medium"
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

  // ── NewsItem 변환 ─────────────────────────────────────────────────────────
  const news: NewsItem[] = newsRows.map((n) => ({
    id: n.id,
    headline: n.headline,
    source: n.source,
    publishedAt: n.published_at,
    url: n.url,
    summaryKr: n.summary_kr,
  }));

  // ── InsiderTrade 변환 ─────────────────────────────────────────────────────
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

  return (
    <div className="flex h-full flex-col gap-5">
      <DashboardHeader title="종목 스냅샷" />

      {/* 종목 헤더 */}
      <SnapshotHeader
        ticker={ticker}
        name={companyName}
        exchange={info?.exchange ?? null}
        sector={info?.sector ?? null}
        industry={info?.industry ?? null}
      />

      {/* 주가 차트 */}
      <PriceCardFull quote={quote} dates={priceDates} />

      {/* 핵심 지표 3종 */}
      <KeyMetrics quote={quote} nextEarnings={nextEarnings} />

      {/* 공시·뉴스 / 기업정보·내부자거래 그리드 */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* 좌측 2/3 */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <SnapshotFilings filings={filings} ticker={ticker} />
          <SnapshotNews news={news} />
        </div>

        {/* 우측 1/3 */}
        <div className="flex flex-col gap-5">
          <CompanyInfo
            exchange={info?.exchange ?? null}
            sector={info?.sector ?? null}
            industry={info?.industry ?? null}
          />
          <SnapshotInsider trades={trades} />
        </div>
      </div>

      {/* 데이터 출처 */}
      <DataSources />

      {/* 면책 문구 */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
