import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import { SnapshotHeader } from "@/components/dashboard/snapshot/snapshot-header";
import { SnapshotCollectModal } from "@/components/dashboard/snapshot/snapshot-collect-modal";
import { StockBrief, CompanyGlanceCard, type StockBriefState } from "@/components/dashboard/snapshot/stock-brief";
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
import { getTargetTickerSets, getBadgeReasons } from "@/lib/collect/target-tickers";
import { STOCK_SNAPSHOT_WINDOW_DAYS } from "@/lib/collect/limits";

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
  const d30 = new Date(Date.now() - STOCK_SNAPSHOT_WINDOW_DAYS * 86_400_000).toISOString();
  const oneYearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  // ── 인증 + BRIEF ─────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  let briefContent: string | null = null;
  let briefGeneratedAt: string | null = null;
  let briefPeriodStart: string | null = null;
  let briefPeriodEnd: string | null = null;
  let briefState: StockBriefState = "gated";

  let isPro = false;
  let inWatchlist = false;
  let watchlistCount = 0;

  if (user) {
    const [profileRes, watchlistRowRes, watchlistCountRes] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle(),
      supabase
        .from("watchlist")
        .select("ticker")
        .eq("user_id", user.id)
        .eq("ticker", ticker)
        .maybeSingle(),
      supabase
        .from("watchlist")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    isPro = profileRes.data?.plan === "pro";
    inWatchlist = watchlistRowRes.data !== null;
    watchlistCount = watchlistCountRes.count ?? 0;

    // BRIEF는 와치리스트 등록 여부와 무관하게 Pro 유저 전체에게 노출한다.
    if (isPro) {
      const { data: brief } = await supabase
        .from("stock_briefs")
        .select("content, generated_at, source_period_start, source_period_end")
        .eq("ticker", ticker)
        .maybeSingle();
      if (brief) {
        briefContent = brief.content as string;
        briefGeneratedAt = brief.generated_at as string;
        briefPeriodStart = brief.source_period_start as string | null;
        briefPeriodEnd = brief.source_period_end as string | null;
        briefState = "ready";
      } else {
        briefState = "pending";
        // BRIEF 미생성 → 응답 전송 후 백그라운드에서 1회 생성 (다음 방문 시 표시)
        after(async () => {
          const { runStockBriefCollect } = await import("@/lib/collect/brief");
          await runStockBriefCollect(ticker, "snapshot_view").catch(() => {});
        });
      }
    }
  }

  const watchlistLimit = isPro ? 30 : 5;
  const watchlistAtLimit = watchlistCount >= watchlistLimit;

  const [tickerRes, pricesRes, filingsRes, newsRes, insiderRes, insiderRecentCountRes, earnings, nextEarningsRes, splitsRes, badgeSets, globalPriceDateRes] =
    await Promise.all([
      supabase
        .from("tickers")
        .select(
          "ticker, name_kr, name_en, exchange, sector, industry, description_kr, ceo, full_time_employees, website, image, ipo_date, headquarters, market_cap"
        )
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
        .from("insider_trades")
        .select("id", { count: "exact", head: true })
        .eq("ticker", ticker)
        .gte("transaction_date", d30.slice(0, 10)),
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
      getTargetTickerSets(),
      // 온디맨드 가격 갱신(옵션 A) 판단용 — 우리가 보유한 전체 최신 거래일
      supabase
        .from("stock_prices")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const info            = tickerRes.data;
  const priceRows       = pricesRes.data ?? [];
  const filingRows      = filingsRes.data ?? [];
  const newsRows        = newsRes.data ?? [];
  const insiderRows     = insiderRes.data ?? [];
  const nextEarningsRow = nextEarningsRes.data;
  const splitRows       = splitsRes.data ?? [];
  const badges          = getBadgeReasons(ticker, badgeSets);

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
      timing: raw === "BMO" ? "BMO" : raw === "AMC" ? "AMC" : null,
      epsEstimate: nextEarningsRow.eps_estimate,
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

  // ── 종목 데이터 수집 이력 확인 (최근 30일 공시·뉴스·내부자거래) ────────────────
  // 셋 다 없으면 첫 방문으로 보고 즉시 백그라운드 수집을 트리거한다.
  const isStale =
    filingRows.length === 0 &&
    newsRows.length === 0 &&
    (insiderRecentCountRes.count ?? 0) === 0;

  let collectRunId: string | null = null;
  if (isStale) {
    const { findRecentRun, createRunRecord, finishRunRecord } = await import("@/lib/collect/log-run");
    const jobType = `ticker-collect:${ticker}`;
    // 동일 종목 1시간 이내 중복 트리거 방지 — 진행 중인 실행이 있으면 그대로 재사용
    const recentRun = await findRecentRun(jobType, 60 * 60 * 1000);

    if (recentRun) {
      if (recentRun.status === "running") collectRunId = recentRun.id;
      // done/error 상태의 최근 실행이 있으면 재트리거하지 않고 모달도 띄우지 않는다.
    } else {
      const runId = await createRunRecord(jobType, "user");
      if (runId) {
        collectRunId = runId;
        after(async () => {
          const { collectTickerFull } = await import("@/lib/collect/collect-ticker");
          try {
            const result = await collectTickerFull(ticker);
            await finishRunRecord(runId, { ok: true, ...result });
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            await finishRunRecord(runId, null, message);
          }
        });
      }
    }
  }

  // ── 가격 온디맨드 갱신 (옵션 A) ──────────────────────────────────────────────
  // 배경 라운드로빈(옵션 C) 자기연쇄가 불안정해 hop 하나만 끊겨도 전 종목 갱신이
  // 밀릴 수 있다. 그래서 사용자가 실제로 보는 종목만큼은 체인 상태와 무관하게
  // 항상 최신을 보장한다: 이 종목의 최신 가격일(quote.dataDate)이 우리가 보유한
  // 전체 최신 거래일(globalLatestPriceDate)보다 뒤처졌거나(또는 가격이 아예 없으면)
  // 단일 티커 가격 수집을 백그라운드로 트리거한다. 고정 "N일" 대신 전체 최신
  // 거래일과 비교해 주말·휴장으로 인한 헛트리거를 피한다. 위 isStale(공시/뉴스/
  // 내부자)과는 완전히 독립적으로 "가격이 뒤처졌는지"만 본다.
  const globalLatestPriceDate = globalPriceDateRes.data?.date ?? null;
  const priceStale =
    !quote?.dataDate ||
    (globalLatestPriceDate != null && quote.dataDate < globalLatestPriceDate);

  if (priceStale) {
    const { findRecentRun, createRunRecord, finishRunRecord } = await import("@/lib/collect/log-run");
    const priceJob = `prices-ondemand:${ticker}`;
    // 같은 종목 1시간 이내 중복 트리거 방지 (기존 findRecentRun 패턴 재사용).
    // done/error/running 무엇이든 최근 실행이 있으면 재트리거하지 않는다.
    const recentPriceRun = await findRecentRun(priceJob, 60 * 60 * 1000);
    if (!recentPriceRun) {
      const priceRunId = await createRunRecord(priceJob, "user");
      if (priceRunId) {
        after(async () => {
          const { collectTickerPrices } = await import("@/lib/collect/collect-ticker");
          try {
            const result = await collectTickerPrices(ticker);
            await finishRunRecord(priceRunId, result);
          } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            await finishRunRecord(priceRunId, null, message);
          }
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SnapshotCollectModal runId={collectRunId} />

      <DashboardHeader title="종목 스냅샷" />

      <SnapshotHeader
        ticker={ticker}
        name={companyName}
        exchange={info?.exchange ?? null}
        sector={info?.sector ?? null}
        industry={info?.industry ?? null}
        updatedAt={updatedAt}
        showWatchlistButton={!!user}
        inWatchlist={inWatchlist}
        atLimit={watchlistAtLimit}
        isPro={isPro}
        badges={badges}
      />

      <PriceCard quote={quote} />

      <StockSplits splits={splitRows} />

      <KeyMetrics quote={quote} nextEarnings={nextEarnings} />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <CompanyInfo
          className="h-full"
          exchange={info?.exchange ?? null}
          sector={info?.sector ?? null}
          industry={info?.industry ?? null}
          ceo={info?.ceo ?? null}
          fullTimeEmployees={info?.full_time_employees ?? null}
          ipoDate={info?.ipo_date ?? null}
          headquarters={info?.headquarters ?? null}
          marketCap={info?.market_cap ?? null}
          website={info?.website ?? null}
        />
        <SnapshotInsider className="h-full" trades={trades} />
      </div>

      <SnapshotFilings
        filings={filings}
        ticker={ticker}
        showWatchlistButton={!!user}
        inWatchlist={inWatchlist}
        atLimit={watchlistAtLimit}
        isPro={isPro}
      />
      <SnapshotNews
        news={news}
        ticker={ticker}
        showWatchlistButton={!!user}
        inWatchlist={inWatchlist}
        atLimit={watchlistAtLimit}
        isPro={isPro}
      />

      <EarningsFlow earnings={earnings} />

      {info?.description_kr ? (
        <CompanyGlanceCard
          ticker={ticker}
          descriptionKr={info.description_kr}
          companyImage={info?.image ?? null}
        />
      ) : null}

      <StockBrief
        ticker={ticker}
        state={briefState}
        content={briefContent}
        generatedAt={briefGeneratedAt}
        periodStart={briefPeriodStart}
        periodEnd={briefPeriodEnd}
      />

      <DataSources
        description="미국 증권거래위원회(SEC EDGAR) 공시 및 시장 데이터를 기반으로 제공됩니다."
        updatedAt={updatedAt}
      />

      <DashboardDisclaimer />
    </div>
  );
}
