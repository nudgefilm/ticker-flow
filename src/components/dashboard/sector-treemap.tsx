"use client";

import { useState } from "react";

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

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function SectorTreemap({ sectors }: { sectors: SectorStat[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

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

  // 4. 활동 점수 기준 색상
  const n = sorted.length;
  const topCut = Math.ceil(n / 3);
  const midCut = Math.ceil((2 * n) / 3);
  const colors = sorted.map((_, i) => {
    if (i < topCut) return "rgba(96,165,250,0.35)";
    if (i < midCut) return "rgba(96,165,250,0.18)";
    return "rgba(255,255,255,0.06)";
  });

  // 5. 면적 정규화
  const totalVal = sorted.reduce((sum, s) => sum + s.effective, 0);
  const normalized = sorted.map((s) => (s.effective / totalVal) * W * H);

  // 6. 레이아웃
  const rects = squarify(normalized, 0, 0, W, H);

  return (
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
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "default" }}
          >
            <title>{`${s.sectorKr} (${s.sector})\n종목 수: ${s.tickerCount}개\n공시(30일): ${s.filingCount}건\n뉴스(7일): ${s.newsCount}건`}</title>
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
  );
}
