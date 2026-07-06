"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ---------- config ---------- */

// 색상 팔레트를 N개로 제한하고 순환시킨다 (Tableau10 계열, 10색).
const PALETTE = [
  "#4e79a7",
  "#f28e2b",
  "#59a14f",
  "#e15759",
  "#76b7b2",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
];

const WEEKS = 52;
const TOP_COUNT = 30;
const DROPPED_COUNT = 5;
const VIEW_W = 1000;
const VIEW_H = 1000;

/* ---------- types ---------- */

type Ticker = {
  symbol: string;
  color: string;
  status: "top30" | "dropped";
  score: number;
  prices: number[];
};

type DataSet = {
  tickers: Ticker[];
  dates: string[];
};

/* ---------- mock data ---------- */

const SYMBOLS = [
  "LILA", "NVDX", "AAPL", "MSFT", "GOOG", "AMZN", "TSLA", "META", "AMD", "NFLX",
  "CRWD", "SNOW", "PLTR", "SHOP", "SQ", "COIN", "UBER", "ABNB", "DDOG", "NET",
  "PANW", "ADBE", "ORCL", "INTC", "MU", "QCOM", "AVGO", "TXN", "SMCI", "ARM",
  "SOFI", "RIVN", "LCID", "HOOD", "AFRM",
];

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildDataset(): DataSet {
  const dates: string[] = [];
  const start = new Date();
  start.setDate(start.getDate() - (WEEKS - 1) * 7);
  for (let i = 0; i < WEEKS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }

  const total = TOP_COUNT + DROPPED_COUNT;
  const tickers: Ticker[] = SYMBOLS.slice(0, total).map((symbol, idx) => {
    const rand = seededRandom(idx * 7919 + 13);
    let price = 8 + rand() * 240; // 넓은 가격 범위
    const drift = (rand() - 0.5) * 0.9;
    const vol = 0.02 + rand() * 0.05;
    const prices: number[] = [];
    for (let w = 0; w < WEEKS; w++) {
      const shock = (rand() - 0.5) * vol * price;
      price = Math.max(1, price * (1 + drift * 0.015) + shock);
      prices.push(Math.round(price * 100) / 100);
    }
    return {
      symbol,
      color: PALETTE[idx % PALETTE.length],
      status: idx < TOP_COUNT ? "top30" : "dropped",
      score: Math.round((40 + rand() * 60) * 10) / 10, // TickerFlow Screener 점수
      prices,
    };
  });

  return { tickers, dates };
}

/* ---------- component ---------- */

