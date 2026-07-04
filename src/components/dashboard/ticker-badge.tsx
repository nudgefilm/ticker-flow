import type { TickerBadgeReason } from "@/lib/collect/target-tickers";
import { cn } from "@/lib/utils";

const BADGE_CONFIG: Record<TickerBadgeReason, { label: string; color: string }> = {
  top30:  { label: "TOP30 선정", color: "#f97316" },
  volume: { label: "거래량 상위", color: "#fbbf24" },
  sector: { label: "섹터 주목",   color: "#a78bfa" },
};

export function TickerBadges({
  reasons,
  className,
}: {
  reasons?: TickerBadgeReason[];
  className?: string;
}) {
  if (!reasons || reasons.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {reasons.map((reason) => {
        const { label, color } = BADGE_CONFIG[reason];
        return (
          <span
            key={reason}
            className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${color}26`, color }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
