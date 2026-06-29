"use client";

import { useRef, useState } from "react";
import type { SectorStat } from "@/lib/sectors";
import { SECTOR_COLORS, hexToRgba } from "@/lib/sectors";

const W = 800;
const H = 400;
const MIN_PCT = 0.03; // 전체 면적의 3% 최솟값 보장
const PAD = 2;

// ─── Squarified Treemap ───────────────────────────────────────────────────────

type Rect = { x: number; y: number; w: number; h: number };

function worstRatio(row: number[], minEdge: number): number {
  if (row.length === 0 || minEdge <= 0) return Infinity;
  const s = row.reduce((a, b) => a + b, 0);
  if (s <= 0) return Infinity;
  const thickness = s / minEdge;
  let worst = 0;
  for (const v of row) {
    const span = (v / s) * minEdge;
    if (span <= 0) return Infinity;
    const ratio = Math.max(thickness / span, span / thickness);
    if (ratio > worst) worst = ratio;
  }
  return worst;
}

function squarify(
  values: number[],
  x: number,
  y: number,
  w: number,
  h: number
): Rect[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [{ x, y, w, h }];
  if (w < 1 || h < 1) return values.map(() => ({ x, y, w: 0, h: 0 }));

  const minEdge = Math.min(w, h);
  let row = [values[0]];
  for (let i = 1; i < values.length; i++) {
    const withNext = [...row, values[i]];
    if (worstRatio(withNext, minEdge) >= worstRatio(row, minEdge)) break;
    row = withNext;
  }

  const rowSum = row.reduce((s, v) => s + v, 0);
  const rects: Rect[] = [];
  const rest = values.slice(row.length);

  if (w <= h) {
    const rowH = rowSum / w;
    let cx = x;
    for (const v of row) {
      const cw = (v / rowSum) * w;
      rects.push({ x: cx, y, w: cw, h: rowH });
      cx += cw;
    }
    if (rest.length > 0) {
      const remaining = h - rowH;
      if (remaining >= 1) {
        rects.push(...squarify(rest, x, y + rowH, w, remaining));
      } else {
        rest.forEach(() => rects.push({ x, y: y + rowH, w: 0, h: 0 }));
      }
    }
  } else {
    const rowW = rowSum / h;
    let cy = y;
    for (const v of row) {
      const ch = (v / rowSum) * h;
      rects.push({ x, y: cy, w: rowW, h: ch });
      cy += ch;
    }
    if (rest.length > 0) {
      const remaining = w - rowW;
      if (remaining >= 1) {
        rects.push(...squarify(rest, x + rowW, y, remaining, h));
      } else {
        rest.forEach(() => rects.push({ x: x + rowW, y, w: 0, h: 0 }));
      }
    }
  }

  return rects;
}

// ─── 활동 구간별 글래스모피즘 스타일 ─────────────────────────────────────────

interface TileStyle {
  fill: string;
  border: string;
  isTop: boolean;
}

