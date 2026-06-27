export type GuidanceDirection = "up" | "maintain" | "down";

export interface KeyStatement {
  text: string;
  role: string;
}

export interface QaPair {
  question: string;
  answer: string;
}

export interface KeywordChange {
  keyword: string;
  direction: "up" | "down";
}

export interface EarningsCall {
  id: string;
  ticker: string;
  company_name: string;
  quarter: string;
  call_date: string;
  headline_summary: string;
  revenue_actual: string;
  revenue_estimate: string;
  eps_actual: string;
  eps_estimate: string;
  surprise_percent: number;
  guidance_direction: GuidanceDirection;
  guidance_previous: GuidanceDirection;
  guidance_summary: string;
  keywords: string[];
  key_statements: KeyStatement[];
  qa_pairs: QaPair[];
  keyword_changes: KeywordChange[];
  tone_previous: string;
  tone_current: string;
  has_earnings_release: boolean;
  in_watchlist: boolean;
  source_url: string;
  transcript_url: string;
  summary_generated_at: string;
}
