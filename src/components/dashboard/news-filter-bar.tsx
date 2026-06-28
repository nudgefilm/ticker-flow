"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const TABS = ["전체", "가이던스 변경", "CEO·임원", "대규모 계약", "M&A", "규제 이슈", "신제품"] as const;
type Tab = (typeof TABS)[number];

export default function NewsFilterBar() {
  const [activeTab, setActiveTab] = useState<Tab>("전체");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              activeTab === tab
                ? "border-white text-white"
                : "border-transparent text-[#a6a6a6] hover:text-[#cccccc]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#262626]"
        >
          모든 종목
          <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#262626]"
        >
          오늘
          <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
        </button>
      </div>
    </div>
  );
}
