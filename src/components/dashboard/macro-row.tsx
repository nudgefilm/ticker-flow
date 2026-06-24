import { IconClock } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface MacroIndicator {
  importance: "상" | "중" | "하";
  name: string;
  nameEn: string;
  release: string;
  forecast?: string;
  previous?: string;
  actual?: string;
  actualVariant?: "beat" | "miss" | "pending";
}

const IMPORTANCE_STYLES: Record<MacroIndicator["importance"], string> = {
  상: "bg-red-500/10 text-red-400 border-red-500/20",
  중: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  하: "bg-white/10 text-white/60 border-white/20",
};

const ACTUAL_COLOR: Record<"beat" | "miss" | "pending", string> = {
  beat: "text-green-400",
  miss: "text-red-400",
  pending: "text-[#444444]",
};

export default function MacroRow({
  macro,
  compact = false,
}: {
  macro: MacroIndicator;
  compact?: boolean;
}) {
  const { importance, name, nameEn, release, forecast, previous, actual, actualVariant } = macro;

  const isReleased = actualVariant === "beat" || actualVariant === "miss";
  const actualDisplay = actualVariant === "pending" || !actual ? "—" : actual;
  const actualColor = actualVariant ? ACTUAL_COLOR[actualVariant] : "text-[#444444]";

  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      {/* 좌: 중요도 배지 + 지표명 */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
            IMPORTANCE_STYLES[importance]
          )}
        >
          {importance}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="truncate text-xs text-[#a6a6a6]">{nameEn}</p>
        </div>
      </div>

      {/* 중: 발표시각 + 상태 배지 */}
      <div className="flex items-center gap-2 text-sm">
        <IconClock size={14} stroke={1.5} className="shrink-0 text-[#a6a6a6]" />
        <span className="tabular-nums text-[#cccccc]">{release}</span>
        <span
          className={cn(
            "inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium",
            isReleased
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-white/10 text-white/60 border-white/20"
          )}
        >
          {isReleased ? "발표완료" : "예정"}
        </span>
      </div>

      {/* 우: 예상 / 이전 / 실제 */}
      {!compact && (
        <div className="flex items-center gap-4">
          {forecast !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#a6a6a6]">예상</span>
              <span className="text-sm tabular-nums text-[#cccccc]">{forecast}</span>
            </div>
          )}
          {previous !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#a6a6a6]">이전</span>
              <span className="text-sm tabular-nums text-[#cccccc]">{previous}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#a6a6a6]">실제</span>
            <span className={cn("text-sm tabular-nums", actualColor)}>{actualDisplay}</span>
          </div>
        </div>
      )}
    </div>
  );
}
