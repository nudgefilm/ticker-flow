export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import ProGate from "@/components/dashboard/pro-gate";
import InsiderBoard, {
  type InsiderTrade,
} from "@/components/dashboard/insider-board";

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
  if (isPro && user) {
    const adminClient = createAdminClient();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const [watchlistRes, tradesRes] = await Promise.all([
      supabase.from("watchlist").select("ticker"),
      adminClient
        .from("insider_trades")
        .select(
          "id, ticker, name, title, transaction_type, shares, price, value, transaction_date, tickers(name_kr)"
        )
        .gte("transaction_date", ninetyDaysAgo)
        .order("transaction_date", { ascending: false })
        .limit(500),
    ]);

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
      // value 컬럼 = shares * price (기존 호환)
      transaction_value:
        r.value ?? (r.shares != null && r.price != null ? r.shares * r.price : null),
      transaction_date: r.transaction_date,
      in_watchlist: watchlistSet.has(r.ticker),
    }));
  }

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
          <InsiderBoard trades={trades} isPro={isPro} />
        </ProGate>
      </div>

      <DashboardDisclaimer />
    </div>
  );
}
