"use client";

// 히어로 아래 전체 폭 파티클 섹션 — 원본 참고 코드의
// `grid p-4 sm:p-6 lg:grid-cols-[1fr_280px] lg:gap-6` 레이아웃을 그대로
// 재현한다. 좌측 큰 박스는 ParticleCanvas가 배경처럼 꽉 채우고, 그 위
// 좌하단에 히어로 eyebrow/h1 텍스트를 오버레이로 겹친다(pointer-events-none
// — 마우스 반발 인터랙션은 캔버스가 그대로 받는다). 우측 280px 레일은
// LiveMarketWidget + 카피 카드 + GATHER/SCATTER 모드 버튼 원본 그대로.
//
// mode(GATHER/SCATTER) 상태는 캔버스(prop)와 버튼(로컬)이 둘 다 필요해서
// 이 컴포넌트로 끌어올렸다(state lift-up) — 가장 표준적인 React 패턴.

import { useState } from "react";
import dynamic from "next/dynamic";
import { LiveMarketWidget } from "./live-market-widget";
import type { ParticleMode } from "./particle-canvas";

const ParticleCanvas = dynamic(
  () => import("./particle-canvas").then((m) => m.ParticleCanvas),
  { ssr: false }
);

const MODES: { id: ParticleMode; label: string }[] = [
  { id: "gather", label: "GATHER" },
  { id: "scatter", label: "SCATTER" },
];

const LIGHT = "rgba(245,245,247,";
const SIGNAL = "#eb601e";

export function ParticleSection() {
  const [mode, setMode] = useState<ParticleMode>("gather");

  return (
    <section
      className="border-b pt-32 text-[#f5f5f7] md:pt-40"
      style={{ backgroundColor: "#0a0a0f", borderColor: `${LIGHT}0.15)` }}
    >
      <div className="grid p-4 sm:p-6 lg:grid-cols-[1fr_280px] lg:gap-6">
        {/* 좌: 캔버스 박스 (배경 캔버스 + 좌하단 오버레이 텍스트) */}
        <div
          className="relative h-[340px] min-w-0 overflow-hidden rounded-xl border sm:h-[420px] lg:h-[480px]"
          style={{ borderColor: `${LIGHT}0.15)` }}
        >
          <ParticleCanvas mode={mode} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <p className="mb-1 text-xs font-medium text-amber-400 md:text-sm">
              미국 기업의 변화를 추적하는 데이터 플랫폼
            </p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
              나스닥 모니터링
            </h1>
            <span className="sr-only">TickerFlow</span>
          </div>
        </div>

        {/* 우: 레일 (LIVE 위젯 + 카피 카드 + 모드 버튼) */}
        <div className="mt-4 flex flex-col gap-3 lg:mt-0 lg:h-[480px]">
          <LiveMarketWidget />

          <div
            className="relative overflow-hidden rounded-xl border px-4 py-4"
            style={{ borderColor: `${LIGHT}0.15)` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative">
              <h2 className="text-balance text-base font-bold leading-tight sm:text-lg">
                Every ticker is a living particle.
              </h2>
              <p className="mt-2 text-pretty text-xs leading-relaxed" style={{ color: `${LIGHT}0.6)` }}>
                8,400여 개 미국 상장사를 하나의 필드로. 커서로 흩뜨리고, 흩어진
                데이터가 제자리를 찾아 수렴하는 과정을 직접 만져보세요.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MODES.map((m, i) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={active}
                  className="rounded-xl border px-4 py-4 text-left font-widget-mono text-[11px] uppercase tracking-widest transition-colors"
                  style={
                    active
                      ? { borderColor: SIGNAL, backgroundColor: SIGNAL, color: "#0a0a0f" }
                      : { borderColor: `${LIGHT}0.15)`, color: `${LIGHT}0.7)` }
                  }
                >
                  <span
                    className="block text-[9px]"
                    style={{ color: active ? "rgba(10,10,15,0.6)" : `${LIGHT}0.4)` }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
