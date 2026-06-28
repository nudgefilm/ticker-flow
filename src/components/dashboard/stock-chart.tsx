const PRICES = [
  512, 528, 505, 540, 560, 548, 575, 590, 610, 600, 625, 640, 660, 645, 670,
  690, 712, 700, 730, 748, 760, 745, 775, 800, 790, 815, 835, 820, 850, 870,
  855, 880, 905, 890, 915, 940, 925, 950, 962, 875,
];

const W = 600;
const H = 160;
const PAD = 4;

const min = Math.min(...PRICES);
const max = Math.max(...PRICES);

const points = PRICES.map((p, i) => {
  const x = PAD + (i / (PRICES.length - 1)) * (W - PAD * 2);
  const y = PAD + (1 - (p - min) / (max - min)) * (H - PAD * 2);
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}).join(" ");

export default function StockChart() {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5">
      <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">주가 흐름 (90일)</p>

      <div className="mt-4 flex gap-3">
        {/* Y축 라벨 */}
        <div className="flex flex-col justify-between py-1 text-right">
          {["$950", "$800", "$650", "$500"].map((label) => (
            <span key={label} className="text-xs text-[#a6a6a6]">
              {label}
            </span>
          ))}
        </div>

        {/* SVG 차트 */}
        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-[160px] w-full"
          >
            <polyline
              points={points}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* X축 라벨 */}
          <div className="mt-1 flex justify-between">
            {["Apr", "May", "Jun"].map((label) => (
              <span key={label} className="text-xs text-[#a6a6a6]">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 stat pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: "90일 최고", value: "$974.00" },
          { label: "90일 최저", value: "$712.30" },
          { label: "평균 거래량", value: "42.3M" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[4px] bg-[#262626] px-3 py-2 text-xs"
          >
            <span className="text-[#a6a6a6]">{item.label} </span>
            <span className="tabular-nums text-[#cccccc]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
