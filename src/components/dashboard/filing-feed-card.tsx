import { IconExternalLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface Filing {
  badgeColor: "blue" | "green" | "amber";
  badgeLabel: string;
  company: string;
  time: string;
  summary: string;
  keyNumbers: string;
}

const badgeStyles: Record<Filing["badgeColor"], string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function FilingFeedCard({ filing }: { filing: Filing }) {
  const { badgeColor, badgeLabel, company, time, summary, keyNumbers } = filing;

  return (
    <article className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      {/* Row 1: 배지 + 회사명 + 시각 + SEC 링크 */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
            badgeStyles[badgeColor]
          )}
        >
          {badgeLabel}
        </span>
        <span className="text-sm font-medium text-white">{company}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-[#a6a6a6]">{time}</span>
          <a
            href="#"
            className="flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
          >
            SEC 원문
            <IconExternalLink size={12} stroke={1.5} />
          </a>
        </div>
      </div>

      {/* Row 2: 요약 */}
      <p className="mt-3 text-sm leading-relaxed text-[#cccccc]">{summary}</p>

      {/* Row 3: 핵심 수치 */}
      <div className="mt-3 rounded-[4px] bg-[#1a1a1a] px-3 py-2 text-sm tabular-nums text-white">
        {keyNumbers}
      </div>
    </article>
  );
}