function getTileStyle(
  tier: "top" | "mid" | "bot",
  hex: string,
  isHovered: boolean
): TileStyle {
  switch (tier) {
    case "top":
      return {
        fill:   hexToRgba(hex, 0.22),
        border: isHovered ? hexToRgba(hex, 0.85) : hexToRgba(hex, 0.55),
        isTop:  true,
      };
    case "mid":
      return {
        fill:   hexToRgba(hex, 0.12),
        border: isHovered ? hexToRgba(hex, 0.50) : hexToRgba(hex, 0.28),
        isTop:  false,
      };
    case "bot":
    default:
      return {
        fill:   isHovered ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
        border: isHovered ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
        isTop:  false,
      };
  }
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function SectorTreemap({ sectors }: { sectors: SectorStat[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (sectors.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-sm text-[#a6a6a6]">
        섹터 데이터를 수집 중입니다.
      </div>
    );
  }

  // 1. 유효 값 산출
  const withEffective = sectors.map((s) => ({
    ...s,
    effective: s.activityScore > 0 ? s.activityScore : s.tickerCount * 0.5,
  }));

  // 2. 로그 스케일 변환 — 크기 편차 완화
  const withLog = withEffective.map((s) => ({
    ...s,
    logScore: Math.log1p(s.effective),
  }));

  // 3. 최솟값 3% 보정
  const rawTotal = withLog.reduce((sum, s) => sum + s.logScore, 0) || 1;
  const minVal = rawTotal * MIN_PCT;
  const floored = withLog.map((s) => ({
    ...s,
    logScore: Math.max(s.logScore, minVal),
  }));

  // 4. 원본 activityScore 내림차순 정렬
  const sorted = [...floored].sort((a, b) => b.effective - a.effective);

  // 5. 활동 3구간 경계
  const n = sorted.length;
  const topCut = Math.ceil(n / 3);
  const midCut = Math.ceil((2 * n) / 3);

  // 6. 면적 정규화 (로그 스케일 기반)
  const totalVal = sorted.reduce((sum, s) => sum + s.logScore, 0);
  const normalized = sorted.map((s) => (s.logScore / totalVal) * W * H);

  // 7. 트리맵 레이아웃
  const rects = squarify(normalized, 0, 0, W, H);

  const hoveredSector = hovered !== null ? sorted[hovered] : null;

  // 툴팁 위치 보정
  const TOOLTIP_H = 120;
  const containerH = containerRef.current?.offsetHeight ?? H;
  const tipTop =
    mousePos && mousePos.y + 14 + TOOLTIP_H > containerH
      ? mousePos.y - 14 - TOOLTIP_H
      : (mousePos?.y ?? 0) + 14;
  const tipLeft = (mousePos?.x ?? 0) + 14;

  return (
    <div className="relative" ref={containerRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "400px" }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {rects.map((r, i) => (
            <clipPath key={`clip-${i}`} id={`clip-sector-${i}`}>
              <rect
                x={r.x + PAD}
                y={r.y + PAD}
                width={Math.max(0, r.w - PAD * 2)}
                height={Math.max(0, r.h - PAD * 2)}
                rx={6}
              />
            </clipPath>
          ))}
        </defs>

        {sorted.map((s, i) => {
          const r = rects[i];
          if (!r || r.w < 1 || r.h < 1) return null;

          const isHovered = hovered === i;
          const rx = r.x + PAD;
          const ry = r.y + PAD;
          const rw = Math.max(0, r.w - PAD * 2);
          const rh = Math.max(0, r.h - PAD * 2);
          const cx = r.x + r.w / 2;
          const hasRoom   = r.h > 50;
          const showDetails = r.w > 100 && r.h > 70;
          const textBaseY = r.y + r.h / 2 - (showDetails ? 14 : hasRoom ? 8 : 0);

          const hex  = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS[s.sectorKr] ?? "#6b7280";
          const tier = i < topCut ? "top" : i < midCut ? "mid" : "bot";
          const tile = getTileStyle(tier, hex, isHovered);

          return (
            <g key={s.sector} style={{ cursor: "default" }}>
              {/* ── 글래스모피즘 배경 (foreignObject → div) ── */}
              <foreignObject x={rx} y={ry} width={rw} height={rh}>
                <div
                  style={{
                    width:               "100%",
                    height:              "100%",
                    pointerEvents:       "none",
                    overflow:            "hidden",
                    backdropFilter:      tile.isTop ? "blur(6px) saturate(1.3)" : undefined,
                    backgroundColor:     tile.fill,
                    border:              `1px solid ${tile.border}`,
                    borderRadius:        "6px",
                    boxSizing:           "border-box",
                    transition:          "border-color 0.15s, background-color 0.15s",
                  }}
                />
              </foreignObject>

              {/* ── 텍스트 레이블 ── */}
              {rw > 40 && rh > 28 && (
                <g clipPath={`url(#clip-sector-${i})`} style={{ pointerEvents: "none" }}>
                  <text
                    x={cx}
                    y={textBaseY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fontWeight="600"
                    fill="white"
                  >
                    {s.sectorKr}
                  </text>
                  {hasRoom && (
                    <text
                      x={cx}
                      y={textBaseY + 18}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11"
                      fill="#a6a6a6"
                    >
                      {s.tickerCount}종목
                    </text>
                  )}
                  {showDetails && (
                    <text
                      x={cx}
                      y={textBaseY + 34}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="11"
                      fill="#a6a6a6"
                    >
                      {`공시 ${s.filingCount}건 · 뉴스 ${s.newsCount}건`}
                    </text>
                  )}
                </g>
              )}

              {/* ── 마우스 이벤트 수신용 투명 hit 영역 ── */}
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill="transparent"
                stroke="none"
                rx={6}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => {
                  setHovered(null);
                  setMousePos(null);
                }}
                onMouseMove={(e) => {
                  if (containerRef.current) {
                    const bound = containerRef.current.getBoundingClientRect();
                    setMousePos({ x: e.clientX - bound.left, y: e.clientY - bound.top });
                  }
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* ── 커스텀 툴팁 ── */}
      {hoveredSector && mousePos && (
        <div
          className="pointer-events-none absolute z-50 rounded-[6px] border border-white/[0.12] bg-[#1a1a1a] px-3 py-2 text-sm shadow-lg"
          style={{ left: tipLeft, top: tipTop }}
        >
          <p className="font-medium text-white">{hoveredSector.sectorKr}</p>
          <p className="mt-1 text-[#a6a6a6]">종목 수 {hoveredSector.tickerCount}개</p>
          <p className="text-[#a6a6a6]">공시 {hoveredSector.filingCount}건</p>
          <p className="text-[#a6a6a6]">뉴스 {hoveredSector.newsCount}건</p>
          <p className="text-[#a6a6a6]">활동 점수 {hoveredSector.activityScore}</p>
        </div>
      )}
    </div>
  );
}
