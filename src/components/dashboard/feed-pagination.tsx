import Link from "next/link";
import { cn } from "@/lib/utils";

type PageEntry = number | "…";

function buildPages(current: number, last: number): PageEntry[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const pages: PageEntry[] = [1];

  if (current > 3) pages.push("…");

  const lo = Math.max(2, current - 1);
  const hi = Math.min(last - 1, current + 1);
  for (let p = lo; p <= hi; p++) pages.push(p);

  if (current < last - 2) pages.push("…");

  pages.push(last);
  return pages;
}

function pageHref(p: number, type?: string) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  params.set("page", String(p));
  return `?${params.toString()}`;
}

export default function FeedPagination({
  page = 1,
  lastPage = 1,
  type,
}: {
  page?: number;
  lastPage?: number;
  type?: string;
}) {
  if (lastPage <= 1) return null;

  const pages = buildPages(page, lastPage);

  return (
    <div className="flex items-center justify-center gap-1">
      <Link
        href={pageHref(Math.max(1, page - 1), type)}
        aria-disabled={page === 1}
        className={cn(
          "rounded-[6px] px-3 py-1.5 text-sm text-[#a6a6a6] transition-colors hover:bg-[#1a1a1a] hover:text-[#cccccc]",
          page === 1 && "pointer-events-none opacity-30"
        )}
      >
        이전
      </Link>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e-${i}`} className="px-2 text-sm text-[#a6a6a6]">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(p, type)}
            className={cn(
              "min-w-8 rounded-[6px] px-2 py-1.5 text-center text-sm transition-colors",
              p === page
                ? "bg-[#1a1a1a] text-white"
                : "text-[#a6a6a6] hover:bg-[#1a1a1a] hover:text-[#cccccc]"
            )}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={pageHref(Math.min(lastPage, page + 1), type)}
        aria-disabled={page === lastPage}
        className={cn(
          "rounded-[6px] px-3 py-1.5 text-sm text-[#a6a6a6] transition-colors hover:bg-[#1a1a1a] hover:text-[#cccccc]",
          page === lastPage && "pointer-events-none opacity-30"
        )}
      >
        다음
      </Link>
    </div>
  );
}
