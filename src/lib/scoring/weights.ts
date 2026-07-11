// ─────────────────────────────────────────────────────────────────────────
// 티커플로우 스크리너 — 활성 가중치 구조 (13개 팩터)
//
// 2026-07-11 개정: Estimate Revision(구 12%)을 활성 리스트에서 제외(3단계
// 로드맵으로만 유지)하고, 그 자리에 analyst(애널리스트 의견 분포)를 8%로 신규
// 편입했다. 동시에 재무 4팩터(revenueGrowth/epsGrowth/fcf/roic)를 활성화했다.
//
// 활성 가중치 합계는 96%다. 나머지 4%(= 구 Estimate Revision 12% − analyst 8%)는
// 어느 팩터에도 재분배하지 않고 "보류분"으로 남긴다(향후 Estimate Revision 등
// 신규 팩터 편입 시 재검토). 아래 computeFinalScore()는 각 종목에서 실제로 값이
// 존재하는(non-null) 활성 팩터의 가중치 합으로 나눠 정규화하므로(종목별 동적
// 정규화), 활성 합이 정확히 100%가 아니어도 점수 계산에는 영향이 없다 —
// "합 100%"는 표기 관례이지 계산 전제가 아니다.
//
// 신규 팩터 추가/가중치 재배분은 가중치 체계 재설계에 해당하므로 별도 승인이
// 필요하다(CLAUDE.md 18항).
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
  | "analyst"
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
  filing: { weight: 0.12, active: true, label: "기업이벤트(공시)" },
  insider: { weight: 0.10, active: true, label: "내부자거래" },
  target: { weight: 0.09, active: true, label: "목표주가변화" },
  analyst: { weight: 0.08, active: true, label: "애널리스트 의견" },
  news: { weight: 0.05, active: true, label: "뉴스" },
  short: { weight: 0.05, active: true, label: "공매도변화" },
  momentum: { weight: 0.04, active: true, label: "가격모멘텀" },
  revenueGrowth: { weight: 0.04, active: true, label: "매출성장률(YoY)" },
  epsGrowth: { weight: 0.03, active: true, label: "EPS성장률(YoY)" },
  fcf: { weight: 0.02, active: true, label: "FCF" },
  roic: { weight: 0.01, active: true, label: "ROIC/ROE" },
};

// 보류분(어느 팩터에도 배분하지 않는 여유 가중치). 활성 합계 + 이 값 = 1.0.
// 구 Estimate Revision(0.12) 자리에 analyst(0.08)를 넣고 남긴 0.04.
// 정규화는 종목별 non-null 활성 가중치 합으로 하므로 이 상수는 표기·감사용이다.
export const RESERVED_WEIGHT = 0.04;

// 팩터별 기여도 내부 로그(사용자 비노출). 데이터 미존재 시 null —
// "계산 안 함"(종목별 정규화에서 분자·분모 모두 제외)과 "계산 결과 0"을 구분한다.
export type FactorLog = Record<ScreenerFactor, number | null>;
