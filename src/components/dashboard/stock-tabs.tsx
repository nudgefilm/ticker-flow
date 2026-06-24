"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = ["개요", "공시", "뉴스", "재무"] as const;
type Tab = (typeof TABS)[number];

export default function StockTabs() {
  const [active, setActive] = useState<Tab>("개요");

  return (
    <div className="border-b border-white/[0.08]">
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm transition-colors",
              active === tab
                ? "border-white text-white"
                : "border-transparent text-[#a6a6a6] hover:text-[#cccccc]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
