"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

function buildPages(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page <= 3) {
    for (let i = 2; i <= Math.min(4, total - 1); i++) out.push(i);
    out.push("…");
  } else if (page >= total - 2) {
    out.push("…");
    for (let i = Math.max(2, total - 3); i <= total - 1; i++) out.push(i);
  } else {
    out.push("…", page - 1, page, page + 1, "…");
  }
  out.push(total);
  return out;
}

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export function SectionPager({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);
  const btn = "flex h-7 w-7 items-center justify-center rounded text-xs transition-colors";

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className={`${btn} text-[#a6a6a6] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30`}
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className={`${btn} cursor-default text-[#a6a6a6]`}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`${btn} ${
              p === page
                ? "bg-[#1a1a1a] text-white"
                : "text-[#a6a6a6] hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className={`${btn} text-[#a6a6a6] hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30`}
        aria-label="다음 페이지"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
