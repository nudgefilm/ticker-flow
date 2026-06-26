export type Importance = "high" | "medium" | "low";

export interface Quote {
  close: number;
  change: number;
  changePct: number;
  dataDate: string;
  history: number[];
  week52High: number;
  week52Low: number;
}

export interface NextEarnings {
  date: string;
  daysUntil: number;
  timing: "BMO" | "AMC";
  epsEstimate: number;
}

export interface Filing {
  id: string;
  date: string;
  formType: string;
  eventType?: string;
  summary: string;
  importance: Importance;
  url: string;
}

export interface TimelineEvent {
  id: string;
  kind: "filing" | "news" | "insider" | "earnings";
  date: string;
  title: string;
  description?: string;
}

export interface InsiderTrade {
  id: string;
  name: string;
  titleLabel?: string;
  type: "매수" | "매도";
  shares: number | null;
  price: number | null;
  value: number | null;
  date: string;
}

export interface InsiderSummary {
  buyCount: number;
  sellCount: number;
  totalVolume: string;
  trades: InsiderTrade[];
}

export interface EarningsRow {
  id: string;
  quarter: string;
  epsEstimate: number | null;
  epsActual: number | null;
  reportDate: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string | null;
  publishedAt: string;
  url: string | null;
  summaryKr: string | null;
}

export interface StockInsight {
  ticker: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  lastClose: number | null;
  updatedAt: string | null;
  marketCap: string;
  summary: {
    filings: number;
    keyEvents: number;
    insiderTrades: number;
    news: number;
    earnings: number;
  };
  filings: Filing[];
  timeline: TimelineEvent[];
  insider: InsiderSummary;
  earnings: EarningsRow[];
  news: NewsItem[];
}
