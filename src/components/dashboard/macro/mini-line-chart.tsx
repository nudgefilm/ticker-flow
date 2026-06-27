// 경제지표 최근 12개월 추이용 미니 SVG 라인차트
// - 모든 지표가 동일한 스타일 사용 (단색, hover 효과 없음)
// - 색상으로 호/악재 의미를 부여하지 않음 (중립 강조색만 사용)

interface MiniLineChartProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

const STROKE = "#60a5fa"; // 중립 강조색 (의미 부여 아님)

export default function MiniLineChart({
  data,
  width = 240,
  height = 56,
  className,
}: MiniLineChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className={className}
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const stepX = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
    .join(" ");

  const areaPath =
    `${linePath} L ${points[points.length - 1][0].toFixed(2)} ${height - pad} ` +
    `L ${points[0][0].toFixed(2)} ${height - pad} Z`;

  const gradientId = `mini-fill-${Math.round(min * 1000)}-${data.length}`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="최근 12개월 추이"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={STROKE} stopOpacity="0.18" />
          <stop offset="100%" stopColor={STROKE} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={STROKE} />
    </svg>
  );
}
