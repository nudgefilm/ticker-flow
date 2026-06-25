import { Suspense } from "react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type InsiderRow = {
  ticker: string;
  name: string | null;
  title: string | null;
  transaction_type: string;
  shares: number | null;
  price: number | null;
  value: number | null;
  transaction_date: string | null;
  tickers: { name_kr: string | null; name_en: string | null } | null;
};

function fmtShares(shares: number | null): string {
  if (shares == null) return "—";
  if (shares >= 10_000) return `${Math.round(shares / 10_000).toLocaleString("ko-KR")}만 주`;
  if (shares >= 1_000) return `${Math.round(shares / 1_000).toLocaleString("ko-KR")}천 주`;
  return `${shares.toLocaleString("ko-KR")}주`;
}

function fmtValue(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

const COLS = "grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_0.9fr_0.9fr_1.1fr]";

function InsiderSkeleton() {
  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111]">
        <div className="bg-[#0f0f0f] px-5 py-3">
          <div className="h-3 w-64 animate-pulse rounded bg-white/[0.06]" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-white/[0.06] px-5 py-4"
          >
            <div className="h-3 w-12 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-5 w-10 animate-pulse rounded bg-white/[0.06]" />
            <div className="ml-auto h-3 w-14 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-14 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function InsiderTradeList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insider_trades")
    .select(
      "ticker, name, title, transaction_type, shares, price, value, transaction_date, tickers (name_kr, name_en)"
    )
    .order("transaction_date", { ascending: false })
    .limit(50);

  if (error) {
    return <p className="mt-4 text-sm text-red-400">데이터를 불러오지 못했습니다.</p>;
  }

  const trades = (data ?? []) as InsiderRow[];

  if (trades.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-[#a6a6a6]">수집된 내부자 거래 데이터가 없습니다.</p>
        <p className="text-xs text-[#a6a6a6]">어드민에서 내부자 거래 수집을 실행해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111]">
        {/* 헤더 */}
        <div className={cn("grid bg-[#0f0f0f] px-5 py-3 text-xs text-[#a6a6a6]", COLS)}>
          <span>종목</span>
          <span>내부자</span>
          <span>직책</span>
          <span>유형</span>
          <span className="text-right">수량</span>
          <span className="text-right">금액</span>
          <span className="text-right">날짜</span>
        </div>

        {/* 데이터 행 */}
        {trades.map((tx, i) => {
          const company = tx.tickers?.name_kr ?? tx.tickers?.name_en ?? tx.ticker;
          const isBuy = tx.transaction_type === "buy";
          const dateStr = tx.transaction_date
            ? tx.transaction_date.slice(2).replace(/-/g, ".")  // "24.06.15"
            : "—";

          return (
            <div
              key={i}
              className={cn(
                "grid items-center border-t border-white/[0.06] px-5 py-4",
                COLS
              )}
            >
              {/* 종목 */}
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs text-[#cccccc]">
                  {tx.ticker}
                </span>
                <span className="truncate text-sm text-[#a6a6a6]">{company}</span>
              </div>

              {/* 내부자 */}
              <span className="truncate text-sm text-white">{tx.name ?? "—"}</span>

              {/* 직책 */}
              <span className="truncate text-xs text-[#a6a6a6]">{tx.title ?? "—"}</span>

              {/* 유형: 매수(초록) / 매도(빨강) */}
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
                  isBuy
                    ? "border-green-500/20 bg-green-500/10 text-green-400"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
                )}
              >
                {isBuy ? "매수" : "매도"}
              </span>

              {/* 수량 */}
              <span className="text-right text-sm tabular-nums text-[#cccccc]">
                {fmtShares(tx.shares)}
              </span>

              {/* 금액 */}
              <span className="text-right text-sm font-medium tabular-nums text-white">
                {fmtValue(tx.value)}
              </span>

              {/* 날짜 */}
              <span className="text-right text-xs tabular-nums text-[#a6a6a6]">
                {dateStr}
              </span>
            </div>
          );
        })}

        {/* 각주: 초보자 용어 설명 (CLAUDE.md 15항) */}
        <div className="border-t border-white/[0.06] px-5 py-3 text-xs text-[#a6a6a6]">
          <span className="font-medium text-[#cccccc]">내부자</span>란 임원·이사·10% 이상
          대주주를 말합니다. ·{" "}
          <span className="font-medium text-green-400">매수</span>는 자사 주식 구입,{" "}
          <span className="font-medium text-red-400">매도</span>는 보유 주식 처분입니다. ·
          출처: SEC Form 4 공시.
        </div>
      </div>
    </div>
  );
}

export default function InsiderPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="내부자 거래" badge />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        내부자(인사이더)란 임원, 이사, 10% 이상 대주주를 말합니다. SEC Form 4
        공시를 기반으로 자사 주식 매수·매도 현황을 확인할 수 있습니다.
      </p>

      <div className="mt-6 flex-1">
        <ProGate
          iconName="user"
          title="인사이더는 Pro 전용 기능입니다"
          description="CEO·임원진이 자사 주식을 사고팔았는지 빠르게 확인하세요.&#10;SEC Form 4 공시를 기반으로 주요 내부자 거래와 변화 흐름을 모니터링할 수 있습니다."
        >
          <Suspense fallback={<InsiderSkeleton />}>
            <InsiderTradeList />
          </Suspense>
        </ProGate>
      </div>

      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
