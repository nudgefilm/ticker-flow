import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/insights/types";
import { SectionCard, relativeDate } from "./ui";

export default function RelatedNews({ news }: { news: NewsItem[] }) {
  return (
    <SectionCard title="관련 뉴스" description="최근 90일">
      {news.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#a6a6a6]">
          최근 90일 내 관련 뉴스가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {news.map((n) => (
            <li key={n.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2 text-[11px] text-[#a6a6a6]">
                <span>{n.source ?? "—"}</span>
                <span>·</span>
                <time>{relativeDate(n.publishedAt)}</time>
              </div>
              <p className="line-clamp-2 text-sm font-medium leading-snug text-white">
                {n.headline}
              </p>
              {n.summaryKr && n.summaryKr !== n.headline && (
                <p className="line-clamp-2 text-xs leading-relaxed text-[#a6a6a6]">
                  {n.summaryKr}
                </p>
              )}
              {n.url && (
                <Link
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
                >
                  원문 보기
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
