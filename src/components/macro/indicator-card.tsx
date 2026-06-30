import type { MacroIndicator } from "@/lib/macro";
import { formatMainValue, formatPrevValue, GROUP_COLORS } from "@/lib/macro";
import MiniLineChart from "@/components/macro/mini-line-chart";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function IndicatorCard({
  ind,
  hero = false,
}: {
  ind: MacroIndicator;
  hero?: boolean;
}) {
  const mainVal = formatMainValue(ind);
  const prevVal = formatPrevValue(ind);
  const groupColor = GROUP_COLORS[ind.group] ?? "#a6a6a6";

  let direction: "▲" | "▼" | null = null;
  if (ind.value != null && ind.previousValue != null) {
    if (ind.value > ind.previousValue) direction = "▲";
    else if (ind.value < ind.previousValue) direction = "▼";
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#1a1a1a]"
      style={{ borderTop: `2px solid ${groupColor}` }}
    >
      <div className={`flex flex-col gap-4 p-5 ${hero ? "gap-5" : "gap-4"}`}>
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#cccccc]">{ind.nameEn}</span>
              <span className="text-[10px] text-[#555555]">·</span>
              <span className="text-xs text-[#a6a6a6]">{ind.name}</span>
              {hero && (
                <span
                  className="rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${groupColor}22`, color: groupColor }}
                >
                  핵심지표
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#888888]">{ind.desc}</p>
          </div>
          {ind.source && (
            <span className="shrink-0 rounded-[4px] bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#888888]">
              {ind.source}
            </span>
          )}
        </div>

        {/* 현재값 */}
        <div className="flex items-baseline gap-2">
          <span
            className={`${hero ? "text-3xl md:text-5xl" : "text-2xl"} font-bold tabular-nums leading-none`}
            style={{ color: groupColor }}
          >
            {mainVal}
          </span>
          {direction && (
            <span className={`${hero ? "text-lg" : "text-sm"} text-[#888888]`}>{direction}</span>
          )}
          {ind.valueType === "pct_change" && (
            <span className="text-[10px] text-[#888888]">전월비</span>
          )}
        </div>

        {/* 이전값 + 발표일 */}
        <div className="flex items-center justify-between text-[11px] text-[#888888]">
          <span>이전 {prevVal}</span>
          <span>{fmtDate(ind.releasedAt)}</span>
        </div>
      </div>

      {/* 스파크라인 — 카드 하단 전체 너비 */}
      <div className="mt-auto">
        {ind.history.length > 0 ? (
          <MiniLineChart
            data={ind.history}
            color={groupColor}
            chartId={ind.seriesId}
            height={hero ? 72 : 48}
          />
        ) : (
          <div className={`bg-white/[0.02] ${hero ? "h-[72px]" : "h-12"}`} />
        )}
      </div>
    </div>
  );
}
