"use client";

import { useState } from "react";

const TABS = ["공시 인사이트", "어닝콜 요약", "종목 스냅샷"] as const;

function InsightMockup() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-[4px] bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">NVDA</span>
        <span className="text-sm font-medium text-foreground">엔비디아</span>
        <span className="ml-auto rounded-[4px] bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">8-K 주요이벤트</span>
      </div>
      <div className="rounded-[8px] border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">핵심 변화 요약</p>
        <p className="text-sm leading-relaxed text-foreground">
          엔비디아가 새로운 데이터센터 제품 라인 출시를 공시했습니다. 차세대 GPU 아키텍처를 기반으로 하며, 클라우드 서비스 기업들을 주요 고객으로 지정했습니다.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["CEO 발언", "가이던스", "관련 계약"].map((label) => (
          <div key={label} className="rounded-[6px] bg-muted/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <div className="mt-2 h-2 w-full rounded-full bg-border" />
            <div className="mt-1.5 h-2 w-3/4 mx-auto rounded-full bg-border" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">관련 공시 히스토리</p>
        {["8-K · 3일 전", "10-Q · 2주 전", "8-K · 1개월 전"].map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-[6px] border border-border px-4 py-2.5">
            <div className="h-2 w-2 rounded-full bg-blue-400/60" />
            <span className="text-xs text-muted-foreground">{item}</span>
            <div className="ml-auto h-2 w-32 rounded-full bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CallsMockup() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">AAPL</span>
            <span className="text-sm font-medium text-foreground">애플</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">FY2026 Q2 · 2026.05.02</p>
        </div>
        <span className="rounded-[4px] border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-400">가이던스 상향</span>
      </div>
      <div className="rounded-[8px] border border-orange-500/20 bg-orange-500/5 p-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">이번 어닝콜 핵심 요약</p>
        <p className="text-sm leading-relaxed text-foreground">
          서비스 매출이 전년 동기 대비 14% 성장하며 역대 최고치를 기록했습니다. CEO는 인도 시장의 고성장을 강조했으며, 다음 분기 가이던스를 상향 조정했습니다.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Revenue", value: "$95.4B" },
          { label: "EPS", value: "$1.65" },
          { label: "Surprise", value: "+3.2%" },
        ].map((m) => (
          <div key={m.label} className="rounded-[6px] bg-muted/40 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
            <p className="mt-1.5 text-base font-semibold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Q&A 핵심 문답</p>
        {[
          { q: "인도 시장 전략은?", a: "현지 생산 확대 및 파트너십을 강화하겠습니다." },
          { q: "서비스 부문 성장 지속 가능성은?", a: "구독 기반 모델로 안정적 성장을 예상합니다." },
        ].map((qa, i) => (
          <div key={i} className="rounded-[6px] border border-border p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Q. {qa.q}</p>
            <p className="mt-1.5 text-xs text-foreground">A. {qa.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SnapshotMockup() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-[4px] bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">MSFT</span>
        <span className="text-sm font-medium text-foreground">마이크로소프트</span>
        <span className="ml-auto text-lg font-semibold text-foreground">$415.32</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "시가총액", value: "$3.08T" },
          { label: "P/E", value: "34.2x" },
          { label: "52주 고", value: "$441" },
          { label: "배당수익률", value: "0.72%" },
        ].map((m) => (
          <div key={m.label} className="rounded-[6px] bg-muted/40 p-3">
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">최근 주요 공시</p>
        <div className="space-y-2">
          {[
            { type: "8-K", label: "분기 실적 발표", time: "3일 전" },
            { type: "Form 4", label: "임원 매도 공시", time: "1주 전" },
            { type: "10-Q", label: "분기보고서 제출", time: "3주 전" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-[6px] border border-border px-4 py-2.5">
              <span className="rounded-[3px] bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                {item.type}
              </span>
              <span className="text-xs text-foreground">{item.label}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MOCKUPS = [InsightMockup, CallsMockup, SnapshotMockup];

export default function ScreenTabs() {
  const [active, setActive] = useState(0);
  const MockupComponent = MOCKUPS[active];

  return (
    <div>
      {/* 탭 */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              active === i
                ? "bg-foreground text-background shadow-sm"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* 브라우저 바 */}
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <div className="h-2.5 w-2.5 rounded-full bg-muted" />
          <div className="h-2.5 w-2.5 rounded-full bg-muted" />
          <div className="h-2.5 w-2.5 rounded-full bg-muted" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">tickerflow.net</span>
        </div>
        {MockupComponent && <MockupComponent />}
      </div>
    </div>
  );
}
