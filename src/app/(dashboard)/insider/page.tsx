export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import ProGate from "@/components/dashboard/pro-gate";
import InsiderBoard, {
  type InsiderTrade,
} from "@/components/dashboard/insider-board";
import DataSources from "@/components/dashboard/insights/data-sources";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type InsiderRow = {
  id: string;
  ticker: string;
  name: string | null;
  title: string | null;
  transaction_type: string;
  shares: number | null;
  price: number | null;
  value: number | null;
  transaction_date: string | null;
  tickers: { name_kr: string | null } | null;
};

type HoldingRow = {
  institution_name: string | null;
  value: number | null;
};

type HoldingSummary = {
  institution_name: string;
  ticker_count: number;
  total_value: number;
};

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function fmtValue(v: number): string {
  if (v >= 1_000_000_000_000) return `$${(v / 1_000_000_000_000).toFixed(2)}T`;
  if (v >= 1_000_000_000)     return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)         return `$${(v / 1_000_000).toFixed(0)}M`;
  return `$${v.toLocaleString("en-US")}`;
}

// ─── 기관 보유 현황 컴포넌트 ──────────────────────────────────────────────────

function InstitutionalHoldings({
  holdings,
  quarter,
}: {
  holdings: HoldingSummary[];
  quarter: string | null;
}) {
  if (holdings.length === 0) {
    return (
      <div className="mb-8 overflow-hidden rounded-lg border border-white/[0.08]">
        <div className="border-b border-white/[0.06] bg-[#111111] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">기관 보유 현황</h2>
          <p className="mt-0.5 text-xs text-[#a6a6a6]">최신 분기 기관별 보유 금액 상위 10개</p>
        </div>
        <div className="bg-[#111111] px-5 py-8 text-center text-sm text-[#a6a6a6]">
          수집 중입니다.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 overflow-hidden rounded-lg border border-white/[0.08]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#111111] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">기관 보유 현황</h2>
          <p className="mt-0.5 text-xs text-[#a6a6a6]">최신 분기 기관별 보유 금액 상위 10개</p>
        </div>
        {quarter && (
          <span className="rounded-[4px] border border-white/[0.08] px-2 py-1 text-[11px] text-[#a6a6a6]">
            {quarter}
          </span>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-[#0f0f0f]">
            <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[#a6a6a6]">#</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium text-[#a6a6a6]">기관명</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium text-[#a6a6a6]">보유 종목 수</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-medium text-[#a6a6a6]">총 보유 금액</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05] bg-[#111111]">
          {holdings.map((h, idx) => (
            <tr key={h.institution_name} className="transition-colors hover:bg-[#1a1a1a]">
              <td className="px-5 py-3 text-xs text-[#a6a6a6] tabular-nums">{idx + 1}</td>
              <td className="max-w-[260px] px-4 py-3">
                <span className="block truncate text-sm text-[#cccccc]">{h.institution_name}</span>
              </td>
              <td className="px-4 py-3 text-right text-sm tabular-nums text-[#a6a6a6]">
                {h.ticker_count.toLocaleString("en-US")}종목
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-white">
                {fmtValue(h.total_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-white/[0.06] bg-[#111111] px-5 py-2.5 text-right text-[10px] text-[#a6a6a6]">
        출처: SEC 13F 공시 기반. 참고 정보로만 활용하세요.
      </p>
    </div>
  );
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default async function InsiderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // isPro 체크
  let isPro = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    isPro = profile?.plan === "pro";
  }

  // Pro 유저만 데이터 조회
  let trades: InsiderTrade[] = [];
  let holdings: HoldingSummary[] = [];
  let latestQuarter: string | null = null;

  if (isPro && user) {
    const adminClient = createAdminClient();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    // ── 기관 보유 현황: 최신 분기 파악 ─────────────────────────────────────
    const quarterRes = await supabase
      .from("institutional_holdings")
      .select("quarter")
      .not("quarter", "is", null)
      .order("quarter", { ascending: false })
      .limit(1)
      .maybeSingle();

    latestQuarter = quarterRes.data?.quarter ?? null;

    const [watchlistRes, tradesRes, holdingsRes] = await Promise.all([
      supabase.from("watchlist").select("ticker"),
      adminClient
        .from("insider_trades")
        .select(
          "id, ticker, name, title, transaction_type, shares, price, value, transaction_date, tickers(name_kr)"
        )
        .gte("transaction_date", ninetyDaysAgo)
        .order("transaction_date", { ascending: false })
        .limit(500),
      // 기관 보유 현황: 최신 분기 전체 조회 후 JS 집계
      latestQuarter
        ? supabase
            .from("institutional_holdings")
            .select("institution_name, value")
            .eq("quarter", latestQuarter)
            .not("institution_name", "is", null)
            .order("value", { ascending: false })
            .limit(2000)
        : Promise.resolve({ data: [] }),
    ]);

    // 내부자 거래 매핑
    const watchlistSet = new Set(
      (watchlistRes.data ?? []).map((r) => r.ticker)
    );
    const rows = (tradesRes.data ?? []) as unknown as InsiderRow[];
    trades = rows.map((r) => ({
      id: r.id,
      ticker: r.ticker,
      name_kr: r.tickers?.name_kr ?? null,
      name: r.name,
      title: r.title,
      transaction_type: r.transaction_type,
      shares: r.shares,
      price: r.price,
      transaction_value:
        r.value ?? (r.shares != null && r.price != null ? r.shares * r.price : null),
      transaction_date: r.transaction_date,
      in_watchlist: watchlistSet.has(r.ticker),
    }));

    // 기관 보유 현황: institution_name 기준 집계 → 상위 10개
    const holdingRows = (holdingsRes.data ?? []) as HoldingRow[];
    const holdingMap = new Map<string, { tickerCount: number; totalValue: number }>();
    for (const row of holdingRows) {
      if (!row.institution_name) continue;
      const entry = holdingMap.get(row.institution_name) ?? { tickerCount: 0, totalValue: 0 };
      entry.tickerCount += 1;
      entry.totalValue += row.value ?? 0;
      holdingMap.set(row.institution_name, entry);
    }
    holdings = Array.from(holdingMap.entries())
      .sort((a, b) => b[1].totalValue - a[1].totalValue)
      .slice(0, 10)
      .map(([name, data]) => ({
        institution_name: name,
        ticker_count: data.tickerCount,
        total_value: data.totalValue,
      }));
  }

  function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  }
  const dataUpdatedAt = trades.length > 0 && trades[0].transaction_date
    ? fmtDate(trades[0].transaction_date)
    : null;

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="내부자 거래" badge />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        내부자(임원·이사·10% 이상 대주주)의 자사 주식 매수·매도 현황입니다.
        SEC Form 4 공시를 기반으로 수집합니다.
      </p>

      <div className="mt-6 flex-1">
        <ProGate
          iconName="user"
          title="내부자 거래는 Pro 전용 기능입니다"
          description="CEO·임원진이 자사 주식을 사고팔았는지 빠르게 확인하세요.&#10;SEC Form 4 공시를 기반으로 주요 내부자 거래와 변화 흐름을 모니터링할 수 있습니다."
        >
          <InstitutionalHoldings holdings={holdings} quarter={latestQuarter} />
          <InsiderBoard trades={trades} isPro={isPro} />
        </ProGate>
      </div>

      <div className="mt-6">
        <DataSources
          description="미국 증권거래위원회(SEC) Form 4 공시를 기반으로 제공됩니다."
          updatedAt={dataUpdatedAt}
        />
      </div>
      <DashboardDisclaimer />
    </div>
  );
}
