"use client";

import { useRef, useEffect } from "react";

const KEY = "tf_feed_scroll";

/** URL 기반 페이지네이션 이동 후 섹션 상단으로 스크롤하는 앵커 컴포넌트 */
export function FeedScrollAnchor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flag = sessionStorage.getItem(KEY);
    if (flag) {
      sessionStorage.removeItem(KEY);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return <div ref={ref} />;
}

/** 페이지네이션 링크 클릭 전 호출하여 스크롤 플래그 설정 */
export function markFeedScroll() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY, "1");
  }
}
