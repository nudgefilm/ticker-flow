import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import type { NewsItem } from "@/lib/insights/types";
import { InsightCard, EmptyState, relativeDate } from "./ui";

export default function RelatedNews({ news }: { news: NewsItem[] }) {
  return (
    <InsightCard title="관련 뉴스 (90일)">
      {news.length === 0 ? (
        <EmptyState message="최근 90일 내 관련 뉴스가 없습니다." />
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {news.map((n) => (
            <div key={n.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              {/* Row 1: 출처 + 날짜 */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#a6a6a6]">{n.source ?? "—"}</span>
                <span className="shrink-0 text-xs text-[#a6a6a6]">{relativeDate(n.publishedAt)}</span>
              </div>

              {/* Row 2: 헤드라인 */}
              <p className="line-clamp-2 text-sm font-medium leading-snug text-white">
                {n.headline}
              </p>

              {/* Row 3: 한국어 요약 */}
              {n.summaryKr && n.summaryKr !== n.headline && (
                <p className="line-clamp-2 text-xs leading-relaxed text-[#a6a6a6]">
                  {n.summaryKr}
                </p>
              )}

              {/* Row 4: 원문 링크 */}
              {n.url && (
                <Link
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
                >
                  원문 보기
                  <IconExternalLink size={11} stroke={1.5} />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </InsightCard>
  );
}
