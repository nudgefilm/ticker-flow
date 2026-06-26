"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";

interface Option {
  ticker: string;
  name: string;
}

interface StockComboboxProps {
  value: string;
  options: Option[];
}

export default function StockCombobox({ value, options }: StockComboboxProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    query.trim()
      ? options.filter(
          (o) =>
            o.ticker.toUpperCase().includes(query.toUpperCase()) ||
            o.name.toLowerCase().includes(query.toLowerCase())
        )
      : options;

  const current = options.find((o) => o.ticker === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  function select(ticker: string) {
    setOpen(false);
    setQuery("");
    router.push(`?symbol=${ticker}`);
  }

  return (
    <div className="relative w-full max-w-xs" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-2 text-sm transition-colors hover:bg-[#1a1a1a]"
      >
        <span className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-medium text-[#cccccc]">
          {value}
        </span>
        {current && (
          <span className="flex-1 truncate text-left text-[#a6a6a6]">{current.name}</span>
        )}
        <IconChevronDown size={14} stroke={1.5} className="ml-auto shrink-0 text-[#a6a6a6]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[260px] overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#0f0f0f] shadow-xl">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
            <IconSearch size={14} stroke={1.5} className="shrink-0 text-[#a6a6a6]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="종목명 또는 티커 검색"
              className="flex-1 bg-transparent text-sm text-white placeholder-[#666666] outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#a6a6a6]">결과 없음</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.ticker}
                  type="button"
                  onClick={() => select(o.ticker)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.04] ${
                    o.ticker === value ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <span className="w-14 shrink-0 text-center rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs text-[#cccccc]">
                    {o.ticker}
                  </span>
                  <span className="truncate text-[#cccccc]">{o.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
