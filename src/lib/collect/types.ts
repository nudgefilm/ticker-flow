export interface CollectResult {
  ok: boolean;
  error?: string;
  /** 일시적 오류(네트워크, rate limit 등)는 true, 설정 오류는 false. queue retry 판단에 사용. */
  retryable?: boolean;
  [key: string]: unknown;
}

export const COLLECT_JOBS = [
  "profile",
  "filings",
  "news",
  "earnings",
  "earnings-actual",
  "prices",
  "insider",
  "analyst",
  "13f",
  "macro",
  "watchlist-tickers",
  "calls",
  "seed-tickers",
  "translate",
  "digest",
  "classify-filings",
  "short-interest",
  "price-targets",
  "top30",
  "telegram",
  "telegram-digest",
] as const;

export type CollectJob = typeof COLLECT_JOBS[number];

export type CollectHandler = () => Promise<CollectResult>;

export function isCollectJob(job: string): job is CollectJob {
  return (COLLECT_JOBS as readonly string[]).includes(job);
}
