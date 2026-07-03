import Link from "next/link";
import { ExternalLink, ArrowRight } from "lucide-react";
import type { NewsItem } from "@/lib/insights/types";
import { SectionCard } from "@/components/dashboard/insights/ui";

interface Props {
  news: NewsItem[];
  ticker: string;
}

export function SnapshotNews({ news, ticker }: Props) {
  return (
    <SectionCard title="최근 뉴스" description="최근 5건">
      {news.length === 0 ? (
        <div>
          <p className="text-sm text-[#a6a6a6]">최근 30일 내 수집된 뉴스가 없습니다.</p>
          <Link
            href={`/news?ticker=${ticker}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#60a5fa] hover:text-[#93c5fd]"
          >
            뉴스 피드 보기 <ArrowRight className="h-4 w-4" />
          </Link>
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
