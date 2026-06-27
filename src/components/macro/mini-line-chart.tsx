interface DataPoint {
  date: string;
  value: number;
}

export default function MiniLineChart({
  data,
  height = 44,
}: {
  data: DataPoint[];
  height?: number;
}) {
  if (data.length < 2) return null;

  const W = 200;
  const H = height;
  const PAD_X = 2;
  const PAD_Y = 4;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2);
    const y = H - PAD_Y - ((d.value - min) / range) * (H - PAD_Y * 2);
    return [x, y] as [number, number];
  });

  const pathD = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  // 닫힌 영역 (fill)
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
        <linearGradient id="macroFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(166,166,166,0.15)" />
          <stop offset="100%" stopColor="rgba(166,166,166,0)" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#macroFill)" />
      <path
        d={pathD}
        fill="none"
        stroke="rgba(166,166,166,0.45)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
