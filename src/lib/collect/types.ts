export interface CollectResult {
  ok: boolean;
  error?: string;
  /** 일시적 오류(네트워크, rate limit 등)는 true, 설정 오류는 false. queue retry 판단에 사용. */
  retryable?: boolean;
  [key: string]: unknown;
}

// 외부 API(Finnhub 등) 응답이 실패했을 때 "스킵"으로만 뭉뚱그리면 rate limit인지
// 진짜 데이터가 없는지 구분할 수 없다. 종목별 순차 호출 루프(insider.ts, news.ts
// 등)에서 실패 사유를 집계해 CollectResult에 skipReasons로 남긴다.
export type SkipReason = "rate_limit" | "auth_error" | "not_found" | "server_error" | "other";

export function classifyHttpSkipReason(status: number): SkipReason {
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "auth_error";
  if (status === 404) return "not_found";
  if (status >= 500) return "server_error";
  return "other";
}

export function addSkipReason(
  tally: Partial<Record<SkipReason, number>>,
  reason: SkipReason
): void {
  tally[reason] = (tally[reason] ?? 0) + 1;
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
  "weekly-digest",
  "classify-filings",
  "short-interest",
  "price-targets",
  "top30",
  "brief-backfill",
  "weekly-brief",
  "monthly-brief",
  "youtube-channels",
  "financials",
  "top30-outcomes",
  "pro-expiry",
] as const;

export type CollectJob = typeof COLLECT_JOBS[number];

export type CollectHandler = () => Promise<CollectResult>;

export function isCollectJob(job: string): job is CollectJob {
  return (COLLECT_JOBS as readonly string[]).includes(job);
}
