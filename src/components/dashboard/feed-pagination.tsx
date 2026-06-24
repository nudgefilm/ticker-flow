"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Page = number | "…";

function buildPages(last: number): Page[] {
  if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1);
  return [1, 2, 3, "…", last];
}

export default function FeedPagination({ lastPage = 12 }: { lastPage?: number }) {
  const [current, setCurrent] = useState(1);
  const pages = buildPages(lastPage);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => setCurrent((p) => Math.max(1, p - 1))}
        disabled={current === 1}
        className="rounded-[6px] px-3 py-1.5 text-sm text-[#a6a6a6] transition-colors hover:bg-[#1a1a1a] hover:text-[#cccccc] disabled:pointer-events-none disabled:opacity-30"
      >
        이전
      </button>

      {pages.map((page, i) =>
        page === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-[#a6a6a6]">
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
                : "text-[#a6a6a6] hover:bg-[#1a1a1a] hover:text-[#cccccc]"
            )}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => setCurrent((p) => Math.min(lastPage, p + 1))}
        disabled={current === lastPage}
        className="rounded-[6px] px-3 py-1.5 text-sm text-[#a6a6a6] transition-colors hover:bg-[#1a1a1a] hover:text-[#cccccc] disabled:pointer-events-none disabled:opacity-30"
      >
        다음
      </button>
    </div>
  );
}
