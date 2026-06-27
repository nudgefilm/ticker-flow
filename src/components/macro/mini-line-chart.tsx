interface DataPoint {
  date: string;
  value: number;
}

export default function MiniLineChart({
  data,
  color = "#a6a6a6",
  chartId,
  height = 44,
}: {
  data: DataPoint[];
  color?: string;
  chartId: string;
  height?: number;
}) {
  if (data.length === 0) return null;

  const W = 200;
  const H = height;
  const PAD_X = 2;
  const PAD_Y = 4;
  const gradientId = `fill-${chartId}`;

  // 1개 데이터: 중앙 수평선
  const pts: [number, number][] =
    data.length === 1
      ? [
          [PAD_X, H / 2],
          [W - PAD_X, H / 2],
        ]
      : data.map((d, i) => {
          const values = data.map((v) => v.value);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min || 1;
          const x = PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2);
          const y = H - PAD_Y - ((d.value - min) / range) * (H - PAD_Y * 2);
          return [x, y];
        });

  const pathD = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const fillD =
    pathD +
    ` L ${pts[pts.length - 1][0].toFixed(1)},${H} L ${pts[0][0].toFixed(1)},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeOpacity={0.7}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
