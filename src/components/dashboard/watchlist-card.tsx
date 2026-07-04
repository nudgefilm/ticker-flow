"use client";

import Link from "next/link";
import { IconTrash, IconLoader2, IconChevronRight } from "@tabler/icons-react";
import { TickerBadges } from "@/components/dashboard/ticker-badge";
import type { TickerBadgeReason } from "@/lib/collect/target-tickers";

export interface WatchlistStock {
  ticker: string;
  company: string;
  newFilings: number;
  earningsDday: string;
  newNews: number;
  badges?: TickerBadgeReason[];
}

export default function WatchlistCard({
  stock,
  onDelete,
  isDeleting = false,
}: {
  stock: WatchlistStock;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  const { ticker, company, newFilings, earningsDday, newNews, badges } = stock;

  return (
    <article className="overflow-hidden rounded-[6px] border border-white/[0.15] bg-[#1a1a1a]">
      {/* 상단: 티커 + 회사명 + 삭제 */}
      <div className="flex items-center justify-between gap-3 bg-[#262626] px-4 py-3">
        <Link href={`/stocks/${ticker}`} className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-white">{ticker}</p>
            <TickerBadges reasons={badges} />
          </div>
          <p className="truncate text-xs text-[#60a5fa]">{company}</p>
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 text-[#a6a6a6] transition-colors hover:text-white disabled:opacity-50"
          aria-label="종목 삭제"
        >
          {isDeleting ? (
            <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
          ) : (
            <IconTrash size={16} stroke={1.5} />
          )}
        </button>
      </div>

      <div className="p-4">
        {/* 공시 / 실적 / 뉴스 */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: newFilings === 0 ? "없음" : `${newFilings}건`, label: "새 공시" },
            { value: earningsDday, label: "실적" },
            { value: newNews === 0 ? "없음" : `${newNews}건`, label: "새 뉴스" },
          ].map((item) => (
            <div key={item.label} className="rounded-[4px] bg-[#262626] px-3 py-2.5">
              <p className="text-sm font-semibold text-white">{item.value}</p>
              <p className="mt-0.5 text-xs text-[#a6a6a6]">{item.label}</p>
            </div>
          ))}
        </div>

        {/* 종목 스냅샷 링크 */}
        <Link
          href={`/stocks/${ticker}`}
          className="mt-3 flex items-center justify-between rounded-[4px] border border-white/[0.06] px-3 py-2 text-xs text-[#a6a6a6] transition-colors hover:border-white/[0.12] hover:text-white"
        >
          <span>종목 스냅샷</span>
          <IconChevronRight size={13} stroke={1.5} />
        </Link>
      </div>
    </article>
  );
}
