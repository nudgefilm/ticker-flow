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
  const [scoreTooltip, setScoreTooltip] = useState(false);

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
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-[12px] border border-white/[0.08] bg-[#1a1a1a]" />
        ))}
      </div>
    );
  }

  if (sectors.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-sm text-[#a6a6a6]">섹터 데이터를 수집 중입니다.</p>
        <p className="text-xs text-[#555555]">어드민에서 데이터 갱신을 실행해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── 헤더: 설명 + 기간 필터 ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#a6a6a6]">
            나스닥 주요 섹터별 공시·뉴스 활동량을 기간별로 시각화합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 색상 범례 */}
          <div className="hidden items-center gap-3 sm:flex">
            {[
              { label: "활발", opacity: 0.45 },
              { label: "보통", opacity: 0.25 },
              { label: "적음", opacity: 0.12 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-[2px]"
                  style={{ background: hexToRgba("#60a5fa", item.opacity) }}
                />
                <span className="text-xs text-[#7a7a7a]">{item.label}</span>
              </div>
            ))}
          </div>
          {/* 기간 세그먼트 */}
          <div className="flex items-center rounded-[8px] border border-white/[0.08] bg-[#1a1a1a] p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={`rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === opt.value
                    ? "bg-white/[0.10] text-white"
                    : "text-[#a6a6a6] hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top 3 섹터 카드 ── */}
      {top3.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium text-[#7a7a7a] uppercase tracking-wider">
            {PERIOD_LABELS[period]} 활동 많은 섹터
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {top3.map((s, i) => {
              const color = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS[s.sectorKr] ?? "#6b7280";
              const barWidth = ((s.activityScore / maxScore) * 100).toFixed(1);
              return (
                <div
                  key={s.sector}
                  className="relative overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#1a1a1a]"
                  style={{ borderTop: `2px solid ${hexToRgba(color, 0.6)}` }}
                >
                  {/* 배경 게이지 바 */}
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${barWidth}%`, background: hexToRgba(color, 0.05) }}
                  />
                  <div className="relative p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[11px] font-bold text-white"
                          style={{ background: hexToRgba(color, 0.35) }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-white">{s.sectorKr}</span>
                      </div>
                      <span
                        className="text-xl font-bold tabular-nums"
                        style={{ color }}
                      >
                        {s.activityScore}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: "종목", value: s.tickerCount },
                        { label: "공시", value: s.filingCount },
                        { label: "뉴스", value: s.newsCount },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-[6px] bg-white/[0.03] px-2 py-2">
                          <p className="text-[10px] text-[#666666]">{label}</p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#cccccc]">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 트리맵 ── */}
      <div className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#cccccc]">섹터 활동 트리맵</h2>
            <p className="mt-0.5 text-xs text-[#666666]">사각형 크기 = 활동 점수 · 색상 진하기 = 활동량</p>
          </div>
        </div>
        <div className="p-4">
          <SectorTreemap sectors={sectors} />
        </div>
      </div>

      {/* ── 섹터 요약 테이블 ── */}
      <div className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#1a1a1a]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["섹터", "종목", "공시", "뉴스"].map((h) => (
                <th
                  key={h}
                  className={`px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-[#7a7a7a] ${
                    h === "섹터" ? "text-left" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
              <th className="px-5 py-3.5 text-right">
                <div className="relative inline-flex items-center justify-end gap-1 text-xs font-medium uppercase tracking-wider text-[#7a7a7a]">
                  활동 점수
                  <button
                    onMouseEnter={() => setScoreTooltip(true)}
                    onMouseLeave={() => setScoreTooltip(false)}
                    className="text-[#555555] transition-colors hover:text-[#a6a6a6]"
                  >
                    <IconInfoCircle size={12} stroke={1.5} />
                  </button>
                  {scoreTooltip && (
                    <div className="absolute bottom-full right-0 z-20 mb-2 w-52 rounded-[8px] border border-white/[0.12] bg-[#1a1a1a] px-3 py-2 text-left text-[11px] font-normal normal-case tracking-normal text-[#cccccc] shadow-lg">
                      활동 점수 = 공시 × 2 + 뉴스
                    </div>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s, idx) => {
              const color = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS[s.sectorKr] ?? "#6b7280";
              const gaugeWidth = ((s.activityScore / maxScore) * 100).toFixed(1);
              return (
                <tr
                  key={s.sector}
                  className={`border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.03] ${
                    idx < 3 ? "bg-white/[0.015]" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-sm font-medium text-white">{s.sectorKr}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-sm text-[#a6a6a6]">{s.tickerCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-sm text-[#a6a6a6]">{s.filingCount}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-sm text-[#a6a6a6]">{s.newsCount}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${gaugeWidth}%`, background: color }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-semibold tabular-nums text-[#cccccc]">
                        {s.activityScore}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 키워드 카드 ── */}
      {sectors.some((s) => s.keywords.length > 0) && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#7a7a7a]">섹터별 주요 키워드</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.filter((s) => s.keywords.length > 0).map((s) => {
              const color = SECTOR_COLORS[s.sector] ?? SECTOR_COLORS[s.sectorKr] ?? "#6b7280";
              return (
                <div
                  key={s.sector}
                  className="rounded-[12px] border border-white/[0.08] bg-[#1a1a1a] p-4"
                  style={{ borderLeft: `2px solid ${hexToRgba(color, 0.5)}` }}
                >
                  <p className="mb-3 text-xs font-semibold" style={{ color }}>
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

      {/* ── 업데이트 시각 ── */}
      {updatedAt && (
        <p className="text-right text-xs text-[#555555]">마지막 업데이트: {updatedAt}</p>
      )}
    </div>
  );
}
