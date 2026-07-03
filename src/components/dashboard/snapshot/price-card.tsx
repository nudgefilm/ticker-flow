import type { Quote } from "@/lib/insights/types";

function PriceLineChart({ history, up }: { history: number[]; up: boolean }) {
  if (history.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[#a6a6a6]">
        주가 데이터를 수집 중입니다
      </div>
    );
  }

  const w = 800, h = 160, pad = 6;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const n = history.length;
  const color = up ? "#34d399" : "#f87171";
  const gradientId = up ? "priceFillUp" : "priceFillDown";

  const x = (i: number) => pad + (i / (n - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);

  const linePoints = history.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const areaPoints = `${pad},${h - pad} ${linePoints} ${w - pad},${h - pad}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

const RANGE_INDICATOR_LABEL =
  "현재 주가가 52주 범위 내 어느 위치에 있는지를 나타내는 위치 인디케이터";

function RangeBar({ low, high, close }: { low: number; high: number; close: number }) {
  // high === low(가격 데이터가 하루치뿐인 경우 등)일 때 0/0 = NaN이 되는 것을 방지
  const pct = high === low ? 50 : Math.min(Math.max(((close - low) / (high - low)) * 100, 0), 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-[#a6a6a6]">52주 최저</span>
        <span className="text-[#a6a6a6]">52주 최고</span>
      </div>
      <div
        className="relative h-1.5 w-full rounded-full bg-white/[0.06]"
        aria-label="52주 최저·최고 범위 내 현재 주가 위치"
      >
        <div
          className="group/dot absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pct}%` }}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[#60a5fa] opacity-75" />
          <div className="relative h-full w-full rounded-full bg-[#60a5fa] ring-4 ring-[#60a5fa]/20" />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-[#cccccc] opacity-0 transition-opacity group-hover/dot:opacity-100 sm:block">
            {RANGE_INDICATOR_LABEL}
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-[#a6a6a6] sm:hidden">
        파란 점: {RANGE_INDICATOR_LABEL}
      </p>
      <div className="mt-2 flex items-center justify-between text-sm font-medium text-white">
        <span>${low.toFixed(2)}</span>
        <span>${high.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function PriceCard({ quote }: { quote: Quote | null }) {
  if (!quote) {
    return (
      <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-5">
        <p className="text-xs text-[#a6a6a6]">최근 종가</p>
        <p className="mt-2 text-sm text-[#a6a6a6]">주가 데이터를 수집 중입니다.</p>
      </div>
    );
  }

  const { close, change, changePct, dataDate, history, week52High, week52Low } = quote;
  const up = change >= 0;
  const color = up ? "#34d399" : "#f87171";

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-[#a6a6a6]">최근 종가</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-3">
            <span className="text-4xl font-bold leading-none text-white">${close.toFixed(2)}</span>
            <span className="text-sm font-medium" style={{ color }}>
              {up ? "+" : ""}{change.toFixed(2)} ({up ? "+" : ""}{changePct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <span className="text-xs text-[#a6a6a6]">기준일 {dataDate}</span>
      </div>

      <div className="my-5">
        <PriceLineChart history={history} up={up} />
        <p className="mt-1 text-right text-[11px] text-[#a6a6a6]">1년 종가 추이</p>
      </div>

      <RangeBar low={week52Low} high={week52High} close={close} />
    </div>
  );
}
