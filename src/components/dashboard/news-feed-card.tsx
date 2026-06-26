import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

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

export default function NewsFeedCard({ news, className }: { news: NewsItem; className?: string }) {
  const { ticker, headline, source, published_at, url, summary_kr } = news;
  const content = summary_kr ?? headline;

  return (
    <article className={cn("rounded-[6px] border border-white/[0.08] bg-[#111111] p-5", className)}>
      {/* Row 1: 출처 + 날짜 */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#a6a6a6]">{source ?? "—"}</span>
        <span className="shrink-0 text-xs text-[#a6a6a6]">{formatPublishedAt(published_at)}</span>
      </div>

      {/* Row 2: 헤드라인 */}
      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white">
        {headline}
      </p>

      {/* Row 3: 한국어 요약 (summary_kr 있을 때만) */}
      {summary_kr && summary_kr !== headline && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#cccccc]">
          {content}
        </p>
      )}

      {/* Row 4: 티커 태그 + 원문 보기 */}
      <div className="mt-3 flex items-center justify-between">
        {ticker ? (
          <Link href={`/stocks/${ticker}`} className="rounded-[4px] bg-[#1a1a1a] px-2 py-1 text-xs text-[#a6a6a6]">
            {ticker}
          </Link>
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
