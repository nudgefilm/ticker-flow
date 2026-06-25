"use client";

import { useRouter } from "next/navigation";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const TABS: { label: string; value: string; tooltip: string | null }[] = [
  { label: "전체",   value: "",      tooltip: null },
  { label: "8-K",   value: "8-K",   tooltip: "주요 경영 이벤트 공시 — CEO 교체, M&A, 계약 등" },
  { label: "10-K",  value: "10-K",  tooltip: "연간 실적 보고서 — 매년 1회 제출" },
  { label: "10-Q",  value: "10-Q",  tooltip: "분기 실적 보고서 — 분기별 3회 제출" },
  { label: "Form 4", value: "4",    tooltip: "내부자 거래 공시 — 임원·대주주 매수/매도" },
  { label: "기타",   value: "other", tooltip: null },
];

function FilterDropdown({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
    >
      {label}
      <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
    </button>
  );
}

export default function FilingFilterBar({ activeType = "" }: { activeType?: string }) {
  const router = useRouter();

  function handleTab(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("type", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-0 sm:flex-row sm:items-center sm:justify-between">
      {/* 탭 */}
      <div className="flex items-center">
        {TABS.map((tab) => (
          <div key={tab.label} className="group/tab relative">
            <button
              type="button"
              onClick={() => handleTab(tab.value)}
              className={cn(
                "border-b-2 px-3 pb-3 text-sm font-medium transition-colors",
                activeType === tab.value
                  ? "border-white text-white"
                  : "border-transparent text-[#a6a6a6] hover:text-[#cccccc]"
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

      {/* 드롭다운 */}
      <div className="flex items-center gap-2 pb-3">
        <FilterDropdown label="모든 종목" />
        <FilterDropdown label="오늘" />
      </div>
    </div>
  );
}
