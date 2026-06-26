import type { Quote } from "@/lib/insights/types";

interface Props {
  quote: Quote | null;
}

function PriceChart({ history, dates }: { history: number[]; dates: string[] }) {
  if (history.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-[#a6a6a6]">
        주가 데이터를 수집 중입니다
      </div>
    );
  }

  const W = 600, CHART_H = 110, TOTAL_H = 140, PAD_X = 32;
  const minC = Math.min(...history);
  const maxC = Math.max(...history);
  const pad = (maxC - minC || 1) * 0.1;
  const yMin = minC - pad;
  const yMax = maxC + pad;

  const toX = (i: number) => PAD_X + (i / (history.length - 1)) * (W - 2 * PAD_X);
  const toY = (c: number) => 5 + (1 - (c - yMin) / (yMax - yMin)) * (CHART_H - 10);

  const pts = history.map((c, i) => `${toX(i).toFixed(1)},${toY(c).toFixed(1)}`).join(" ");
  const fill = `${pts} ${toX(history.length - 1).toFixed(1)},${CHART_H} ${toX(0).toFixed(1)},${CHART_H}`;

  const n = history.length;
  const labelIndices: { i: number; anchor: "start" | "middle" | "end" }[] = [
    { i: 0, anchor: "start" },
    { i: Math.floor((n - 1) / 2), anchor: "middle" },
    { i: n - 1, anchor: "end" },
  ];

  function fmtMD(d: string) {
    const p = d.split("-");
    return `${parseInt(p[1])}/${parseInt(p[2])}`;
  }

  return (
    <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full" style={{ height: "140px" }}>
      <polygon points={fill} fill="rgba(96,165,250,0.08)" />
      <polyline
        points={pts}
        fill="none"
        stroke="#60a5fa"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {labelIndices.map(({ i, anchor }) => (
        <text
          key={i}
          x={toX(i).toFixed(1)}
          y={CHART_H + 22}
          textAnchor={anchor}
          fontSize="11"
          fill="#a6a6a6"
        >
          {dates[i] ? fmtMD(dates[i]) : ""}
        </text>
      ))}
    </svg>
  );
}

export default function PriceCard({ quote }: Props) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          {quote ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-white">
                ${quote.close.toFixed(2)}
              </p>
              <p
                className={`mt-0.5 text-sm font-medium ${
                  quote.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {quote.changePct >= 0 ? "+" : ""}
                {quote.changePct.toFixed(2)}%
                <span className="ml-1.5 text-xs font-normal text-[#a6a6a6]">
                  {quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-[#a6a6a6]">주가 데이터 없음</p>
          )}
        </div>
        <div className="text-right text-xs text-[#a6a6a6]">
          {quote ? (
            <>
              <p>52주 고가 ${quote.week52High.toFixed(2)}</p>
              <p>52주 저가 ${quote.week52Low.toFixed(2)}</p>
              <p className="mt-1">{quote.dataDate} 기준</p>
            </>
          ) : null}
        </div>
      </div>
      {/* Chart placeholder — history & dates 전달 필요 */}
      <PriceChart history={quote?.history ?? []} dates={[]} />
    </div>
  );
}

// 날짜 배열 포함 버전 (페이지에서 직접 사용)
export function PriceCardFull({
  quote,
  dates,
}: {
  quote: Quote | null;
  dates: string[];
}) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          {quote ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-white">
                ${quote.close.toFixed(2)}
              </p>
              <p
                className={`mt-0.5 text-sm font-medium ${
                  quote.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {quote.changePct >= 0 ? "+" : ""}
                {quote.changePct.toFixed(2)}%
                <span className="ml-1.5 text-xs font-normal text-[#a6a6a6]">
                  {quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-[#a6a6a6]">주가 데이터 없음</p>
          )}
        </div>
        <div className="text-right text-xs text-[#a6a6a6]">
          {quote && (
            <>
              <p>52주 고가 ${quote.week52High.toFixed(2)}</p>
              <p>52주 저가 ${quote.week52Low.toFixed(2)}</p>
              <p className="mt-1">{quote.dataDate} 기준</p>
            </>
          )}
        </div>
      </div>
      <PriceChart history={quote?.history ?? []} dates={dates} />
    </div>
  );
}
