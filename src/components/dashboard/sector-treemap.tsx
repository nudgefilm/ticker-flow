"use client";

import { useRef, useState } from "react";

export type SectorStat = {
  sector: string;
  sectorKr: string;
  tickerCount: number;
  filingCount: number;
  newsCount: number;
  activityScore: number;
};

const W = 800;
const H = 400;
const MIN_PCT = 0.02;
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

// ─── 섹터 색상 ────────────────────────────────────────────────────────────────

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#60a5fa",
  Healthcare: "#34d399",
  Financials: "#fbbf24",
  "Consumer Discretionary": "#f87171",
  "Consumer Staples": "#fb923c",
  Energy: "#facc15",
  Industrials: "#a78bfa",
  Materials: "#4ade80",
  "Real Estate": "#f472b6",
  Utilities: "#38bdf8",
  "Communication Services": "#c084fc",
  기술: "#60a5fa",
  헬스케어: "#34d399",
  금융: "#fbbf24",
  경기소비재: "#f87171",
  필수소비재: "#fb923c",
  에너지: "#facc15",
  산업재: "#a78bfa",
  소재: "#4ade80",
  부동산: "#f472b6",
  유틸리티: "#38bdf8",
  커뮤니케이션: "#c084fc",
};

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
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

  // 2. 최솟값 2% 보정
  const rawTotal = withEffective.reduce((sum, s) => sum + s.effective, 0) || 1;
  const minVal = rawTotal * MIN_PCT;
  const floored = withEffective.map((s) => ({
    ...s,
    effective: Math.max(s.effective, minVal),
  }));

  // 3. activityScore 내림차순 정렬
  const sorted = [...floored].sort((a, b) => b.effective - a.effective);

  // 4. 섹터별 고유 색상 + 활동 점수 기준 명도
  const n = sorted.length;
  const topCut = Math.ceil(n / 3);
  const midCut = Math.ceil((2 * n) / 3);
  const colors = sorted.map((s, i) => {
    const hex = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS[s.sectorKr] ?? "#6b7280";
    const opacity = i < topCut ? 0.4 : i < midCut ? 0.25 : 0.12;
    return hexToRgba(hex, opacity);
  });

  // 5. 면적 정규화
  const totalVal = sorted.reduce((sum, s) => sum + s.effective, 0);
  const normalized = sorted.map((s) => (s.effective / totalVal) * W * H);

  // 6. 레이아웃
  const rects = squarify(normalized, 0, 0, W, H);

  const hoveredSector = hovered !== null ? sorted[hovered] : null;

  // 툴팁 위치 보정: 하단 120px 이내면 위로 반전
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
            <clipPath key={`clip-${i}`} id={`clip-${i}`}>
              <rect
                x={r.x + PAD}
                y={r.y + PAD}
                width={Math.max(0, r.w - PAD * 2)}
                height={Math.max(0, r.h - PAD * 2)}
              />
            </clipPath>
          ))}
        </defs>

        {sorted.map((s, i) => {
          const r = rects[i];
          if (!r || r.w < 1 || r.h < 1) return null;

          const isHovered = hovered === i;
          const cx = r.x + r.w / 2;
          const hasRoom = r.h > 50;
          const showDetails = r.w > 100 && r.h > 70;
          const textBaseY = r.y + r.h / 2 - (showDetails ? 14 : hasRoom ? 8 : 0);

          return (
            <g
              key={s.sector}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => { setHovered(null); setMousePos(null); }}
              onMouseMove={(e) => {
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }
              }}
              style={{ cursor: "default" }}
            >
              <rect
                x={r.x + PAD}
                y={r.y + PAD}
                width={Math.max(0, r.w - PAD * 2)}
                height={Math.max(0, r.h - PAD * 2)}
                fill={colors[i]}
                stroke={isHovered ? "rgba(96,165,250,0.6)" : "rgba(255,255,255,0.06)"}
                strokeWidth={isHovered ? 1.5 : 1}
                rx={4}
              />
              {r.w > 40 && r.h > 28 && (
                <g clipPath={`url(#clip-${i})`}>
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
            </g>
          );
        })}
      </svg>

      {/* 커스텀 툴팁 */}
      {hoveredSector && mousePos && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-white/[0.12] bg-[#1a1a1a] px-3 py-2 text-sm shadow-lg"
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
