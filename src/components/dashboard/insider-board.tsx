"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
  IconArrowUpRight,
} from "@tabler/icons-react";

export type InsiderTrade = {
  id: string;
  ticker: string;
  name_kr: string | null;
  name: string | null;
  title: string | null;
  transaction_type: string; // "buy" | "sell"
  shares: number | null;
  price: number | null;
  transaction_value: number | null;
  transaction_date: string | null;
  in_watchlist: boolean;
};

type FilterType = "all" | "buy" | "sell";
type FilterPeriod = "7" | "30" | "90";
type FilterAmount = "all" | "100k" | "1m";
type SortBy = "date" | "amount";

const PAGE_SIZE = 20;

// ─── 포맷 헬퍼 ─────────────────────────────────────────────────────────────────

function fmtShares(shares: number | null): string {
  if (shares == null) return "—";
  if (shares >= 1_000_000) return `${(shares / 1_000_000).toFixed(1)}M주`;
  if (shares >= 10_000)
    return `${Math.round(shares / 10_000).toLocaleString("ko-KR")}만주`;
  if (shares >= 1_000)
    return `${Math.round(shares / 1_000).toLocaleString("ko-KR")}천주`;
  return `${shares.toLocaleString("ko-KR")}주`;
}

function fmtValue(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / 86_400_000
  );
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}

// ─── 필터 함수 ─────────────────────────────────────────────────────────────────

function applyFilters(
  trades: InsiderTrade[],
  type: FilterType,
  period: FilterPeriod,
  watchlistOnly: boolean,
  minAmount: FilterAmount
): InsiderTrade[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(period));

  return trades.filter((t) => {
    if (type !== "all" && t.transaction_type !== type) return false;
    if (watchlistOnly && !t.in_watchlist) return false;
    if (t.transaction_date && new Date(t.transaction_date) < cutoff) return false;
    if (
      minAmount === "100k" &&
      (t.transaction_value == null || t.transaction_value < 100_000)
    )
      return false;
    if (
      minAmount === "1m" &&
      (t.transaction_value == null || t.transaction_value < 1_000_000)
    )
      return false;
    return true;
  });
}

// ─── 세그먼트 버튼 ─────────────────────────────────────────────────────────────

