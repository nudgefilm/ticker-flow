"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PAGES = [1, 2, 3, "…", 12] as const;
type Page = (typeof PAGES)[number];

export default function FeedPagination() {
  const [current, setCurrent] = useState(1);

  return (
    <div className="flex items-center justify-center gap-1">
      {/* 이전 */}
      <button
        type="button"
        onClick={() => setCurrent((p) => Math.max(1, Number(p) - 1))}
        disabled={current === 1}
        className="rounded-[6px] px-3 py-1.5 text-sm text-[#666666] transition-colors hover:bg-[#1a1a1a] hover:text-[#cccccc] disabled:pointer-events-none disabled:opacity-30"
      >
        이전
      </button>

      {/* 페이지 번호 */}
      {PAGES.map((page, i) =>
        page === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-[#444444]">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => setCurrent(page)}
            className={cn(
              "min-w-8 rounded-[6px] px-2 py-1.5 text-sm transition-colors",
              current === page
                ? "bg-[#1a1a1a] text-white"
                : "text-[#666666] hover:bg-[#1a1a1a] hover:text-[#cccccc]"
            )}
          >
            {page}
          </button>
        )
      )}

      {/* 다음 */}
      <button
        type="button"
        onClick={() => setCurrent((p) => Math.min(12, Number(p) + 1))}
        disabled={current === 12}
        className="rounded-[6px] px-3 py-1.5 text-sm text-[#666666] transition-colors hover:bg-[#1a1a1a] hover:text-[#cccccc] disabled:pointer-events-none disabled:opacity-30"
      >
        다음
      </button>
    </div>
  );
}
