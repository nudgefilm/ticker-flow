"use client";

import { useEffect, useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export type TrendingItem = {
  ticker: string;
  company: string;
  sentences: string[];  // max 2
};

const CARD_STEP = 188; // w-44(176px) + gap-3(12px)

export default function TrendingCarousel({ items }: { items: TrendingItem[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);

  // ── 자동 슬라이드 ────────────────────────────────────────────────────────────

  function startAutoScroll() {
    stopAutoScroll();
    if (items.length <= 1) return;
    intervalRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el || isPausedRef.current) return;
      const atEnd = el.scrollLeft + el.offsetWidth >= el.scrollWidth - 4;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: CARD_STEP, behavior: "smooth" });
      }
    }, 3000);
  }

  function stopAutoScroll() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    startAutoScroll();
    const wrapper = wrapperRef.current;
    const onEnter = () => { isPausedRef.current = true; };
    const onLeave = () => { isPausedRef.current = false; };
    wrapper?.addEventListener("mouseenter", onEnter);
    wrapper?.addEventListener("mouseleave", onLeave);
    return () => {
      stopAutoScroll();
      wrapper?.removeEventListener("mouseenter", onEnter);
      wrapper?.removeEventListener("mouseleave", onLeave);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // ── 수동 화살표 ──────────────────────────────────────────────────────────────

  function scroll(dir: "prev" | "next") {
    const el = scrollRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;
    el.scrollBy({
      left: (dir === "next" ? 1 : -1) * wrapper.getBoundingClientRect().width,
      behavior: "smooth",
    });
    startAutoScroll(); // 클릭 시 타이머 리셋
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapperRef} className="w-full">
      {/* 헤더 */}
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

      {/* 카드 스크롤 영역 */}
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
            <ul className="mt-3 space-y-1">
              {item.sentences.map((s, i) => (
                <li key={i} className="text-xs leading-snug text-[#a6a6a6]">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
