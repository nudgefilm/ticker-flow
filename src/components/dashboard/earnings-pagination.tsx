"use client";

import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { markFeedScroll } from "./feed-scroll-anchor";

type PageEntry = number | "ellipsis";

function buildPages(current: number, total: number): PageEntry[] {
  const pages: PageEntry[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("ellipsis");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("ellipsis");
    pages.push(total);
  }
  return pages;
}

export function EarningsPagination({
  currentPage,
  totalPages,
  prefix,
}: {
  currentPage: number;
  totalPages: number;
  prefix: string;
}) {
  const pages = buildPages(currentPage, totalPages);
  const btn =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded-[4px] px-2 text-sm transition-colors";

  return (
    <div className="mt-6 flex items-center justify-center gap-1">
      <Link
        href={`${prefix}page=${currentPage - 1}`}
        scroll={false}
        aria-disabled={currentPage === 1}
        onClick={markFeedScroll}
        className={`${btn} border border-white/[0.08] text-[#a6a6a6] ${
          currentPage === 1
            ? "pointer-events-none opacity-30"
            : "hover:bg-[#1a1a1a] hover:text-white"
        }`}
      >
        <IconChevronLeft size={14} stroke={1.5} />
      </Link>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className={`${btn} text-[#a6a6a6]`}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={`${prefix}page=${p}`}
            scroll={false}
            onClick={markFeedScroll}
            className={`${btn} border ${
              p === currentPage
                ? "border-white/20 bg-[#1a1a1a] text-white"
                : "border-white/[0.08] text-[#a6a6a6] hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={`${prefix}page=${currentPage + 1}`}
        scroll={false}
        aria-disabled={currentPage === totalPages}
        onClick={markFeedScroll}
        className={`${btn} border border-white/[0.08] text-[#a6a6a6] ${
          currentPage === totalPages
            ? "pointer-events-none opacity-30"
            : "hover:bg-[#1a1a1a] hover:text-white"
        }`}
      >
        <IconChevronRight size={14} stroke={1.5} />
      </Link>
    </div>
  );
}
