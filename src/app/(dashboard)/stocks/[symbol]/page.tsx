import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "@/components/dashboard/dashboard-header";

export const dynamic = "force-dynamic";

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) {
    const kst = new Date(date.getTime() + 9 * 3_600_000);
    return `오늘 ${kst.getUTCHours().toString().padStart(2, "0")}:${kst.getUTCMinutes().toString().padStart(2, "0")} KST`;
  }
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

function formatDate(isoStr: string): string {
  const [y, m, d] = isoStr.split("-");
  return `${y}.${m}.${d}`;
}

function daysUntil(isoStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatEarningsTime(t: string | null): string {
  if (!t) return "";
  const u = t.toUpperCase();
  if (u === "BMO") return "개장 전(BMO)";
  if (u === "AMC") return "장 마감 후(AMC)";
  return t;
}

function filingBadgeClass(formType: string): string {
  const ft = formType.toUpperCase();
  if (ft.startsWith("8-K")) return "border-amber-500/20 bg-amber-500/10 text-amber-400";
  if (ft.startsWith("10-K") || ft.startsWith("10-Q")) return "border-blue-500/20 bg-blue-500/10 text-blue-400";
  if (ft === "4" || ft === "4/A") return "border-purple-500/20 bg-purple-500/10 text-purple-400";
  return "border-white/[0.08] bg-white/[0.04] text-[#a6a6a6]";
}

// ─── SVG 주가 차트 ────────────────────────────────────────────────────────────

function PriceChart({ prices }: { prices: { date: string; close: number }[] }) {
  if (prices.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-[#a6a6a6]">
        주가 데이터를 수집 중입니다
      </div>
    );
  }

  const W = 600, CHART_H = 110, TOTAL_H = 140, PAD_X = 32;
  const closes = prices.map((p) => p.close);
  const minC = Math.min(...closes);
  const maxC = Math.max(...closes);
  const pad = (maxC - minC || 1) * 0.1;
  const yMin = minC - pad;
  const yMax = maxC + pad;

  const toX = (i: number) => PAD_X + (i / (prices.length - 1)) * (W - 2 * PAD_X);
  const toY = (c: number) => 5 + (1 - (c - yMin) / (yMax - yMin)) * (CHART_H - 10);

  const pts = prices.map((p, i) => `${toX(i).toFixed(1)},${toY(p.close).toFixed(1)}`).join(" ");
  const fill = `${pts} ${toX(prices.length - 1).toFixed(1)},${CHART_H} ${toX(0).toFixed(1)},${CHART_H}`;

  const n = prices.length;
  const labels: { i: number; anchor: "start" | "middle" | "end" }[] = [
    { i: 0, anchor: "start" },
    { i: Math.floor((n - 1) / 2), anchor: "middle" },
    { i: n - 1, anchor: "end" },
  ];

  function fmtMD(d: string) {
    const p = d.split("-");
    return `${parseInt(p[1])}/${parseInt(p[2])}`;
  }

  return (
    <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full" style={{ height: "140px" }}>
      <polygon points={fill} fill="rgba(96,165,250,0.08)" />
      <polyline points={pts} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map(({ i, anchor }) => (
        <text key={i} x={toX(i).toFixed(1)} y={CHART_H + 22} textAnchor={anchor} fontSize="11" fill="#a6a6a6">
          {fmtMD(prices[i].date)}
        </text>
      ))}
    </svg>
  );
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

  const [tickerRes, pricesRes, filingsRes, newsRes, earningsRes, insiderRes] =
    await Promise.all([
      supabase
        .from("tickers")
        .select("ticker, name_kr, name_en, exchange, sector, industry")
        .eq("ticker", ticker)
        .maybeSingle(),
      supabase
        .from("stock_prices")
        .select("date, close, change_pct, volume")
        .eq("ticker", ticker)
        .order("date", { ascending: true })
        .limit(30),
      supabase
        .from("filings")
        .select("id, form_type, filed_at, summary_kr, event_type, url")
        .eq("ticker", ticker)
        .order("filed_at", { ascending: false })
        .limit(5),
      supabase
        .from("news")
        .select("id, headline, summary_kr, published_at, url, source")
        .eq("ticker", ticker)
        .order("published_at", { ascending: false })
        .limit(5),
      supabase
        .from("earnings")
        .select("report_date, eps_estimate, time_of_day")
        .eq("ticker", ticker)
        .gte("report_date", today)
        .order("report_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("insider_trades")
        .select("id, name, title, transaction_type, shares, price, transaction_date")
        .eq("ticker", ticker)
        .order("transaction_date", { ascending: false })
        .limit(5),
    ]);

  const info = tickerRes.data;
  const prices = pricesRes.data ?? [];
  const filings = filingsRes.data ?? [];
  const newsList = newsRes.data ?? [];
  const nextEarnings = earningsRes.data;
  const insiders = insiderRes.data ?? [];

  const companyName = info?.name_kr ?? info?.name_en ?? ticker;
  const latestPrice = prices[prices.length - 1] ?? null;
  const changePct = latestPrice?.change_pct ?? null;

  return (
    <div className="flex h-full flex-col gap-6">
      <DashboardHeader title="종목 스냅샷" />

      {/* ─── 헤더 ─── */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-sm font-medium text-[#cccccc]">
            {ticker}
          </span>
          <h1 className="text-xl font-semibold text-white">{companyName}</h1>
        </div>
        {(info?.exchange || info?.sector) && (
          <p className="mt-1 text-sm text-[#a6a6a6]">
            {[info.exchange, info.sector, info.industry].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* ─── 주가 차트 카드 ─── */}
      <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            {latestPrice ? (
              <>
                <p className="text-2xl font-semibold text-white">
                  ${latestPrice.close.toFixed(2)}
                </p>
                {changePct !== null && (
                  <p className={`mt-0.5 text-sm font-medium ${changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[#a6a6a6]">주가 데이터 없음</p>
            )}
          </div>
          <p className="text-xs text-[#a6a6a6]">최근 {prices.length}일 종가</p>
        </div>
        <PriceChart prices={prices} />
      </div>

      {/* ─── 3열 요약 카드 ─── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
          <p className="text-xs text-[#a6a6a6]">최근 종가</p>
          <p className="mt-1.5 text-lg font-semibold text-white">
            {latestPrice ? `$${latestPrice.close.toFixed(2)}` : "—"}
          </p>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
          <p className="text-xs text-[#a6a6a6]">전일 대비</p>
          <p className={`mt-1.5 text-lg font-semibold ${changePct === null ? "text-[#a6a6a6]" : changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {changePct === null ? "—" : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`}
          </p>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
          <p className="text-xs text-[#a6a6a6]">다음 실적</p>
          {nextEarnings ? (
            <>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatDate(nextEarnings.report_date)}{" "}
                <span className="text-xs font-normal text-[#a6a6a6]">
                  (D-{daysUntil(nextEarnings.report_date)}일)
                </span>
              </p>
              {nextEarnings.time_of_day && (
                <p className="mt-0.5 text-xs text-[#a6a6a6]">
                  {formatEarningsTime(nextEarnings.time_of_day)}
                </p>
              )}
              {nextEarnings.eps_estimate != null && (
                <p className="mt-0.5 text-xs text-[#a6a6a6]">
                  시장 예상 EPS{" "}
                  <span className="text-[#cccccc]">${nextEarnings.eps_estimate.toFixed(2)}</span>
                </p>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-lg font-semibold text-[#a6a6a6]">일정 없음</p>
          )}
        </div>
      </div>

      {/* ─── 공시·뉴스 / 내부자 거래 ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">

          {/* 최근 공시 */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">최근 공시</p>
            {filings.length === 0 ? (
              <p className="mt-4 text-sm text-[#a6a6a6]">수집된 공시가 없습니다.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-white/[0.06]">
                {filings.map((f) => (
                  <div key={f.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium ${filingBadgeClass(f.form_type)}`}>
                        {f.form_type}
                      </span>
                      <span className="text-xs text-[#a6a6a6]">{formatRelativeTime(f.filed_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#a6a6a6]">
                      {f.summary_kr ?? "요약 준비 중"}
                    </p>
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        className="self-end text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]">
                        SEC 원문 →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 최근 뉴스 */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">최근 뉴스</p>
            {newsList.length === 0 ? (
              <p className="mt-4 text-sm text-[#a6a6a6]">수집된 뉴스가 없습니다.</p>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-white/[0.06]">
                {newsList.map((n) => (
                  <div key={n.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium leading-snug text-white">{n.headline}</p>
                      <span className="shrink-0 text-xs text-[#a6a6a6]">{formatRelativeTime(n.published_at)}</span>
                    </div>
                    {n.summary_kr && (
                      <p className="text-xs leading-relaxed text-[#a6a6a6]">{n.summary_kr}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {n.source && (
                        <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-[#a6a6a6]">
                          {n.source}
                        </span>
                      )}
                      {n.url && (
                        <a href={n.url} target="_blank" rel="noopener noreferrer"
                          className="ml-auto text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]">
                          원문 →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 내부자 거래 */}
        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">내부자 거래</p>
          <p className="mt-2 text-xs leading-relaxed text-[#a6a6a6]">
            내부자(임원, 이사, 10% 이상 대주주)의 자사주 매수·매도 공시입니다.
          </p>
          {insiders.length === 0 ? (
            <p className="mt-4 text-sm text-[#a6a6a6]">최근 내부자 거래 내역이 없습니다.</p>
          ) : (
            <div className="mt-4 flex flex-col divide-y divide-white/[0.06]">
              {insiders.map((ins) => (
                <div key={ins.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#a6a6a6]">{ins.transaction_date ?? "—"}</span>
                    <span className={`text-xs font-semibold ${ins.transaction_type === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                      {ins.transaction_type === "buy" ? "매수" : "매도"}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">{ins.name ?? "—"}</p>
                  {ins.title && (
                    <p className="text-xs text-[#a6a6a6]">{ins.title}</p>
                  )}
                  <p className="text-xs text-[#a6a6a6]">
                    {ins.shares != null ? `${ins.shares.toLocaleString()}주` : "—"}
                    {ins.price != null ? ` · $${ins.price.toFixed(2)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 면책 문구 ─── */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
