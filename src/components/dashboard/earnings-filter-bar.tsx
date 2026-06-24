"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type View = "캘린더 뷰" | "리스트 뷰";

const WEEK_DAYS = [
  { day: "월", count: 1, tickers: ["NVDA"] },
  { day: "화", count: 1, tickers: ["AAPL"] },
  { day: "수", count: 2, tickers: ["MSFT", "META"] },
  { day: "목", count: 2, tickers: ["AMZN", "GOOGL"] },
  { day: "금", count: 1, tickers: ["TSLA"] },
];

export default function EarningsFilterBar() {
  const [view, setView] = useState<View>("캘린더 뷰");

  return (
    <div className="flex flex-col gap-4">
      {/* 상단 행: 뷰 토글 + 드롭다운 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center rounded-[6px] border border-white/[0.08] bg-[#111111] p-1">
          {(["캘린더 뷰", "리스트 뷰"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-[4px] px-3 py-1.5 text-sm transition-colors",
                view === v ? "bg-[#1a1a1a] text-white" : "text-[#a6a6a6] hover:text-[#cccccc]"
              )}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
          >
            모든 종목
            <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
          >
            이번 주
            <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
          </button>
        </div>
      </div>

      {/* 주간 캘린더 바 */}
      {view === "캘린더 뷰" && (
        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-4">
          <div className="grid grid-cols-5 gap-2">
            {WEEK_DAYS.map((d) => (
              <div
                key={d.day}
                className="flex flex-col items-center gap-1 rounded-[4px] bg-[#0a0a0a] px-2 py-3 text-center"
              >
                <span className="text-xs text-[#a6a6a6]">{d.day}</span>
                <span className="text-lg font-semibold text-white">{d.count}건</span>
                <div className="flex flex-wrap justify-center gap-1">
                  {d.tickers.map((t) => (
                    <span
                      key={t}
                      className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-[10px] text-[#cccccc]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
