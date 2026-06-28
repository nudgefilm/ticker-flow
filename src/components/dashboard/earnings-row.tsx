import Link from "next/link";
import { IconClock } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface Earnings {
  dday: string;
  ddayVariant: "near" | "far" | "done";
  ticker: string;
  company: string;
  session: string;
  time?: string;
  epsLabel: string;
  eps: string;
  revenueLabel?: string;
  revenue?: string;
  beat?: string;
  resultTag?: string;
}

const DDAY_STYLES: Record<Earnings["ddayVariant"], string> = {
  near: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  far: "bg-white/10 text-white/60 border-white/20",
  done: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function EarningsRow({
  earnings,
  compact = false,
}: {
  earnings: Earnings;
  compact?: boolean;
}) {
  const {
    dday,
    ddayVariant,
    ticker,
    company,
    session,
    time,
    epsLabel,
    eps,
    revenueLabel,
    revenue,
    beat,
    resultTag,
  } = earnings;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[6px] border bg-[#1a1a1a] px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        ddayVariant === "done" ? "border-green-500/30" : "border-white/[0.08]"
      )}
    >
      {/* 좌: D-Day 배지 + 회사명 + 티커 */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
            DDAY_STYLES[ddayVariant]
          )}
        >
          {dday}
        </span>
        <span className="text-sm font-medium text-white">{company}</span>
        <Link href={`/stocks/${ticker}`} className="rounded-[4px] bg-[#262626] px-1.5 py-0.5 text-xs text-[#cccccc]">
          {ticker}
        </Link>
      </div>

      {/* 중: 세션 + 시각 */}
      <div className="flex items-center gap-1.5 text-sm text-[#a6a6a6]">
        <IconClock size={14} stroke={1.5} />
        <span>{session}</span>
        {!compact && time && (
          <>
            <span>·</span>
            <span>{time}</span>
          </>
        )}
      </div>

      {/* 우: EPS + 매출 + 태그 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#a6a6a6]">{epsLabel}</span>
          <span className="text-sm tabular-nums text-[#cccccc]">{eps}</span>
        </div>

        {!compact && revenueLabel && revenue && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#a6a6a6]">{revenueLabel}</span>
            <span className="text-sm tabular-nums text-[#cccccc]">{revenue}</span>
          </div>
        )}

        {beat && (
          <span className="rounded-[4px] border border-green-500/30 px-1.5 py-0.5 text-xs text-green-400">
            {beat}
          </span>
        )}

        {resultTag && (
          <span className="rounded-[4px] border border-green-500/30 px-1.5 py-0.5 text-xs text-green-400">
            {resultTag}
          </span>
        )}
      </div>
    </div>
  );
}
