"use client";

import Link from "next/link";
import { IconTrash, IconLock, IconLoader2 } from "@tabler/icons-react";

export interface WatchlistStock {
  ticker: string;
  company: string;
  newFilings: number;
  earningsDday: string;
  newNews: number;
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
  const { ticker, company, newFilings, earningsDday, newNews } = stock;

  return (
    <article className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      {/* Row 1: 티커 + 회사명 + 삭제 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs text-[#cccccc]">
            {ticker}
          </span>
          <span className="text-sm font-medium text-white">{company}</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-[#a6a6a6] transition-colors hover:text-white disabled:opacity-50"
          aria-label="종목 삭제"
        >
          {isDeleting ? (
            <IconLoader2 size={16} stroke={1.5} className="animate-spin" />
          ) : (
            <IconTrash size={16} stroke={1.5} />
          )}
        </button>
      </div>

      {/* Row 2: 공시 / 실적 / 뉴스 */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { value: newFilings === 0 ? "없음" : `${newFilings}건`, label: "새 공시" },
          { value: earningsDday, label: "실적" },
          { value: newNews === 0 ? "없음" : `${newNews}건`, label: "새 뉴스" },
        ].map((item) => (
          <div key={item.label} className="rounded-[4px] bg-[#1a1a1a] px-3 py-2.5">
            <p className="text-sm font-semibold text-white">{item.value}</p>
            <p className="mt-0.5 text-xs text-[#a6a6a6]">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Row 3: 링크 */}
      <div className="mt-3 flex items-center gap-4 border-t border-white/[0.06] pt-3">
        <Link href="/dashboard" className="text-xs text-[#a6a6a6] transition-colors hover:text-white">
          공시 보기
        </Link>
        <Link href="/news" className="text-xs text-[#a6a6a6] transition-colors hover:text-white">
          뉴스 보기
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <IconLock size={14} stroke={1.5} className="text-[#a6a6a6]" />
          <Link href="/billing" className="text-xs text-[#a6a6a6] transition-colors hover:text-white">
            변화 분석 보기
          </Link>
        </div>
      </div>
    </article>
  );
}
