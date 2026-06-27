// 활동량 기반 중립 지표. 주가·수익률·투자 해석과 무관.

export type SectorPeriod = "7d" | "30d" | "90d";

export interface SectorStat {
  sector: string;        // 영문 키 (색상 매핑용)
  sectorKr: string;      // 한글 표기
  tickerCount: number;   // 모니터링 종목 수
  filingCount: number;   // 기간 내 공시 건수
  newsCount: number;     // 기간 내 뉴스 건수
  activityScore: number; // 공시 × 2 + 뉴스
  keywords: string[];    // 섹터별 대표 키워드
}

export const SECTOR_KR: Record<string, string> = {
  "Technology": "기술",
  "Healthcare": "헬스케어",
  "Financials": "금융",
  "Consumer Discretionary": "경기소비재",
  "Industrials": "산업재",
  "Communication Services": "커뮤니케이션",
  "Consumer Staples": "필수소비재",
  "Energy": "에너지",
  "Utilities": "유틸리티",
  "Real Estate": "부동산",
  "Materials": "소재",
};

export const SECTOR_COLORS: Record<string, string> = {
  Technology: "#60a5fa",
  Healthcare: "#34d399",
  Financials: "#fbbf24",
  "Consumer Discretionary": "#f87171",
  "Consumer Staples": "#fb923c",
  Energy: "#facc15",
  Industrials: "#a78bfa",
  Materials: "#4ade80",
  "Real Estate": "#f472b6",
  Utilities: "#38bdf8",
  "Communication Services": "#c084fc",
  // 한글 키 (트리맵 fallback)
  기술: "#60a5fa",
  헬스케어: "#34d399",
  금융: "#fbbf24",
  경기소비재: "#f87171",
  필수소비재: "#fb923c",
  에너지: "#facc15",
  산업재: "#a78bfa",
  소재: "#4ade80",
  부동산: "#f472b6",
  유틸리티: "#38bdf8",
  커뮤니케이션: "#c084fc",
};

export const SECTOR_KEYWORDS: Record<string, string[]> = {
  Technology: ["AI", "Semiconductor", "Cloud", "GPU", "Data Center"],
  Healthcare: ["FDA", "임상", "신약", "바이오", "승인"],
  Financials: ["금리", "대출", "신용", "자사주", "예금"],
  "Consumer Discretionary": ["소비", "리테일", "전기차", "여행", "온라인"],
  "Consumer Staples": ["식품", "유통", "가격", "배당", "브랜드"],
  Energy: ["원유", "천연가스", "정제", "배당", "감산"],
  Industrials: ["수주", "항공", "물류", "설비", "방산"],
  Materials: ["철강", "화학", "구리", "리튬", "원자재"],
  "Real Estate": ["리츠", "임대", "공실", "금리", "오피스"],
  Utilities: ["전력", "요금", "재생에너지", "배당", "송전"],
  "Communication Services": ["스트리밍", "광고", "콘텐츠", "구독", "통신"],
};

export const PERIOD_LABELS: Record<SectorPeriod, string> = {
  "7d": "최근 7일",
  "30d": "최근 30일",
  "90d": "최근 90일",
};

export function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
