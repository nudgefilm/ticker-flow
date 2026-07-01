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

// 랜딩 CTA 카드용 배경 장식 — 은은하게 물결치는 성조기 실루엣.
// 낮은 opacity + blur로 처리해 텍스트 가독성을 해치지 않는다.
export function WavingFlagBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: "600px" }}
    >
      {/* 카드 왼쪽 2/5 지점에 중심을 두고 카드 높이에 꽉 차게 배치.
          transform은 고정된 사선 각도(rotateY)만 주고 왕복시키지
          않음 — 오른쪽 끝이 앞으로 나오는 일 없이 항상 뒤로 물러난
          상태를 유지. 대신 표면 자체는 SVG feTurbulence 왜곡으로
          바람에 물결치듯 애니메이션. 좌→우로 갈수록 옅어지도록
          선형 마스크(opacity 0.10 → 0.06)를 적용. */}
      <svg
        viewBox={`0 0 ${FLAG_WIDTH} ${FLAG_HEIGHT}`}
        className="absolute left-[40%] top-0 h-full -translate-x-1/2 opacity-[0.10] blur-[1px]"
        style={{
          aspectRatio: `${FLAG_WIDTH} / ${FLAG_HEIGHT}`,
          transformOrigin: "left center",
          transform: "rotateY(16deg)",
          maskImage: "linear-gradient(to right, black 0%, rgba(0,0,0,0.6) 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 0%, rgba(0,0,0,0.6) 100%)",
        }}
      >
        <defs>
          <filter id="flag-ripple" x="-20%" y="-30%" width="140%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.05"
              numOctaves={2}
              seed={4}
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.012 0.05;0.017 0.06;0.012 0.05"
                dur="7s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={7}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <g filter="url(#flag-ripple)">
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
        </g>
      </svg>
    </div>
  );
}
