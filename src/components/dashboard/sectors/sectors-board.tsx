"use client";

import { useMemo, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import SectorTreemap from "@/components/dashboard/sector-treemap";
import {
  getSectorStats,
  PERIOD_LABELS,
  SECTOR_LAST_UPDATED,
  type SectorPeriod,
} from "@/lib/mock/sectors";

const PERIODS: SectorPeriod[] = ["7d", "30d", "90d"];

export default function SectorsBoard() {
  const [period, setPeriod] = useState<SectorPeriod>("30d");

  const sectors = useMemo(() => getSectorStats(period), [period]);
  const maxScore = sectors.length > 0 ? sectors[0].activityScore : 1;
  const top3 = sectors.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      {/* 설명 + 기간 선택 + 범례 */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-[#a6a6a6]">
          공시와 뉴스 활동량을 기반으로 최근 기업 활동 현황을 섹터별로 제공합니다.
        </p>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          {/* 기간 세그먼트 */}
          <div className="inline-flex rounded-[6px] border border-white/[0.08] bg-[#111111] p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-white/[0.1] text-white"
                    : "text-[#a6a6a6] hover:text-white"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-3">
            {[
              { label: "활동 활발", o: 0.4 },
              { label: "보통", o: 0.22 },
              { label: "적음", o: 0.1 },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-[2px]"
                  style={{ background: `rgba(96,165,250,${l.o})` }}
                />
                <span className="text-xs text-[#cccccc]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 최근 활동 많은 섹터 (Top 3) */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-white">최근 활동 많은 섹터</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {top3.map((s, i) => (
            <div
              key={s.sector}
              className="relative overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#1c1c1c] p-5"
            >
              {/* 활동량 비례 배경 바 */}
              <div
                className="absolute inset-y-0 left-0 bg-[#60a5fa]/[0.08]"
                style={{ width: `${(s.activityScore / maxScore) * 100}%` }}
                aria-hidden
              />
              <div className="relative flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">{s.sectorKr}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-[#cccccc]">
                    {i + 1}
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  <div>
                    <p className="text-xs text-[#a6a6a6]">공시</p>
                    <p className="text-lg font-semibold tabular-nums text-white">
                      {s.filingCount}
                      <span className="ml-0.5 text-xs font-normal text-[#a6a6a6]">건</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#a6a6a6]">뉴스</p>
                    <p className="text-lg font-semibold tabular-nums text-white">
                      {s.newsCount}
                      <span className="ml-0.5 text-xs font-normal text-[#a6a6a6]">건</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 메인 트리맵 */}
      <section className="rounded-[8px] border border-white/[0.08] bg-[#111111] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white">섹터별 활동 현황</h2>
          <p className="text-xs text-[#a6a6a6]">
            사각형 크기 = 활동 점수 · 색상 진하기 = 활동량
          </p>
        </div>
        <SectorTreemap sectors={sectors} />
      </section>

      {/* 섹터 요약 테이블 */}
      <section className="overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#111111]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                섹터
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                모니터링 종목
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                공시
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                뉴스
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
                <span className="inline-flex items-center justify-end gap-1">
                  활동 점수
                  <span className="group relative inline-flex">
                    <IconInfoCircle className="h-3.5 w-3.5 cursor-help text-[#6f6f6f]" />
                    <span className="pointer-events-none absolute right-0 top-5 z-20 hidden w-max max-w-[220px] rounded-[6px] border border-white/[0.12] bg-[#1a1a1a] px-3 py-2 text-left text-[11px] font-normal normal-case tracking-normal text-[#cccccc] shadow-lg group-hover:block">
                      활동 점수 = 공시 건수 × 2 + 뉴스 건수
                    </span>
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
              <tr
                key={s.sector}
                className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.04]"
              >
                <td className="px-5 py-3 font-medium text-white">{s.sectorKr}</td>
                <td className="px-5 py-3 text-right tabular-nums text-[#a6a6a6]">
                  {s.tickerCount}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-[#a6a6a6]">
                  {s.filingCount}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-[#a6a6a6]">
                  {s.newsCount}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className="block h-full rounded-full bg-[#60a5fa]"
                        style={{ width: `${(s.activityScore / maxScore) * 100}%` }}
                      />
                    </span>
                    <span className="w-10 text-right tabular-nums font-medium text-[#cccccc]">
                      {s.activityScore}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 최근 주요 키워드 */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-white">최근 주요 키워드</h2>
        <p className="mb-4 text-xs text-[#a6a6a6]">
          공시·뉴스에서 최근 많이 등장한 키워드 빈도 기준입니다.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => (
            <div
              key={s.sector}
              className="rounded-[8px] border border-white/[0.08] bg-[#111111] p-4"
            >
              <p className="mb-3 text-sm font-medium text-white">{s.sectorKr}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-[#cccccc]"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 마지막 업데이트 */}
      <p className="text-right text-xs text-[#6f6f6f]">
        마지막 업데이트 · {SECTOR_LAST_UPDATED}
      </p>
    </div>
  );
}
