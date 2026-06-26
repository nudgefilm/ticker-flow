import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/insights/types";

interface Props {
  news: NewsItem[];
}

function relativeDate(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) {
    const kst = new Date(d.getTime() + 9 * 3_600_000);
    return `오늘 ${kst.getUTCHours().toString().padStart(2, "0")}:${kst.getUTCMinutes().toString().padStart(2, "0")} KST`;
  }
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

export default function SnapshotNews({ news }: Props) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">최근 뉴스 (30일)</p>

      {news.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">최근 30일 내 수집된 뉴스가 없습니다.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {news.map((n) => (
            <div key={n.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug text-white">{n.headline}</p>
                <span className="shrink-0 text-xs text-[#a6a6a6]">{relativeDate(n.publishedAt)}</span>
              </div>
              {n.summaryKr && (
                <p className="line-clamp-2 text-xs leading-relaxed text-[#a6a6a6]">{n.summaryKr}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                {n.source && (
                  <span className="rounded-[4px] border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[11px] text-[#a6a6a6]">
                    {n.source}
                  </span>
                )}
                {n.url && (
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
                  >
                    원문
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
