"use client";

import { useState, useEffect } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import type { SectorStat, SectorPeriod } from "@/lib/sectors";
import { SECTOR_COLORS, PERIOD_LABELS, hexToRgba } from "@/lib/sectors";
import SectorTreemap from "@/components/sectors/sector-treemap";

const PERIOD_OPTIONS: { label: string; value: SectorPeriod }[] = [
  { label: "7일", value: "7d" },
  { label: "30일", value: "30d" },
  { label: "90일", value: "90d" },
];

export default function SectorsBoard() {
  const [period, setPeriod] = useState<SectorPeriod>("30d");
  const [sectors, setSectors] = useState<SectorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sectors?period=${period}`)
      .then((r) => r.json())
      .then((data: SectorStat[]) => {
        setSectors(data);
        setUpdatedAt(
          new Date().toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  const maxScore = sectors[0]?.activityScore || 1;
  const top3 = sectors.slice(0, 3);

  if (loading && sectors.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-[#a6a6a6]">데이터를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ① 상단 바: 설명 + 기간 세그먼트 + 색상 범례 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#a6a6a6]">
          나스닥 주요 섹터별 공시·뉴스 활동량을 기간별로 시각화합니다.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {/* 기간 세그먼트 */}
          <div className="flex items-center rounded-[6px] border border-white/[0.08] bg-[#111111] p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-[4px] px-3 py-1 text-xs font-medium transition-colors ${
                  period === opt.value
                    ? "bg-white/[0.10] text-white"
                    : "text-[#a6a6a6] hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* 색상 범례 */}
          <div className="flex items-center gap-3">
            {[
              { label: "활발", opacity: 0.4 },
              { label: "보통", opacity: 0.22 },
              { label: "적음", opacity: 0.1 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded-[2px]"
                  style={{ background: hexToRgba("#60a5fa", item.opacity) }}
                />
                <span className="text-xs text-[#a6a6a6]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ② 활동 많은 섹터 Top 3 카드 */}
      {top3.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium text-[#a6a6a6]">
            {PERIOD_LABELS[period]} 활동 많은 섹터
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {top3.map((s, i) => {
              const color =
                SECTOR_COLORS[s.sector] ?? SECTOR_COLORS[s.sectorKr] ?? "#6b7280";
              const barWidth = ((s.activityScore / maxScore) * 100).toFixed(1);
              return (
                <div
                  key={s.sector}
                  className="relative overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#1c1c1c] p-4"
                >
                  {/* 활동 점수 비례 배경 바 */}
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${barWidth}%`,
                      background: hexToRgba("#60a5fa", 0.08),
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-[4px] text-[10px] font-bold text-white"
                        style={{ background: hexToRgba(color, 0.3) }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {s.sectorKr}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-[#6f6f6f]">종목</p>
                        <p className="text-sm font-medium tabular-nums text-[#cccccc]">
                          {s.tickerCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#6f6f6f]">공시</p>
                        <p className="text-sm font-medium tabular-nums text-[#cccccc]">
                          {s.filingCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#6f6f6f]">뉴스</p>
                        <p className="text-sm font-medium tabular-nums text-[#cccccc]">
                          {s.newsCount}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{ color }}
                      >
                        {s.activityScore}
                      </span>
                      <span className="text-[10px] text-[#6f6f6f]">활동 점수</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ③ 메인 트리맵 패널 */}
      <div className="rounded-[8px] border border-white/[0.08] bg-[#111111] p-6">
        <div className="mb-1">
          <h2 className="text-sm font-medium text-[#cccccc]">섹터 활동 트리맵</h2>
        </div>
        <p className="mb-4 text-xs text-[#6f6f6f]">
          사각형 크기 = 활동 점수 · 색상 진하기 = 활동량
        </p>
        <SectorTreemap sectors={sectors} />
      </div>

      {/* ④ 섹터 요약 테이블 */}
      <div className="overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#111111]">
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
                <div className="relative inline-flex items-center gap-1">
                  활동 점수
                  <button
                    onMouseEnter={() => setShowScoreTooltip(true)}
                    onMouseLeave={() => setShowScoreTooltip(false)}
                    className="text-[#6f6f6f] transition-colors hover:text-[#a6a6a6]"
                    aria-label="활동 점수 설명"
                  >
                    <IconInfoCircle size={12} stroke={1.5} />
                  </button>
                  {showScoreTooltip && (
                    <div className="absolute bottom-full right-0 z-20 mb-2 w-52 rounded-[6px] border border-white/[0.12] bg-[#1a1a1a] px-3 py-2 text-left text-[11px] font-normal normal-case tracking-normal text-[#cccccc] shadow-lg">
                      활동 점수 = 공시 건수 × 2 + 뉴스 건수
                    </div>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#a6a6a6]">
                  섹터 데이터를 수집 중입니다.
                </td>
              </tr>
            ) : (
              sectors.map((s) => {
                const gaugeWidth = ((s.activityScore / maxScore) * 100).toFixed(1);
                return (
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
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-[#60a5fa]"
                            style={{ width: `${gaugeWidth}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs font-medium tabular-nums text-[#cccccc]">
                          {s.activityScore}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ⑤ 섹터별 주요 키워드 */}
      {sectors.some((s) => s.keywords.length > 0) && (
        <div>
          <p className="mb-3 text-xs font-medium text-[#a6a6a6]">섹터별 주요 키워드</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s) => {
              if (s.keywords.length === 0) return null;
              const color =
                SECTOR_COLORS[s.sector] ?? SECTOR_COLORS[s.sectorKr] ?? "#6b7280";
              return (
                <div
                  key={s.sector}
                  className="rounded-[8px] border border-white/[0.08] bg-[#1c1c1c] p-4"
                >
                  <p className="mb-2 text-xs font-medium" style={{ color }}>
                    {s.sectorKr}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-[4px] bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#a6a6a6]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ⑥ 마지막 업데이트 */}
      {updatedAt && (
        <p className="text-right text-xs text-[#6f6f6f]">
          마지막 업데이트: {updatedAt}
        </p>
      )}
    </div>
  );
}