export function Top30TickerOverlay() {
  const data = useMemo(buildDataset, []);
  const { tickers, dates } = data;

  // Top 30: 점수 순위 내림차순 (#1 = 최고 점수)
  const top30 = useMemo(
    () =>
      tickers
        .filter((t) => t.status === "top30")
        .sort((a, b) => b.score - a.score),
    [tickers],
  );
  const dropped = useMemo(
    () => tickers.filter((t) => t.status === "dropped"),
    [tickers],
  );

  /* ----- 정규화 퍼센트 변화 스케일 (선형) ----- */
  // 각 티커의 첫 데이터 포인트(12개월 전) = 0%, 이후는 시작점 대비 변화율(%)
  const pctAt = (t: Ticker, i: number) => (t.prices[i] / t.prices[0] - 1) * 100;

  const scale = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const t of tickers) {
      for (let i = 0; i < t.prices.length; i++) {
        const v = pctAt(t, i);
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    // 0% 기준선이 항상 범위 안에 들도록 패딩
    const pad = (max - min) * 0.05;
    min = Math.min(min - pad, 0);
    max = Math.max(max + pad, 0);
    const yFrac = (pct: number) => 1 - (pct - min) / (max - min); // 0 = 상단, 1 = 하단
    return { min, max, yFrac };
  }, [tickers]);

  // Y축 눈금 (퍼센트, 보기 좋은 간격, 0% 포함)
  const yTicks = useMemo(() => {
    const { min, max } = scale;
    const span = max - min;
    const rawStep = span / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const niceMult = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
    const step = niceMult * mag;
    const out: { value: number; frac: number }[] = [];
    const startTick = Math.ceil(min / step) * step;
    for (let v = startTick; v <= max + step * 0.001; v += step) {
      const value = Math.abs(v) < step * 0.001 ? 0 : v;
      out.push({ value, frac: scale.yFrac(value) });
    }
    return out;
  }, [scale]);

  const zeroFrac = useMemo(() => scale.yFrac(0), [scale]);

  // X축 월별 눈금
  const monthTicks = useMemo(() => {
    const ticks: { frac: number; label: string }[] = [];
    let lastMonth = -1;
    dates.forEach((d, i) => {
      const dt = new Date(d);
      const m = dt.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        ticks.push({
          frac: i / (dates.length - 1),
          label: `${m + 1}월`,
        });
      }
    });
    return ticks;
  }, [dates]);

  // hovered = 일시적 강조, pinned = 클릭 고정. active는 고정이 우선.
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? hovered;
  const [crosshair, setCrosshair] = useState<{
    frac: number;
    idx: number;
  } | null>(null);

  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 라인 hover 시 해당 행이 보이도록 스크롤
  useEffect(() => {
    if (active && rowRefs.current[active]) {
      rowRefs.current[active]?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  const linePath = (t: Ticker) => {
    const n = t.prices.length;
    return t.prices
      .map((_, i) => {
        const x = (i / (n - 1)) * VIEW_W;
        const y = scale.yFrac(pctAt(t, i)) * VIEW_H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  function strokeOpacity(t: Ticker) {
    // 전체 차트 밝기 10% UP
    if (!active) return t.status === "dropped" ? 0.22 : 0.28;
    if (active === t.symbol) return 1;
    return 0.09;
  }

  function fmtPrice(v: number) {
    if (v >= 100) return `$${Math.round(v)}`;
    if (v >= 10) return `$${v.toFixed(0)}`;
    return `$${v.toFixed(1)}`;
  }

  function fmtPct(v: number, decimals = 0) {
    const r = decimals ? v.toFixed(decimals) : Math.round(v).toString();
    return `${v > 0 ? "+" : ""}${r}%`;
  }

  function fmtDateKr(iso: string) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  const plotRef = useRef<HTMLDivElement>(null);
  function handlePlotMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(frac * (dates.length - 1));
    setCrosshair({ frac, idx });
  }

  const activeTicker = active ? tickers.find((t) => t.symbol === active) : null;

  // 활성 티커의 12개월 고점/저점 (퍼센트 변환은 단조 증가이므로 가격 극값과 동일)
  const extremes = useMemo(() => {
    if (!activeTicker) return null;
    let hiIdx = 0;
    let loIdx = 0;
    activeTicker.prices.forEach((p, i) => {
      if (p > activeTicker.prices[hiIdx]) hiIdx = i;
      if (p < activeTicker.prices[loIdx]) loIdx = i;
    });
    const n = activeTicker.prices.length - 1;
    const point = (idx: number) => ({
      idx,
      xFrac: idx / n,
      yFrac: scale.yFrac(pctAt(activeTicker, idx)),
      price: activeTicker.prices[idx],
      date: dates[idx],
    });
    return { high: point(hiIdx), low: point(loIdx) };
  }, [activeTicker, scale, dates]);

  const renderRow = (t: Ticker, rank: number | null) => {
    const isActive = active === t.symbol;
    const isPinned = pinned === t.symbol;
    return (
      <button
        key={t.symbol}
        ref={(el) => {
          rowRefs.current[t.symbol] = el;
        }}
        type="button"
        onPointerEnter={() => setHovered(t.symbol)}
        onPointerLeave={() => setHovered(null)}
        onClick={() => setPinned((p) => (p === t.symbol ? null : t.symbol))}
        className={`relative flex w-full items-center gap-2 px-3 py-1 text-left transition-colors ${
          isPinned
            ? "bg-[#243247]"
            : isActive
              ? "bg-[#1f1f1f]"
              : "hover:bg-[#161616]"
        }`}
      >
        {isPinned && (
          <span
            className="absolute left-0 top-0 h-full w-0.5"
            style={{ backgroundColor: t.color }}
            aria-hidden
          />
        )}
        <span
          className={`w-5 flex-none text-right text-[10px] tabular-nums ${
            isPinned ? "font-semibold text-white" : "text-[#8d8d8d]"
          }`}
        >
          {rank ?? "—"}
        </span>
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ backgroundColor: t.color, opacity: t.status === "dropped" ? 0.6 : 1 }}
        />
        <span
          className={`flex-1 text-[11px] font-medium tracking-wide ${
            t.status === "dropped" ? "text-[#dbdbdb]" : "text-white"
          }`}
        >
          {t.symbol}
        </span>
        <span className="flex-none text-[10px] tabular-nums text-[#8d8d8d]">
          {fmtPrice(t.prices[t.prices.length - 1])}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-[720px] flex-col bg-[#0a0a0a] text-white">
      {/* header */}
      <header className="flex flex-none items-baseline justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold tracking-wide">
            Top 30 Ticker Overlay
          </h1>
          <p className="text-[11px] text-[#dbdbdb]">
            최근 12개월 · 주간 종가 · 시작점 대비 변화율(%) · hover 강조 · 클릭 고정
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#dbdbdb]">
          <span>{top30.length} in Top 30</span>
          <span className="text-white/40">·</span>
          <span>{dropped.length} dropped</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---------- 좌측 티커 리스트 ---------- */}
        <aside className="flex w-[180px] flex-none flex-col border-r border-white/10 bg-[#0d0d0d]">
          <div className="flex-none px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Top 30
            <span className="ml-1 font-normal normal-case text-white/40">(점수순)</span>
          </div>
          {/* 스크롤바 숨김 · 휠로만 스크롤 (네이티브 스크롤바를 클리핑 영역 밖으로 밀어냄) */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="no-scrollbar h-full w-[calc(100%+24px)] overflow-y-auto pr-6">
              {top30.map((t, i) => renderRow(t, i + 1))}
            </div>
          </div>
          {dropped.length > 0 && (
            <div className="flex-none border-t border-dashed border-[#3b6ea5]/50 bg-[#0e1c2e]">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7fb0e0]">
                Top 30 이탈
              </div>
              {dropped.map((t) => renderRow(t, null))}
            </div>
          )}
        </aside>

        {/* ---------- Y축 (퍼센트) ---------- */}
        <div className="relative w-12 flex-none border-r border-white/[0.06] bg-[#0a0a0a]">
          {yTicks.map((tk, i) => (
            <div
              key={i}
              className={`absolute right-1.5 -translate-y-1/2 text-[9px] tabular-nums ${
                tk.value === 0 ? "font-semibold text-white/70" : "text-[#dbdbdb]"
              }`}
              style={{ top: `${tk.frac * 100}%` }}
            >
              {fmtPct(tk.value)}
            </div>
          ))}
        </div>

        {/* ---------- 차트 플롯 ---------- */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#0a0a0a]">
          <div
            ref={plotRef}
            className="relative min-h-0 flex-1"
            onPointerMove={handlePlotMove}
            onPointerLeave={() => setCrosshair(null)}
            onClick={() => setPinned(null)}
          >
            <svg
              className="h-full w-full"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
            >
              {/* Y 그리드라인 (아주 옅게) */}
              {yTicks.map((tk, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={tk.frac * VIEW_H}
                  x2={VIEW_W}
                  y2={tk.frac * VIEW_H}
                  stroke="#ffffff"
                  strokeOpacity={0.04}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* 0% 기준선 */}
              <line
                x1={0}
                y1={zeroFrac * VIEW_H}
                x2={VIEW_W}
                y2={zeroFrac * VIEW_H}
                stroke="#ffffff"
                strokeOpacity={0.25}
                strokeWidth={1}
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />

              {/* 라인 (비활성 항목 먼저, 활성 항목 마지막에 그려 위로) */}
              {[...tickers]
                .sort((a, b) => (a.symbol === active ? 1 : 0) - (b.symbol === active ? 1 : 0))
                .map((t) => (
                  <path
                    key={t.symbol}
                    d={linePath(t)}
                    fill="none"
                    stroke={t.color}
                    strokeOpacity={strokeOpacity(t)}
                    strokeWidth={active === t.symbol ? 2 : 1}
                    strokeDasharray={t.status === "dropped" ? "4 3" : undefined}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}

              {/* 라인 hover 히트 영역 (투명, 두꺼운 stroke) */}
              {tickers.map((t) => (
                <path
                  key={`hit-${t.symbol}`}
                  d={linePath(t)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={10}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: "pointer" }}
                  onPointerEnter={() => setHovered(t.symbol)}
                  onPointerLeave={() => setHovered(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPinned((p) => (p === t.symbol ? null : t.symbol));
                  }}
                />
              ))}

              {/* 활성 티커 고점/저점 마커 */}
              {extremes && activeTicker && (
                <>
                  {[extremes.high, extremes.low].map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.xFrac * VIEW_W}
                      cy={pt.yFrac * VIEW_H}
                      r={3.5}
                      fill="#1a1a1a"
                      stroke={activeTicker.color}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </>
              )}

              {/* 크로스헤어 */}
              {crosshair && (
                <line
                  x1={crosshair.frac * VIEW_W}
                  y1={0}
                  x2={crosshair.frac * VIEW_W}
                  y2={VIEW_H}
                  stroke="#ffffff"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* 활성 티커의 크로스헤어 지점 마커 */}
              {crosshair && activeTicker && (
                <circle
                  cx={crosshair.frac * VIEW_W}
                  cy={scale.yFrac(pctAt(activeTicker, crosshair.idx)) * VIEW_H}
                  r={4}
                  fill={activeTicker.color}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* 툴팁 */}
            {crosshair && activeTicker && (
              <div
                className="pointer-events-none absolute top-2 z-10 rounded-md border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-[11px] shadow-lg"
                style={{
                  left: `calc(${crosshair.frac * 100}% + 8px)`,
                  transform: crosshair.frac > 0.8 ? "translateX(-100%)" : undefined,
                  marginLeft: crosshair.frac > 0.8 ? -16 : 0,
                }}
              >
                <div className="font-semibold" style={{ color: activeTicker.color }}>
                  {activeTicker.symbol}
                </div>
                <div className="tabular-nums text-[#dbdbdb]">
                  {dates[crosshair.idx]}
                </div>
                <div className="tabular-nums text-white">
                  {fmtPct(pctAt(activeTicker, crosshair.idx), 1)}{" "}
                  <span className="text-[#dbdbdb]">
                    ({fmtPrice(activeTicker.prices[crosshair.idx])})
                  </span>
                </div>
              </div>
            )}

            {/* 고점/저점 콜아웃 라벨 (활성 티커 전용) */}
            {extremes && activeTicker &&
              [
                { pt: extremes.high, place: "above" as const },
                { pt: extremes.low, place: "below" as const },
              ].map(({ pt, place }, i) => {
                // 가장자리 클리핑 방지: 상단 근처면 아래로, 하단 근처면 위로 뒤집기
                const flip = place === "above" ? pt.yFrac < 0.12 : pt.yFrac > 0.88;
                const showBelow = place === "above" ? flip : !flip;
                // 수평 정렬: 좌/우 가장자리에서 안쪽으로
                const alignX =
                  pt.xFrac > 0.88 ? "right" : pt.xFrac < 0.12 ? "left" : "center";
                return (
                  <div
                    key={i}
                    className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md border bg-[#1a1a1a] px-2 py-1 text-[10px] leading-tight shadow-lg"
                    style={{
                      left: `${pt.xFrac * 100}%`,
                      top: `${pt.yFrac * 100}%`,
                      borderColor: activeTicker.color,
                      transform: `translate(${
                        alignX === "right" ? "-100%" : alignX === "left" ? "0%" : "-50%"
                      }, ${showBelow ? "12px" : "calc(-100% - 12px)"})`,
                    }}
                  >
                    <span className="tabular-nums font-semibold text-white">
                      {fmtPrice(pt.price)}
                    </span>
                    <span className="mx-1 text-white/25">·</span>
                    <span className="tabular-nums text-[#a6a6a6]">
                      {fmtDateKr(pt.date)}
                    </span>
                  </div>
                );
              })}
          </div>

          {/* X축 */}
          <div className="relative h-7 flex-none border-t border-white/10">
            {monthTicks.map((tk, i) => (
              <div
                key={i}
                className="absolute top-0 flex h-full flex-col items-center"
                style={{ left: `${tk.frac * 100}%`, transform: "translateX(-50%)" }}
              >
                <div className="h-1.5 w-px bg-white/20" />
                <span className="mt-1 text-[9px] tabular-nums text-[#dbdbdb]">
                  {tk.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
