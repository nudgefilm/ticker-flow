"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Search } from "lucide-react";

interface Option {
  ticker: string;
  name: string;
}

interface Props {
  value: string;
  options: Option[];
}

export default function StockCombobox({ value, options }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((s) => s.ticker === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (s) =>
        s.ticker.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [query, options]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(ticker: string) {
    router.push("?symbol=" + ticker);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-full sm:w-64">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/[0.16] focus:border-[#60a5fa]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-medium text-white">
            {selected?.ticker ?? value}
          </span>
          <span className="truncate text-[#a6a6a6]">
            {selected?.name ?? "종목 선택"}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[#a6a6a6]" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-md border border-white/[0.08] bg-[#161616] shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-3 py-2">
            <Search className="h-4 w-4 text-[#a6a6a6]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="티커 또는 회사명 검색"
              className="w-full bg-transparent text-sm text-white placeholder:text-[#6b7280] outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {results.map((s) => (
              <li key={s.ticker} role="option" aria-selected={s.ticker === value}>
                <button
                  type="button"
                  onClick={() => handleSelect(s.ticker)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-medium text-white">
                      {s.ticker}
                    </span>
                    <span className="truncate text-[#a6a6a6]">{s.name}</span>
                  </span>
                  {s.ticker === value && (
                    <Check className="h-4 w-4 shrink-0 text-[#60a5fa]" />
                  )}
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[#a6a6a6]">
                검색 결과가 없습니다.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
