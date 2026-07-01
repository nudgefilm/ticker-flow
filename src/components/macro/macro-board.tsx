"use client";

import { useState } from "react";
import type { MacroGroup } from "@/lib/macro";
import IndicatorCard from "@/components/macro/indicator-card";

const ALL = "전체";

// 그룹별로 더 크게 강조할 핵심 지표. 2개 이상 지표가 있는 그룹에서만 히어로 레이아웃이 적용됨.
const FEATURED_BY_GROUP: Record<string, string> = {
  금리: "FEDFUNDS",  // 기준금리 — 모든 금리의 기준이 되는 정책금리
  물가: "CPIAUCSL",  // CPI — 가장 널리 참조되는 헤드라인 인플레이션 지표
  고용: "UNRATE",    // 실업률 — 고용시장을 대표하는 지표
  경기: "GDP",       // GDP — 경제 규모를 나타내는 가장 포괄적인 지표
};

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

      {/* 그룹별 지표 — 핵심 지표가 지정된 그룹은 히어로 레이아웃, 그 외는 균등 그리드 */}
      {displayed.map((group) => {
        const featuredSeriesId = FEATURED_BY_GROUP[group.key];
        const featuredInd = featuredSeriesId
          ? group.indicators.find((i) => i.seriesId === featuredSeriesId)
          : undefined;
        const companions = featuredInd
          ? group.indicators.filter((i) => i.seriesId !== featuredSeriesId)
          : [];

        if (featuredInd && companions.length > 0) {
          return (
            <section key={group.key}>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#666666]">
                {group.label}
              </p>
              <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                {/* 좌측: 핵심 지표 히어로 */}
                <div className="h-full">
                  <IndicatorCard ind={featuredInd} hero />
                </div>
                {/* 우측: 나머지 지표 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {companions.map((ind, i) => {
                    const isLastOdd =
                      i === companions.length - 1 && companions.length % 2 !== 0;
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
              </div>
            </section>
          );
        }

        return (
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
        );
      })}
    </div>
  );
}
