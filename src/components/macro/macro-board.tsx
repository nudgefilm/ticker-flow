"use client";

import { useState } from "react";
import type { MacroGroup } from "@/lib/macro";
import IndicatorCard from "@/components/macro/indicator-card";

const ALL = "전체";
const FEATURED_SERIES = "FEDFUNDS"; // 기준금리

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

  // 기준금리 히어로 레이아웃: 전체 탭 or 금리 탭
  const rateGroup = groups.find((g) => g.key === "금리");
  const featuredInd = rateGroup?.indicators.find((i) => i.seriesId === FEATURED_SERIES);
  const showHero = (activeTab === ALL || activeTab === "금리") && !!featuredInd;
  const heroCompanions = rateGroup?.indicators.filter((i) => i.seriesId !== FEATURED_SERIES) ?? [];

  // 히어로 섹션에서 금리 그룹은 별도 렌더링하므로 나머지 그룹만 그리드에 표시
  const gridGroups = showHero
    ? displayed.filter((g) => g.key !== "금리")
    : displayed;

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

      {/* 기준금리 히어로 섹션 */}
      {showHero && featuredInd && (
        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#666666]">
            금리
          </p>
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            {/* 좌측: 기준금리 히어로 */}
            <div className="h-full">
              <IndicatorCard ind={featuredInd} hero />
            </div>
            {/* 우측: 나머지 금리 지표 */}
            {heroCompanions.length > 0 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {heroCompanions.map((ind, i) => {
                  const isLastOdd =
                    i === heroCompanions.length - 1 &&
                    heroCompanions.length % 2 !== 0;
                  return (
                    <div
                      key={ind.seriesId}
                      className={`h-full${isLastOdd ? " md:col-span-2" : ""}`}
                    >
                      <IndicatorCard ind={ind} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 나머지 그룹 */}
      {gridGroups.map((group) => (
        <section key={group.key}>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#666666]">
            {group.label}
          </p>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
            {group.indicators.map((ind, i) => {
              const isLastOdd =
                i === group.indicators.length - 1 &&
                group.indicators.length % 2 !== 0;
              return (
                <div
                  key={ind.seriesId}
                  className={`w-full${isLastOdd ? " md:col-span-2" : ""}`}
                >
                  <IndicatorCard ind={ind} />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
