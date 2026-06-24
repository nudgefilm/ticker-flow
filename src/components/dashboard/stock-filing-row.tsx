import { IconExternalLink } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface StockFiling {
  badgeColor: "blue" | "green" | "amber";
  badgeLabel: string;
  type: string;
  time: string;
}

const BADGE_STYLES: Record<StockFiling["badgeColor"], string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function StockFilingRow({ filing }: { filing: StockFiling }) {
  const { badgeColor, badgeLabel, type, time } = filing;

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "shrink-0 rounded-[4px] border px-2 py-0.5 text-xs font-medium",
          BADGE_STYLES[badgeColor]
        )}
      >
        {badgeLabel}
      </span>
      <span className="text-sm text-[#cccccc]">{type}</span>
      <span className="text-xs text-[#a6a6a6]">{time}</span>
      <a
        href="#"
        className="ml-auto flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
      >
        SEC 원문
        <IconExternalLink size={12} stroke={1.5} />
      </a>
    </div>
  );
}
