import { IconExternalLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type NewsCategory =
  | "가이던스 변경"
  | "CEO·임원"
  | "대규모 계약"
  | "M&A"
  | "규제 이슈"
  | "신제품";

const CATEGORY_STYLES: Record<NewsCategory, string> = {
  "가이던스 변경": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "CEO·임원": "bg-white/10 text-white/60 border-white/20",
  "대규모 계약": "bg-green-500/10 text-green-400 border-green-500/20",
  "M&A": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "규제 이슈": "bg-red-500/10 text-red-400 border-red-500/20",
  신제품: "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

export interface NewsItem {
  category: NewsCategory;
  event: string;
  company: string;
  source: string;
  time: string;
  summary: string;
  tag: string;
}

export default function NewsFeedCard({ news }: { news: NewsItem }) {
  const { category, event, company, source, time, summary, tag } = news;

  return (
    <article className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      {/* Row 1: 카테고리 배지 + 출처·시각 */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
            CATEGORY_STYLES[category]
          )}
        >
          {category}
        </span>
        <span className="shrink-0 text-xs text-[#666666]">
          {source} · {time}
        </span>
      </div>

      {/* Row 2: 이벤트 제목 */}
      <p className="mt-3 text-base font-semibold text-white">{event}</p>

      {/* Row 3: 회사명 */}
      <p className="mt-1 text-xs text-[#666666]">{company}</p>

      {/* Row 4: 요약 */}
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#cccccc]">
        {summary}
      </p>

      {/* Row 5: 태그 + 원문 보기 */}
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-[4px] bg-[#1a1a1a] px-2 py-1 text-xs text-[#666666]">
          {tag}
        </span>
        <a
          href="#"
          className="flex items-center gap-1 text-xs text-[#666666] transition-colors hover:text-[#cccccc]"
        >
          원문 보기
          <IconExternalLink size={12} stroke={1.5} />
        </a>
      </div>
    </article>
  );
}
