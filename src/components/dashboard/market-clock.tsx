"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { MARKETS, WEEKDAY_KO, computeState, statusMeta, type MarketDef, type MarketState } from "@/lib/market-clock"

// 전역 scroll-to-top 버튼(scroll-to-top.tsx)은 이 위젯이 떠 있는 동안
// 스스로를 숨기고, 대신 이 위젯이 같은 fixed 컨테이너 안에 자체 스크롤
// 버튼을 함께 그려 "화살표+위젯"이 항상 화면 하단에 붙은 한 덩어리로
// 쌓이도록 한다 (분리돼 있으면 위젯 높이가 바뀔 때 둘 사이에 빈 공백이
// 남는 문제가 있었음).
const SCROLL_DISPLAY_VAR = "--tf-scroll-display"

// MARKETS/computeState/statusMeta/WEEKDAY_KO는 히어로 LIVE 위젯
// (src/components/hero/live-market-widget.tsx)과 공유하기 위해
// src/lib/market-clock.ts로 옮겼다 — 로직 자체는 그대로.

export function MarketClock() {
  const [now, setNow] = useState<Date | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [scrollVisible, setScrollVisible] = useState(false)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // 전역 scroll-to-top 버튼을 숨기고(이 위젯이 자체 버튼을 그림), 스크롤
  // 위치에 따라 그 자체 버튼의 표시 여부를 관리한다.
  useEffect(() => {
    document.documentElement.style.setProperty(SCROLL_DISPLAY_VAR, "none")
    const onScroll = () => setScrollVisible(window.scrollY > 300)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      document.documentElement.style.removeProperty(SCROLL_DISPLAY_VAR)
    }
  }, [])

  const states = useMemo(() => {
    if (!now) return null
    return MARKETS.map((m) => computeState(m, now))
  }, [now])

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {scrollVisible && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="맨 위로"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <ArrowUp size={18} strokeWidth={1.5} className="text-white" />
        </button>
      )}

      <div
        className="pointer-events-auto w-[260px] overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#1a1a1a]/95 shadow-2xl backdrop-blur-md sm:w-[280px]"
        role="complementary"
        aria-label="국내·미국 증시 개장 상태 및 현재 시각"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#212121] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
            </span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-white">
              TickerFlow · LIVE
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-5 w-5 items-center justify-center rounded text-[#a6a6a6] transition-colors hover:bg-white/10 hover:text-white"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "펼치기" : "접기"}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "-rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>

        {!collapsed && (
          <div className="divide-y divide-white/[0.06]">
            {states
              ? states.map((s) => <MarketRow key={s.def.id} state={s} />)
              : MARKETS.map((m) => <MarketRowSkeleton key={m.id} def={m} />)}
          </div>
        )}

        <div className="flex items-center justify-between bg-[#151515] px-3 py-1.5">
          <span className="font-mono text-[10px] text-[#a6a6a6]">데이터 동기화 · 1s</span>
          <span className="font-mono text-[10px] text-blue-400">{"> LIVE UPDATE"}</span>
        </div>
      </div>
    </div>
  )
}

function MarketRow({ state }: { state: MarketState }) {
  const meta = statusMeta(state.status)
  const toneTextClass =
    meta.tone === "up" ? "text-emerald-400"
    : meta.tone === "down" ? "text-red-400"
    : "text-amber-400"
  const badgeClass =
    meta.tone === "up" ? "bg-emerald-500/15 text-emerald-400"
    : meta.tone === "down" ? "bg-red-500/15 text-red-400"
    : "bg-amber-500/15 text-amber-400"

  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-mono text-[11px] font-medium text-white">
          {state.def.label}
        </span>
        <span className="font-mono text-[10px] text-[#a6a6a6]">
          {state.def.city} · {WEEKDAY_KO[state.weekday] ?? state.weekday}요일
        </span>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-baseline font-mono tabular-nums">
          <span className="text-lg font-semibold tracking-tight text-white">
            {state.hh}:{state.mm}
          </span>
          <span className={cn("ml-1 w-5 text-xs font-medium", toneTextClass)}>{state.ss}</span>
        </div>
        <span className={cn("rounded-[4px] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider", badgeClass)}>
          {meta.text}
        </span>
      </div>
    </div>
  )
}

function MarketRowSkeleton({ def }: { def: MarketDef }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="font-mono text-[11px] text-[#a6a6a6]">{def.label}</span>
      <span className="font-mono text-lg tabular-nums text-[#a6a6a6]">--:--</span>
    </div>
  )
}
