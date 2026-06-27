"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    key: "filing",
    label: "공시 인사이트",
    caption: "최근 공시와 기업 변화를 한국어 요약으로 정리합니다.",
    rows: [
      { badge: "8-K", badgeClass: "bg-blue-500/20 text-blue-400", ticker: "NVDA", text: "데이터센터 부문 신규 공급 계약 관련 주요 사항" },
      { badge: "10-Q", badgeClass: "bg-green-500/20 text-green-400", ticker: "MSFT", text: "분기 보고서 제출 · 클라우드 부문 매출 공개" },
      { badge: "Form 4", badgeClass: "bg-amber-500/20 text-amber-400", ticker: "TSLA", text: "등기임원 보통주 거래 내역 접수" },
    ],
  },
  {
    key: "earnings",
    label: "어닝콜 요약",
    caption: "1시간 넘는 컨퍼런스콜을 핵심 내용만 한국어로 정리합니다.",
    rows: [
      { badge: "요약", badgeClass: "bg-blue-500/20 text-blue-400", ticker: "AAPL", text: "서비스 부문 매출 비중 확대 언급" },
      { badge: "가이던스", badgeClass: "bg-green-500/20 text-green-400", ticker: "AAPL", text: "다음 분기 매출 가이던스 제시" },
      { badge: "Q&A", badgeClass: "bg-purple-500/20 text-purple-400", ticker: "AAPL", text: "주요 질의응답 핵심만 정리" },
    ],
  },
  {
    key: "snapshot",
    label: "종목 스냅샷",
    caption: "기업의 주요 정보를 한 페이지에서 확인합니다.",
    rows: [
      { badge: "시총", badgeClass: "bg-white/10 text-foreground/70", ticker: "NVDA", text: "기업 기본 정보 및 주요 지표" },
      { badge: "공시", badgeClass: "bg-blue-500/20 text-blue-400", ticker: "NVDA", text: "최근 공시 3건 모아보기" },
      { badge: "실적", badgeClass: "bg-green-500/20 text-green-400", ticker: "NVDA", text: "다음 실적 발표 일정 D-18" },
    ],
  },
];

export default function ProductTabs() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">화면 미리보기</h2>
      </div>

      {/* 탭 */}
      <div className="mx-auto mb-6 flex max-w-md items-center justify-center gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "flex-1 rounded-[6px] px-3 py-2 text-sm font-medium transition-colors",
              active === i
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 화면 목업 */}
      <div className="overflow-hidden rounded-xl border border-border bg-[#0f0f0f]">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-white/10" />
          <div className="h-3 w-3 rounded-full bg-white/10" />
          <div className="h-3 w-3 rounded-full bg-white/10" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">tickerflow.net</span>
        </div>
        <div key={tab.key} className="animate-fade-in space-y-3 p-5 md:p-8">
          <p className="text-sm text-muted-foreground">{tab.caption}</p>
          <div className="space-y-2">
            {tab.rows.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${row.badgeClass}`}>
                  {row.badge}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{row.ticker}</span>
                <span className="text-sm text-foreground">{row.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
