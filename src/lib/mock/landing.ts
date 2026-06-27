// 랜딩 페이지 데모용 mock 데이터.
// 실제 서비스 연동 시 Supabase 쿼리 결과로 교체하면 UI 변경 없이 동작합니다.
// 투자 권유/전망 표현 없이 "변화 현황"만 중립적으로 표기합니다.

export type FeedBadgeColor = "blue" | "green" | "amber" | "purple";

export interface FeedItem {
  ticker: string;
  company: string;
  badgeColor: FeedBadgeColor;
  badgeLabel: string;
  relativeTime: string;
}

// 최신순 3건 (공시 2 + 뉴스 1)
export const LIVE_FEED: FeedItem[] = [
  {
    ticker: "NVDA",
    company: "엔비디아",
    badgeColor: "blue",
    badgeLabel: "8-K 제출",
    relativeTime: "12분 전",
  },
  {
    ticker: "TSLA",
    company: "테슬라",
    badgeColor: "amber",
    badgeLabel: "Form 4 내부자거래",
    relativeTime: "38분 전",
  },
  {
    ticker: "AAPL",
    company: "애플",
    badgeColor: "green",
    badgeLabel: "뉴스",
    relativeTime: "1시간 전",
  },
];

// 신뢰 수치 (실제 집계 결과로 교체)
export interface TrustStat {
  label: string;
  value: number;
  suffix: string;
}

export const TRUST_STATS: TrustStat[] = [
  { label: "모니터링 기업", value: 8000, suffix: "+" },
  { label: "수집 공시", value: 150000, suffix: "+" },
  { label: "뉴스", value: 320000, suffix: "+" },
  { label: "어닝콜", value: 5000, suffix: "+" },
];
