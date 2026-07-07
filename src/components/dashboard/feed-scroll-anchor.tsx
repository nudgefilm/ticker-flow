"use client";

import { useRef, useEffect } from "react";

const KEY = "tf_feed_scroll";

/**
 * URL 기반 페이지네이션 이동 후 섹션 상단으로 스크롤하는 앵커 컴포넌트.
 *
 * `watch`(보통 현재 페이지 번호)를 넘기지 않으면, Next.js가 이 Suspense
 * 서브트리를 리마운트 없이(같은 컴포넌트 인스턴스로) 갱신하는 경우
 * `useEffect(fn, [])`가 최초 1회만 실행되어 두 번째 페이지 이동부터는
 * 스크롤이 동작하지 않는다. `watch` 값을 의존성에 넣어 페이지가 바뀔
 * 때마다 반드시 다시 검사하도록 한다.
 */
export function FeedScrollAnchor({ watch }: { watch?: string | number } = {}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flag = sessionStorage.getItem(KEY);
    if (flag) {
      sessionStorage.removeItem(KEY);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [watch]);

  return <div ref={ref} />;
}

/** 페이지네이션 링크 클릭 전 호출하여 스크롤 플래그 설정 */
export function markFeedScroll() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY, "1");
  }
}
