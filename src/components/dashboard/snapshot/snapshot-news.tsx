import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/insights/types";
import { SectionCard } from "@/components/dashboard/insights/ui";
import { WatchlistAddButton } from "@/components/dashboard/snapshot/watchlist-add-button";

interface Props {
  news: NewsItem[];
  ticker: string;
  showWatchlistButton?: boolean;
  inWatchlist?: boolean;
  atLimit?: boolean;
  isPro?: boolean;
}

export function SnapshotNews({
  news,
  ticker,
  showWatchlistButton = false,
  inWatchlist = false,
  atLimit = false,
  isPro = false,
}: Props) {
  return (
    <SectionCard title="최근 뉴스" description="최근 5건">
      {news.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <div>
            <p className="text-sm text-[#a6a6a6]">이 종목의 최근 뉴스가 없습니다.</p>
            <p className="mt-1 text-sm text-[#a6a6a6]">
              변화 발생 시 확인하려면 와치리스트에 추가해 보세요.
            </p>
          </div>
          {showWatchlistButton && !inWatchlist ? (
            <WatchlistAddButton
              ticker={ticker}
              initiallyInWatchlist={inWatchlist}
              atLimit={atLimit}
              isPro={isPro}
            />
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {news.slice(0, 5).map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#a6a6a6]">
                      {item.publishedAt.slice(0, 10)}
                    </span>
                    {item.source && (
                      <>
                        <span className="text-xs text-[#a6a6a6]">·</span>
                        <span className="text-xs text-[#a6a6a6]">{item.source}</span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 text-sm font-medium text-white">{item.headline}</h3>
                  {item.summaryKr && (
                    <p className="mt-0.5 text-sm text-[#a6a6a6]">{item.summaryKr}</p>
                  )}
                </div>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 text-xs text-[#a6a6a6] hover:text-[#60a5fa]"
                  >
                    원문 <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
