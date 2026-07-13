"use client";

// 히어로 우측 레일의 "TICKERFLOW · LIVE" 시장 상태 위젯. 대시보드 우하단
// 고정 위젯(src/components/dashboard/market-clock.tsx)과 동일한 계산
// 로직을 src/lib/market-clock.ts에서 공유해서 쓴다 — 더미 값이 아니라
// 실제 KR(KOSPI)·US(S&P 500) 개장 상태/현재 시각을 그대로 보여준다.
// 원본 디자인의 헤더 우측 꺽쇠 아이콘만 제외했다 — "카피 카드"와
// GATHER/SCATTER 모드 버튼은 이 컴포넌트가 아니라 부모
// (src/components/hero/particle-section.tsx)에서 원본 레일 레이아웃
// 그대로 복원한다. 이 위젯은 레일 안에서 `flex-1`로 남는 높이를 채운다.
//
// 1초마다 실제로 갱신되므로(대시보드 위젯과 동일한 setInterval 패턴)
// 클라이언트 컴포넌트여야 한다 — "데이터 동기화 · 1s" 문구가 실제와
// 일치한다.

import { useEffect, useMemo, useState } from "react";
import { MARKETS, WEEKDAY_KO, computeState, statusMeta, type MarketState } from "@/lib/market-clock";

const LIGHT = "rgba(245,245,247,";

export function LiveMarketWidget() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const states = useMemo(() => (now ? MARKETS.map((m) => computeState(m, now)) : null), [now]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border" style={{ borderColor: `${LIGHT}0.15)` }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: `${LIGHT}0.1)` }}>
        <span className="flex items-center gap-2 font-widget-mono text-xs font-semibold uppercase tracking-widest sm:text-sm">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b9eff] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3b9eff]" />
          </span>
          TICKERFLOW · LIVE
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-evenly">
        {states
          ? states.map((s, i) => <MarketRow key={s.def.id} state={s} bordered={i > 0} />)
          : MARKETS.map((m, i) => <MarketRowSkeleton key={m.id} label={m.label} bordered={i > 0} />)}
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 font-widget-mono text-[11px] uppercase tracking-widest" style={{ borderColor: `${LIGHT}0.1)` }}>
        <span style={{ color: `${LIGHT}0.4)` }}>데이터 동기화 · 1s</span>
        <span className="text-[#3b9eff]">{"> LIVE UPDATE"}</span>
      </div>
    </div>
  );
}

function MarketRow({ state, bordered }: { state: MarketState; bordered: boolean }) {
  const meta = statusMeta(state.status);
  const badgeCls =
    meta.tone === "up" ? "bg-emerald-500/15 text-emerald-400"
    : meta.tone === "warn" ? "bg-[#eb601e]/15 text-[#eb601e]"
    : "bg-red-500/15 text-red-400";

  return (
    <div
      className="flex items-center justify-between px-4 py-4"
      style={bordered ? { borderTopWidth: 1, borderTopColor: `${LIGHT}0.1)` } : undefined}
    >
      <div className="min-w-0">
        <p className="truncate font-widget-mono text-sm font-semibold sm:text-base">{state.def.label}</p>
        <p className="mt-1 truncate text-xs sm:text-sm" style={{ color: `${LIGHT}0.5)` }}>
          {state.def.city} · {WEEKDAY_KO[state.weekday] ?? state.weekday}요일
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 pl-2">
        <span className="font-widget-mono text-lg font-bold tabular-nums sm:text-xl">
          {state.hh}:{state.mm}
          <span className="ml-0.5 align-top text-[10px] sm:text-xs" style={{ color: `${LIGHT}0.5)` }}>
            {state.ss}
          </span>
        </span>
        <span className={`rounded px-1.5 py-0.5 font-widget-mono text-[10px] font-semibold ${badgeCls}`}>
          {meta.text}
        </span>
      </div>
    </div>
  );
}

function MarketRowSkeleton({ label, bordered }: { label: string; bordered: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-4"
      style={bordered ? { borderTopWidth: 1, borderTopColor: `${LIGHT}0.1)` } : undefined}
    >
      <span className="font-widget-mono text-sm" style={{ color: `${LIGHT}0.5)` }}>{label}</span>
      <span className="font-widget-mono text-lg tabular-nums" style={{ color: `${LIGHT}0.5)` }}>
        --:--
      </span>
    </div>
  );
}
