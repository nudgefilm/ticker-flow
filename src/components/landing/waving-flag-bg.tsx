const STRIPE_COUNT = 13;
const FLAG_WIDTH = 190;
const FLAG_HEIGHT = 100;
const STRIPE_HEIGHT = FLAG_HEIGHT / STRIPE_COUNT;
const CANTON_WIDTH = 76;
const CANTON_HEIGHT = STRIPE_HEIGHT * 7;

// 좌→우로 진행하는 파동을 표현하기 위해 깃발을 세로 컬럼으로 분할.
// 각 컬럼은 같은 상하 진폭으로 움직이되 시작 위상(begin)이 오른쪽일수록
// 늦게 시작해, 시간이 지나면서 파동의 정점이 왼쪽→오른쪽으로 이동하는
// 것처럼 보인다. 왼쪽 끝(깃대 쪽)은 진폭 0으로 고정.
const COLUMN_COUNT = 14;
const COLUMN_WIDTH = FLAG_WIDTH / COLUMN_COUNT;
const WAVE_DURATION = 2.6; // seconds
const MAX_AMPLITUDE = 3; // viewBox 단위 (flag height 100 기준)

const COLUMNS = Array.from({ length: COLUMN_COUNT }, (_, i) => {
  const amplitude = MAX_AMPLITUDE * (i / (COLUMN_COUNT - 1));
  const begin = (i / COLUMN_COUNT) * WAVE_DURATION;
  return {
    key: i,
    x: i * COLUMN_WIDTH,
    amplitude,
    begin,
  };
});

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

// 랜딩 CTA 카드용 배경 장식 — 은은하게 좌→우로 물결치는 성조기 실루엣.
// 낮은 opacity + blur로 처리해 텍스트 가독성을 해치지 않는다.
export function WavingFlagBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ perspective: "600px" }}
    >
      {/* 카드 왼쪽 2/5 지점에 중심을 두고 카드 높이에 꽉 차게 배치.
          전체적으로는 고정된 사선 각도(rotateY)만 주고 왕복시키지
          않음 — 오른쪽 끝이 앞으로 나오는 일 없이 항상 뒤로 물러난
          상태를 유지. 좌→우로 갈수록 옅어지도록 선형 마스크
          (opacity 0.10 → 0.06) 적용. */}
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
          <g id="flag-art">
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
          {COLUMNS.map((col) => (
            <clipPath key={col.key} id={`flag-col-${col.key}`}>
              <rect x={col.x} y={-20} width={COLUMN_WIDTH + 0.5} height={FLAG_HEIGHT + 40} />
            </clipPath>
          ))}
        </defs>
        {COLUMNS.map((col) => (
          <g key={col.key} clipPath={`url(#flag-col-${col.key})`}>
            <g>
              {col.amplitude > 0 && (
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values={`0,0; 0,${-col.amplitude}; 0,0; 0,${col.amplitude}; 0,0`}
                  dur={`${WAVE_DURATION}s`}
                  begin={`${col.begin}s`}
                  repeatCount="indefinite"
                />
              )}
              <use href="#flag-art" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
