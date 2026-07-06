// ─────────────────────────────────────────────────────────────────────────
// 티커플로우 스크리너 — 최종 목표 가중치 구조 (13개 항목, 100% 확정)
//
// 이 13개 항목·최종 비중은 확정 구조이며 임의 변경 금지.
// 신규 팩터 추가 시 이 리스트에 항목을 늘리지 말고 별도 검토를 거칠 것.
//
// 데이터가 아직 없는 항목은 weight는 최종 목표치로 고정한 채 active만
// false로 두어 비활성 처리한다. 활성 항목끼리만 정규화(→ getActiveWeightSum())
// 하므로, 나중에 항목이 활성화되어도 각 항목의 최종 비중 자체는 바뀌지 않는다.
// ─────────────────────────────────────────────────────────────────────────

export type ScreenerFactor =
  | "earnings"
  | "institution"
  | "insider"
  | "target"
  | "filing"
  | "news"
  | "short"
  | "momentum"
  | "revision"
  | "revenueGrowth"
  | "epsGrowth"
  | "fcf"
  | "roic";

export interface WeightConfig {
  weight: number; // 최종 목표 비중 (0~1 소수)
  active: boolean;
  label: string; // 한글 라벨 (로그/디버깅용)
}

export const SCREENER_WEIGHTS: Record<ScreenerFactor, WeightConfig> = {
  earnings: { weight: 0.18, active: true, label: "실적·가이던스" },
  institution: { weight: 0.15, active: true, label: "기관수급(13F)" },
  insider: { weight: 0.10, active: true, label: "내부자거래" },
  target: { weight: 0.09, active: true, label: "목표주가변화" },
  filing: { weight: 0.12, active: true, label: "기업이벤트(공시)" },
  news: { weight: 0.05, active: true, label: "뉴스" },
  short: { weight: 0.05, active: true, label: "공매도변화" },
  momentum: { weight: 0.04, active: true, label: "가격모멘텀" },
  revision: { weight: 0.12, active: false, label: "Estimate Revision" },
  revenueGrowth: { weight: 0.04, active: false, label: "매출성장률(YoY)" },
  epsGrowth: { weight: 0.03, active: false, label: "EPS성장률(YoY)" },
  fcf: { weight: 0.02, active: false, label: "FCF" },
  roic: { weight: 0.01, active: false, label: "ROIC/ROE" },
};

// 활성 항목(active: true) 비중 합계 — 하드코딩 금지, SCREENER_WEIGHTS 순회로 계산.
// 현재 8개 항목 활성 → 0.78 반환.
export function getActiveWeightSum(): number {
  return Object.values(SCREENER_WEIGHTS).reduce(
    (sum, config) => (config.active ? sum + config.weight : sum),
    0,
  );
}

// 팩터별 기여도 내부 로그(사용자 비노출). 비활성 항목 또는 데이터 미존재 시 null —
// "계산 안 함"과 "계산 결과 0"을 구분한다.
export type FactorLog = Record<ScreenerFactor, number | null>;
