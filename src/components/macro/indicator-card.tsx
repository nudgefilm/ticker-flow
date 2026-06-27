import type { MacroIndicator } from "@/lib/macro";
import { formatMainValue, formatPrevValue } from "@/lib/macro";
import MiniLineChart from "@/components/macro/mini-line-chart";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function IndicatorCard({ ind }: { ind: MacroIndicator }) {
  const mainVal = formatMainValue(ind);
  const prevVal = formatPrevValue(ind);

  let direction: "▲" | "▼" | null = null;
  if (ind.value != null && ind.previousValue != null) {
    if (ind.value > ind.previousValue) direction = "▲";
    else if (ind.value < ind.previousValue) direction = "▼";
  }

  const isPctChange = ind.valueType === "pct_change";

  return (
    <div className="flex flex-col gap-4 rounded-[8px] border border-white/[0.08] bg-[#111111] p-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[#cccccc]">{ind.nameEn}</span>
            <span className="text-[10px] text-[#555555]">·</span>
            <span className="text-xs text-[#a6a6a6]">{ind.name}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-[#666666]">{ind.desc}</p>
        </div>
        {ind.source && (
          <span className="shrink-0 rounded-[4px] bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#666666]">
            {ind.source}
          </span>
        )}
      </div>

      {/* 현재값 */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums leading-none text-white">
          {mainVal}
        </span>
        {direction && (
          <span className="text-sm text-[#666666]">{direction}</span>
        )}
        {isPctChange && (
          <span className="text-[10px] text-[#555555]">전월비</span>
        )}
      </div>

      {/* 스파크라인 */}
      {ind.history.length >= 2 ? (
        <div className="-mx-1">
          <MiniLineChart data={ind.history} height={44} />
        </div>
      ) : (
        <div className="h-11 rounded-[4px] bg-white/[0.03]" />
      )}

      {/* 이전값 + 발표일 */}
      <div className="flex items-center justify-between text-[11px] text-[#666666]">
        <span>이전 {prevVal}</span>
        <span>{fmtDate(ind.releasedAt)}</span>
      </div>
    </div>
  );
}
