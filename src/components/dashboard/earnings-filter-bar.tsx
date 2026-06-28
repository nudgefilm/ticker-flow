"use client";

import { IconChevronDown } from "@tabler/icons-react";

const WEEK_DAYS = [
  { day: "월", count: 1, tickers: ["NVDA"] },
  { day: "화", count: 1, tickers: ["AAPL"] },
  { day: "수", count: 2, tickers: ["MSFT", "META"] },
  { day: "목", count: 2, tickers: ["AMZN", "GOOGL"] },
  { day: "금", count: 1, tickers: ["TSLA"] },
];

export default function EarningsFilterBar() {
  return (
    <div className="flex flex-col gap-4">
      {/* 상단 행: 뷰 탭 + 드롭다운 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-1">
          <button
            type="button"
            className="rounded-[4px] bg-[#262626] px-3 py-1.5 text-sm text-white"
          >
            캘린더 뷰
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#262626]"
          >
            모든 종목
            <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#262626]"
          >
            이번 주
            <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
          </button>
        </div>
      </div>

      {/* 주간 캘린더 바 */}
      <div className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-4">
        <div className="grid grid-cols-5 gap-2">
          {WEEK_DAYS.map((d) => (
            <div
              key={d.day}
              className="flex flex-col items-center gap-1 rounded-[4px] border border-white/[0.08] bg-blue-500/[0.15] px-2 py-3 text-center"
            >
              <span className="text-xs text-[#a6a6a6]">{d.day}</span>
              <span className="text-lg font-semibold text-white">{d.count}건</span>
              <div className="flex flex-wrap justify-center gap-1">
                {d.tickers.map((t) => (
                  <span
                    key={t}
                    className="rounded-[4px] bg-[#262626] px-1.5 py-0.5 text-[10px] text-[#cccccc]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
