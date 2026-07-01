const STRIPE_COUNT = 13;
const FLAG_WIDTH = 190;
const FLAG_HEIGHT = 100;
const STRIPE_HEIGHT = FLAG_HEIGHT / STRIPE_COUNT;
const CANTON_WIDTH = 76;
const CANTON_HEIGHT = STRIPE_HEIGHT * 7;

function buildStars() {
  const rows = 6;
  const cols = 8;
  const stars: { key: string; cx: number; cy: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offset = r % 2 === 0 ? 0 : CANTON_WIDTH / cols / 2;
      const cx = offset + (c + 0.5) * (CANTON_WIDTH / cols);
      const cy = (r + 0.5) * (CANTON_HEIGHT / rows);
      if (cx < CANTON_WIDTH - 2) stars.push({ key: `${r}-${c}`, cx, cy });
    }
  }
  return stars;
}

const STARS = buildStars();

// 랜딩 CTA 카드용 배경 장식 — 은은하게 흔들리는 성조기 실루엣.
// 낮은 opacity + blur로 처리해 텍스트 가독성을 해치지 않는다.
export function WavingFlagBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* 카드 왼쪽 2/5 지점에 중심을 두고 카드 높이에 꽉 차게 배치.
          가장자리를 마스크로 페이드아웃해 배경에 은은하게 묻히도록 처리 */}
      <svg
        viewBox={`0 0 ${FLAG_WIDTH} ${FLAG_HEIGHT}`}
        className="absolute left-[40%] top-0 h-full -translate-x-1/2 animate-flag-wave opacity-[0.16] blur-[1.5px]"
        style={{
          aspectRatio: `${FLAG_WIDTH} / ${FLAG_HEIGHT}`,
          transformOrigin: "center",
          maskImage: "radial-gradient(ellipse 75% 80% at center, black 55%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 80% at center, black 55%, transparent 95%)",
        }}
      >
        {Array.from({ length: STRIPE_COUNT }, (_, i) => (
          <rect
            key={i}
            x={0}
            y={i * STRIPE_HEIGHT}
            width={FLAG_WIDTH}
            height={STRIPE_HEIGHT}
            fill={i % 2 === 0 ? "#B22234" : "#FFFFFF"}
          />
        ))}
        <rect x={0} y={0} width={CANTON_WIDTH} height={CANTON_HEIGHT} fill="#3C3B6E" />
        {STARS.map((s) => (
          <circle key={s.key} cx={s.cx} cy={s.cy} r={1.1} fill="#FFFFFF" />
        ))}
      </svg>
    </div>
  );
}
