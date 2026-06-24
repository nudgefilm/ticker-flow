"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconPlus, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

type TickerResult = {
  ticker: string;
  name_kr: string | null;
  name_en: string | null;
};

export default function TickerSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TickerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [addingTicker, setAddingTicker] = useState<string | null>(null);
  const [addedTicker, setAddedTicker] = useState<string | null>(null);
  const [addError, setAddError] = useState<{ ticker: string; msg: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 검색어 변경 시 debounce 후 tickers 테이블 조회
  useEffect(() => {
    const q = query.trim().replace(/[%_,]/g, "");
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("tickers")
        .select("ticker, name_kr, name_en")
        .or(`ticker.ilike.${q}%,name_en.ilike.%${q}%,name_kr.ilike.%${q}%`)
        .order("ticker")
        .limit(10);
      setResults(data ?? []);
      setOpen(true);
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleAdd(ticker: string) {
    setAddingTicker(ticker);
    setAddError(null);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    setAddingTicker(null);
    if (res.ok) {
      setAddedTicker(ticker);
      router.refresh();
      setTimeout(() => setAddedTicker(null), 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setAddError({ ticker, msg: data.error ?? "추가 실패" });
      setTimeout(() => setAddError(null), 3000);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <IconSearch
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a6a6a6]"
        size={14}
        stroke={1.5}
      />
      {searching && (
        <IconLoader2
          className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[#a6a6a6]"
          size={12}
          stroke={1.5}
        />
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder="종목 검색... AAPL, NVDA"
        className="w-full rounded-[6px] border border-white/[0.08] bg-[#0a0a0a] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-[#a6a6a6] outline-none transition-colors focus:border-white/20"
      />

      {/* 검색 결과 드롭다운 */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111] shadow-xl">
          {results.map((r) => {
            const isAdding = addingTicker === r.ticker;
            const isAdded = addedTicker === r.ticker;
            const errorMsg = addError?.ticker === r.ticker ? addError.msg : null;
            return (
              <div
                key={r.ticker}
                className="flex items-center gap-2 px-3 py-2 hover:bg-[#1a1a1a]"
              >
                <span className="shrink-0 rounded-[3px] bg-[#0a0a0a] px-1.5 py-0.5 font-mono text-[10px] text-[#cccccc]">
                  {r.ticker}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-[#a6a6a6]">
                  {r.name_kr ?? r.name_en ?? ""}
                </span>
                {errorMsg ? (
                  <span className="shrink-0 text-[10px] text-red-400">{errorMsg}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => !isAdded && handleAdd(r.ticker)}
                    disabled={isAdding}
                    className="shrink-0 text-[#a6a6a6] transition-colors hover:text-white disabled:opacity-50"
                    aria-label={`${r.ticker} 와치리스트 추가`}
                  >
                    {isAdding ? (
                      <IconLoader2 size={14} stroke={1.5} className="animate-spin" />
                    ) : isAdded ? (
                      <IconCheck size={14} stroke={1.5} className="text-green-400" />
                    ) : (
                      <IconPlus size={14} stroke={1.5} />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
