"use client";

import { useState } from "react";
import type { MacroGroup } from "@/lib/macro";
import IndicatorCard from "@/components/macro/indicator-card";

const ALL = "전체";

export default function MacroBoard({
  groups,
  referenceDate,
}: {
  groups: MacroGroup[];
  referenceDate: string;
}) {
  const [activeTab, setActiveTab] = useState(ALL);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-sm text-[#a6a6a6]">수집된 경제지표 데이터가 없습니다.</p>
        <p className="text-xs text-[#555555]">어드민에서 경제지표 갱신을 실행해 주세요.</p>
      </div>
    );
  }

  const tabKeys = [ALL, ...groups.map((g) => g.label)];
  const displayed =
    activeTab === ALL ? groups : groups.filter((g) => g.label === activeTab);

  return (
    <div className="space-y-6">
      {/* 기준일 + 탭 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#666666]">
          데이터 기준일: <span className="text-[#a6a6a6]">{referenceDate}</span>
        </p>
        <div className="flex items-center rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] p-0.5">
          {tabKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === key
                  ? "bg-white/[0.10] text-white"
                  : "text-[#a6a6a6] hover:text-white"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* 그룹별 카드 그리드 */}
      {displayed.map((group) => (
        <section key={group.key}>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#666666]">
            {group.label}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.indicators.map((ind) => (
              <IndicatorCard key={ind.seriesId} ind={ind} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
