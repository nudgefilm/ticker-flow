"use client";

import { useEffect, useRef, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

// 콘텐츠가 maxHeight를 넘으면 스크롤바 없이 내부 스크롤 처리하고,
// 아래에 더 볼 내용이 있을 때만 하단 화살표 힌트를 표시한다.
// 마우스 휠/터치 스와이프로 스크롤하면 힌트가 자동으로 사라진다.
export function ScrollHintList({
  children,
  maxHeight = 320,
  fadeColor = "#1a1a1a",
}: {
  children: React.ReactNode;
  maxHeight?: number;
  fadeColor?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;

    function checkOverflow() {
      if (!scrollEl) return;
      setShowHint(scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight > 4);
    }

    checkOverflow();
    scrollEl.addEventListener("scroll", checkOverflow, { passive: true });
    // 콘텐츠 높이가 나중에 바뀌는 경우(비동기 데이터 갱신 등)에도 재계산
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(contentEl);

    return () => {
      scrollEl.removeEventListener("scroll", checkOverflow);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      <div ref={scrollRef} className="no-scrollbar overflow-y-auto" style={{ maxHeight }}>
        <div ref={contentRef}>{children}</div>
      </div>
      {showHint && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-1 pt-6"
          style={{ background: `linear-gradient(to top, ${fadeColor}, ${fadeColor}99, transparent)` }}
        >
          <IconChevronDown size={14} stroke={2} className="text-[#888888]" />
        </div>
      )}
    </div>
  );
}
