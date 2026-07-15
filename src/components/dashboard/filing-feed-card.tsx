import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { TickerBadges } from "@/components/dashboard/ticker-badge";
import type { TickerBadgeReason } from "@/lib/collect/target-tickers";

export interface Filing {
  id: string;
  ticker: string;
  form_type: string;
  title: string | null;
  summary_kr: string | null;
  filed_at: string;
  url: string | null;
}

type BadgeColor = "blue" | "green" | "amber";

const badgeStyles: Record<BadgeColor, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function getBadge(formType: string): { color: BadgeColor; label: string } {
  switch (formType) {
    case "8-K":    return { color: "blue",  label: "8-K 주요이벤트" };
    case "10-K":   return { color: "green", label: "10-K 연간보고서" };
    case "10-Q":   return { color: "green", label: "10-Q 분기보고서" };
    case "S-1":    return { color: "green", label: "S-1 신규상장" };
    case "4":      return { color: "amber", label: "Form 4 내부자거래" };
    case "DEF 14A":
    case "DEF14A": return { color: "amber", label: "위임장" };
    default:       return { color: "blue",  label: formType };
  }
}

function formatFiledAt(filedAt: string): string {
  const filed = new Date(filedAt);
  const now = new Date();
  const filedDay = new Date(filed.getFullYear(), filed.getMonth(), filed.getDate());
  const nowDay   = new Date(now.getFullYear(),   now.getMonth(),   now.getDate());
  const diffDays = Math.floor((nowDay.getTime() - filedDay.getTime()) / 86_400_000);

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7)  return `${diffDays}일 전`;
  return `${filed.getMonth() + 1}월 ${filed.getDate()}일`;
}

export default function FilingFeedCard({
  filing,
  badges,
  className,
}: {
  filing: Filing;
  badges?: TickerBadgeReason[];
  className?: string;
}) {
  const { ticker, form_type, title, summary_kr, filed_at, url } = filing;
  const { color, label } = getBadge(form_type);
  const content = summary_kr ?? title ?? "";

  return (
    <article className={cn("mb-4 break-inside-avoid rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-5", className)}>
      {/* Row 1: 배지 + 티커 + 날짜 + SEC 링크 */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
            badgeStyles[color]
          )}
        >
          {label}
        </span>
        <Link href={`/stocks/${ticker}`} className="text-sm font-medium text-white">
          {ticker}
        </Link>
        <TickerBadges reasons={badges} />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-[#a6a6a6]">{formatFiledAt(filed_at)}</span>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
            >
              SEC 원문
              <IconExternalLink size={12} stroke={1.5} />
            </a>
          )}
        </div>
      </div>

      {/* Row 2: 요약 (summary_kr 없으면 title) */}
      {content && (
        <p className="mt-3 text-sm leading-relaxed text-[#cccccc]">{content}</p>
      )}
    </article>
  );
}
