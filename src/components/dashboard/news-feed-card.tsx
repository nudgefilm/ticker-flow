import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { TickerBadges } from "@/components/dashboard/ticker-badge";
import type { TickerBadgeReason } from "@/lib/collect/target-tickers";

export interface NewsItem {
  id: string;
  ticker: string | null;
  headline: string;
  source: string | null;
  published_at: string;
  url: string | null;
  summary_kr: string | null;
}

function formatPublishedAt(publishedAt: string): string {
  const published = new Date(publishedAt);
  const now = new Date();
  const publishedDay = new Date(published.getFullYear(), published.getMonth(), published.getDate());
  const nowDay       = new Date(now.getFullYear(),       now.getMonth(),       now.getDate());
  const diffDays = Math.floor((nowDay.getTime() - publishedDay.getTime()) / 86_400_000);

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7)  return `${diffDays}일 전`;
  return `${published.getMonth() + 1}월 ${published.getDate()}일`;
}

export default function NewsFeedCard({
  news,
  badges,
  className,
}: {
  news: NewsItem;
  badges?: TickerBadgeReason[];
  className?: string;
}) {
  const { ticker, headline, source, published_at, url, summary_kr } = news;
  const content = summary_kr ?? headline;
  const publishedLabel = formatPublishedAt(published_at);
  const isToday = publishedLabel === "오늘";

  return (
    <article className={cn("rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5", className)}>
      {/* Row 1: 출처 + 날짜 */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#a6a6a6]">{source ?? "—"}</span>
        <span
          className={cn(
            "shrink-0 text-xs",
            isToday ? "font-semibold text-green-400" : "text-[#a6a6a6]"
          )}
        >
          {publishedLabel}
        </span>
      </div>

      {/* Row 2: 헤드라인 (한국어 요약 있을 때 흐리게) */}
      <p className={`mt-2 text-sm leading-snug ${summary_kr && summary_kr !== headline ? "font-medium text-[#888888]" : "font-semibold text-white"}`}>
        {headline}
      </p>

      {/* Row 3: 한국어 요약 (summary_kr 있을 때만, 주텍스트로 강조) */}
      {summary_kr && summary_kr !== headline && (
        <p className="mt-2 text-sm font-medium leading-relaxed text-white">
          {summary_kr}
        </p>
      )}

      {/* summary_kr 번역 전 — 원문 헤드라인만 있는 상태임을 안내 */}
      {!summary_kr && (
        <p className="mt-2 text-xs text-[#a6a6a6]">번역 준비 중 · 원문 헤드라인만 표시됩니다</p>
      )}

      {/* Row 4: 티커 태그 + 원문 보기 */}
      <div className="mt-3 flex items-center justify-between">
        {ticker ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/stocks/${ticker}`} className="rounded-[4px] bg-[#262626] px-2 py-1 text-xs text-[#a6a6a6]">
              {ticker}
            </Link>
            <TickerBadges reasons={badges} />
          </div>
        ) : (
          <span />
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
          >
            원문 보기
            <IconExternalLink size={12} stroke={1.5} />
          </a>
        )}
      </div>
    </article>
  );
}
