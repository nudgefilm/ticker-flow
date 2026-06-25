"use client";

import { useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export type TrendingItem = {
  ticker: string;
  company: string;
  filings: number;
  news: number;
};

export default function TrendingCarousel({ items }: { items: TrendingItem[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "prev" | "next") {
    const el = scrollRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;
    // wrapperRef의 실제 렌더링 너비(visible width)만큼 이동
    const amount = wrapper.getBoundingClientRect().width;
    el.scrollBy({
      left: (dir === "next" ? 1 : -1) * amount,
      behavior: "smooth",
    });
  }

  return (
    <div ref={wrapperRef} className="w-full">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">기업 동향</h2>
          <p className="mt-0.5 text-xs text-[#a6a6a6]">
            최근 7일 공시·뉴스 활동이 많은 기업입니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => scroll("prev")}
            aria-label="이전"
            className="rounded-[4px] border border-white/[0.08] bg-[#1a1a1a] p-1.5 text-[#a6a6a6] transition-colors hover:text-white"
          >
            <IconChevronLeft size={14} stroke={1.5} />
          </button>
          <button
            type="button"
            onClick={() => scroll("next")}
            aria-label="다음"
            className="rounded-[4px] border border-white/[0.08] bg-[#1a1a1a] p-1.5 text-[#a6a6a6] transition-colors hover:text-white"
          >
            <IconChevronRight size={14} stroke={1.5} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 flex w-full gap-3 overflow-x-auto no-scrollbar"
      >
        {items.map((item) => (
          <div
            key={item.ticker}
            className="w-44 shrink-0 rounded-[6px] border border-white/[0.08] bg-[#111111] p-4"
          >
            <span className="inline-block rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-medium text-[#cccccc]">
              {item.ticker}
            </span>
            <p className="mt-2 truncate text-sm font-medium text-white">{item.company}</p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-[#a6a6a6]">
                공시 <span className="font-medium text-[#cccccc]">{item.filings}건</span>
              </p>
              <p className="text-xs text-[#a6a6a6]">
                뉴스 <span className="font-medium text-[#cccccc]">{item.news}건</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
