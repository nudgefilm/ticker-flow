// 섹터 히트맵 더미 데이터
// 공시/뉴스 활동량 기반. 주가·수익률·강세/약세와 무관하며 "최근 기업 활동량"만 표현한다.

export type SectorPeriod = "7d" | "30d" | "90d";

export interface SectorStat {
  sector: string; // 영문 키 (트리맵 색상 매핑용)
  sectorKr: string; // 한글 표기
  tickerCount: number; // 모니터링 종목 수
  filingCount: number; // 기간 내 공시 건수
  newsCount: number; // 기간 내 뉴스 건수
  activityScore: number; // 공시 × 2 + 뉴스
  keywords: string[]; // 최근 많이 언급된 키워드 (빈도순)
}

// 기준(30일) 데이터 — 종목 수, 공시, 뉴스, 키워드
interface SectorBase {
  sector: string;
  sectorKr: string;
  tickerCount: number;
  filing30: number;
  news30: number;
  keywords: string[];
}

const SECTOR_BASE: SectorBase[] = [
  {
    sector: "Technology",
    sectorKr: "기술",
    tickerCount: 186,
    filing30: 84,
    news30: 193,
    keywords: ["AI", "Semiconductor", "Cloud", "GPU", "Data Center"],
  },
  {
    sector: "Healthcare",
    sectorKr: "헬스케어",
    tickerCount: 142,
    filing30: 61,
    news30: 142,
    keywords: ["FDA", "임상", "신약", "바이오", "승인"],
  },
  {
    sector: "Financials",
    sectorKr: "금융",
    tickerCount: 128,
    filing30: 48,
    news30: 119,
    keywords: ["금리", "대출", "신용", "자사주", "예금"],
  },
  {
    sector: "Consumer Discretionary",
    sectorKr: "임의소비재",
    tickerCount: 97,
    filing30: 39,
    news30: 104,
    keywords: ["소비", "리테일", "전기차", "여행", "온라인"],
  },
  {
    sector: "Industrials",
    sectorKr: "산업재",
    tickerCount: 88,
    filing30: 35,
    news30: 86,
    keywords: ["수주", "항공", "물류", "설비", "방산"],
  },
  {
    sector: "Communication Services",
    sectorKr: "통신서비스",
    tickerCount: 54,
    filing30: 27,
    news30: 78,
    keywords: ["스트리밍", "광고", "콘텐츠", "구독", "통신"],
  },
  {
    sector: "Consumer Staples",
    sectorKr: "필수소비재",
    tickerCount: 63,
    filing30: 22,
    news30: 58,
    keywords: ["식품", "유통", "가격", "배당", "브랜드"],
  },
  {
    sector: "Energy",
    sectorKr: "에너지",
    tickerCount: 71,
    filing30: 31,
    news30: 72,
    keywords: ["원유", "천연가스", "정제", "배당", "감산"],
  },
  {
    sector: "Real Estate",
    sectorKr: "부동산",
    tickerCount: 49,
    filing30: 18,
    news30: 41,
    keywords: ["리츠", "임대", "공실", "금리", "오피스"],
  },
  {
    sector: "Materials",
    sectorKr: "소재",
    tickerCount: 57,
    filing30: 20,
    news30: 47,
    keywords: ["철강", "화학", "구리", "리튬", "원자재"],
  },
  {
    sector: "Utilities",
    sectorKr: "유틸리티",
    tickerCount: 42,
    filing30: 14,
    news30: 33,
    keywords: ["전력", "요금", "재생에너지", "배당", "송전"],
  },
];

// 기간별 배율 (30일 기준)
const PERIOD_FACTOR: Record<SectorPeriod, { filing: number; news: number }> = {
  "7d": { filing: 0.28, news: 0.3 },
  "30d": { filing: 1, news: 1 },
  "90d": { filing: 2.7, news: 2.6 },
};

export const PERIOD_LABELS: Record<SectorPeriod, string> = {
  "7d": "최근 7일",
  "30d": "최근 30일",
  "90d": "최근 90일",
};

export const SECTOR_LAST_UPDATED = "2026.06.27 22:30 KST";

export function getSectorStats(period: SectorPeriod): SectorStat[] {
  const factor = PERIOD_FACTOR[period];
  return SECTOR_BASE.map((b) => {
    const filingCount = Math.round(b.filing30 * factor.filing);
    const newsCount = Math.round(b.news30 * factor.news);
    return {
      sector: b.sector,
      sectorKr: b.sectorKr,
      tickerCount: b.tickerCount,
      filingCount,
      newsCount,
      activityScore: filingCount * 2 + newsCount,
      keywords: b.keywords,
    };
  }).sort((a, b) => b.activityScore - a.activityScore);
}
