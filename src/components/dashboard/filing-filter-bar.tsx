"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const TABS = ["전체", "8-K", "10-K", "10-Q", "Form 4", "기타"] as const;

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

export default function FilingFilterBar() {
  const [activeTab, setActiveTab] = useState<string>("전체");

  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-0 sm:flex-row sm:items-center sm:justify-between">
      {/* 탭 */}
      <div className="flex items-center">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "border-b-2 px-3 pb-3 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-white text-white"
                : "border-transparent text-[#a6a6a6] hover:text-[#cccccc]"
            )}
          >
            {tab}
          </button>
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
