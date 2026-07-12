"use client";

import { useEffect, useState } from "react";
import { IconArrowUp } from "@tabler/icons-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="맨 위로"
      // 대시보드의 MarketClock 위젯이 떠 있는 동안은 위젯이 자체 스크롤 버튼을
      // 그리므로(화살표+위젯을 한 덩어리로 쌓기 위해), 이 전역 버튼은 숨긴다.
      style={{ bottom: "1.5rem", display: "var(--tf-scroll-display, block)" }}
      className="fixed right-6 z-50 h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
    >
      <IconArrowUp size={18} stroke={1.5} className="absolute inset-0 m-auto text-white" />
    </button>
  );
}
