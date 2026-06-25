import { cn } from "@/lib/utils";

type BadgeColor = "blue" | "green" | "amber";

const badgeStyles: Record<BadgeColor, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

interface FilingBadgeProps {
  color: BadgeColor;
  label: string;
  className?: string;
}

export function FilingBadge({ color, label, className }: FilingBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
        badgeStyles[color],
        className
      )}
    >
      {label}
    </span>
  );
}

interface FilingCardProps {
  badgeColor: BadgeColor;
  badgeLabel: string;
  company: string;
  event?: string;
  summary: string;
  keyNumbers?: string;
  time: string;
  url?: string;
}

export default function FilingCard({
  badgeColor,
  badgeLabel,
  company,
  event,
  summary,
  keyNumbers,
  time,
  url,
}: FilingCardProps) {
  return (
    <div className="flex flex-col space-y-3 rounded-lg border border-border bg-card p-5">
      {/* 배지 + 시각 */}
      <div className="flex items-center justify-between">
        <FilingBadge color={badgeColor} label={badgeLabel} />
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>

      {/* 회사 / 이벤트 */}
      <div>
        {event ? (
          <>
            <p className="text-base font-semibold text-foreground">{event}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{company}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-foreground">{company}</p>
        )}
      </div>

      {/* 요약 */}
      <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>

      {/* 핵심 수치 (선택) */}
      {keyNumbers && (
        <div className="rounded border border-border bg-secondary/50 px-3 py-2 text-sm tabular-nums text-foreground">
          {keyNumbers}
        </div>
      )}

      {/* SEC 원문 링크 */}
      <div className="mt-auto flex justify-end">
        <a
          href={url ?? "#"}
          target={url ? "_blank" : undefined}
          rel={url ? "noopener noreferrer" : undefined}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          SEC 원문 →
        </a>
      </div>
    </div>
  );
}
