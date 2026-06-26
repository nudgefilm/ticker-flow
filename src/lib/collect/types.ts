export interface CollectResult {
  ok: boolean;
  error?: string;
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
] as const;

export type CollectJob = typeof COLLECT_JOBS[number];

export type CollectHandler = () => Promise<CollectResult>;
