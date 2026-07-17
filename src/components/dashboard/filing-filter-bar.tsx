"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS: { label: string; value: string; tooltip: string | null }[] = [
  { label: "전체",    value: "all",    tooltip: null },
  { label: "8-K",    value: "8k",     tooltip: "주요 경영 이벤트 공시 — CEO 교체, M&A, 계약 등" },
  { label: "10-K",   value: "10k",    tooltip: "연간 실적 보고서 — 매년 1회 제출" },
  { label: "10-Q",   value: "10q",    tooltip: "분기 실적 보고서 — 분기별 3회 제출" },
  { label: "Form 4", value: "form4",  tooltip: "내부자 거래 공시 — 임원·대주주 매수/매도" },
  { label: "기타",   value: "other",  tooltip: null },
];

export default function FilingFilterBar({ currentType = "all" }: { currentType?: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-3 sm:flex-row sm:items-center sm:justify-between">
      {/* 탭 */}
      <div className="flex items-center gap-0.5">
        {TABS.map((tab) => (
          <div key={tab.value} className="group/tab relative">
            <button
              type="button"
              onClick={() =>
                router.push(
                  tab.value === "all" ? "/dashboard" : `/dashboard?type=${tab.value}`
                )
              }
              className={cn(
                "rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors",
                currentType === tab.value
                  ? "bg-white text-black"
                  : "text-[#a6a6a6] hover:text-white"
              )}
            >
              {tab.label}
            </button>
            {tab.tooltip && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-[#cccccc] opacity-0 transition-opacity group-hover/tab:opacity-100">
                {tab.tooltip}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