function SegmentButtons({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-[#0f0f0f] p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-[#3b82f6] text-white"
              : "text-[#a6a6a6] hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── 토글 스위치 ───────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs text-[#a6a6a6] hover:text-white transition-colors"
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-[#3b82f6]" : "bg-white/[0.08]"
        }`}
      >
        <span
          className={`absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-1"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

// ─── InsiderBoard ──────────────────────────────────────────────────────────────

export default function InsiderBoard({
  trades,
}: {
  trades: InsiderTrade[];
  isPro: boolean;
}) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("30");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [filterAmount, setFilterAmount] = useState<FilterAmount>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => applyFilters(trades, filterType, filterPeriod, watchlistOnly, filterAmount),
    [trades, filterType, filterPeriod, watchlistOnly, filterAmount]
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sortBy === "amount") {
          return (b.transaction_value ?? 0) - (a.transaction_value ?? 0);
        }
        return (b.transaction_date ?? "").localeCompare(a.transaction_date ?? "");
      }),
    [filtered, sortBy]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur-sm py-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentButtons
            options={[
              { label: "전체", value: "all" },
              { label: "매수", value: "buy" },
              { label: "매도", value: "sell" },
            ]}
            value={filterType}
            onChange={(v) => { setFilterType(v as FilterType); setPage(1); }}
          />

          <SegmentButtons
            options={[
              { label: "7일", value: "7" },
              { label: "30일", value: "30" },
              { label: "90일", value: "90" },
            ]}
            value={filterPeriod}
            onChange={(v) => { setFilterPeriod(v as FilterPeriod); setPage(1); }}
          />

          <SegmentButtons
            options={[
              { label: "전체 금액", value: "all" },
              { label: "$100K+", value: "100k" },
              { label: "$1M+", value: "1m" },
            ]}
            value={filterAmount}
            onChange={(v) => { setFilterAmount(v as FilterAmount); setPage(1); }}
          />

          <ToggleSwitch
            checked={watchlistOnly}
            onChange={(v) => { setWatchlistOnly(v); setPage(1); }}
            label="내 종목만"
          />

          <div className="ml-auto">
            <SegmentButtons
              options={[
                { label: "최신순", value: "date" },
                { label: "금액순", value: "amount" },
              ]}
              value={sortBy}
              onChange={(v) => {
                setSortBy(v as SortBy);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* 건수 */}
      <p className="text-xs text-[#a6a6a6]">
        {sorted.length.toLocaleString("ko-KR")}건
      </p>

      {/* 카드 */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-sm text-[#a6a6a6]">
            조건에 해당하는 거래가 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {paginated.map((trade, idx) => {
            const isBuy = trade.transaction_type === "buy";
            const company = trade.name_kr ?? trade.ticker;

            return (
              <div
                key={trade.id}
                className={`rounded-xl border border-white/[0.08] p-4 ${
                  idx % 2 === 0 ? "bg-[#111820]" : "bg-[#111111]"
                }`}
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/stocks/${trade.ticker}`}
                      className="rounded-[4px] border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                    >
                      {trade.ticker}
                    </Link>
                    <span className="text-sm text-[#cccccc]">{company}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium ${
                      isBuy
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/20 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {isBuy ? "매수" : "매도"}
                  </span>
                </div>

                {/* 임원 정보 */}
                <div className="mt-3">
                  <p className="text-sm font-medium text-white">
                    {trade.name ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#a6a6a6]">
                    {trade.title ?? "—"}
                  </p>
                </div>

                {/* 거래 수치 */}
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[#0f0f0f] px-3 py-2.5">
                  <div>
                    <p className="text-[10px] text-[#a6a6a6]">거래 주수</p>
                    <p className="mt-0.5 text-sm font-medium tabular-nums text-white">
                      {fmtShares(trade.shares)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#a6a6a6]">단가</p>
                    <p className="mt-0.5 text-sm tabular-nums text-[#cccccc]">
                      {fmtPrice(trade.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#a6a6a6]">총 거래 금액</p>
                    <p
                      className={`mt-0.5 text-sm font-medium tabular-nums ${
                        isBuy ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {fmtValue(trade.transaction_value)}
                    </p>
                  </div>
                </div>

                {/* 푸터 */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-[#a6a6a6]">
                    {relativeDate(trade.transaction_date)}
                    {trade.transaction_date && (
                      <span className="ml-1.5">
                        ({trade.transaction_date.slice(0, 10)})
                      </span>
                    )}
                  </span>
                  <a
                    href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${trade.ticker}&type=4&dateb=&owner=include&count=10`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#a6a6a6] transition-colors hover:text-white"
                  >
                    SEC 원문
                    <IconArrowUpRight size={12} stroke={1.5} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-[#a6a6a6] transition-colors hover:text-white disabled:opacity-30"
          >
            <IconChevronLeft size={14} stroke={1.5} />
            이전
          </button>
          <span className="text-xs text-[#a6a6a6]">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-[#a6a6a6] transition-colors hover:text-white disabled:opacity-30"
          >
            다음
            <IconChevronRight size={14} stroke={1.5} />
          </button>
        </div>
      )}

      {/* 데이터 소스 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] px-4 py-3">
        <p className="text-xs text-[#a6a6a6]">
          <span className="font-medium text-[#cccccc]">데이터 소스: </span>
          FMP(Financial Modeling Prep) · SEC Form 4 공시 기반 · 내부자 (임원·이사·10% 이상 대주주) 직접 매수·매도 거래만 표시됩니다.
        </p>
      </div>
    </div>
  );
}
