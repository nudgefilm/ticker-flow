"use client";

import { useMemo, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDatabase,
} from "@tabler/icons-react";
import EarningsCallCard from "./earnings-call-card";
import {
  MOCK_EARNINGS_CALLS,
  CALLS_LAST_UPDATED,
  type EarningsCall,
  type GuidanceDirection,
} from "@/lib/mock/earnings-calls";

const PAGE_SIZE = 3;

type PeriodFilter = "all" | "1m" | "3m";
type GuidanceFilter = "all" | GuidanceDirection;

const PERIOD_OPTIONS: { label: string; value: PeriodFilter }[] = [
  { label: "전체", value: "all" },
  { label: "최근 1개월", value: "1m" },
  { label: "최근 3개월", value: "3m" },
];

const GUIDANCE_OPTIONS: { label: string; value: GuidanceFilter }[] = [
  { label: "전체", value: "all" },
  { label: "상향", value: "up" },
  { label: "유지", value: "maintain" },
  { label: "하향", value: "down" },
];

// 상대시간/날짜 기준 기간 필터 — call_date 기준 일수 계산
function daysSince(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((today.getTime() - d.getTime()) / 86_400_000);
}

// ─── 필터 그룹 (세그먼트 버튼) ───────────────────────────────────────────────

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">{label}</span>
      <div className="flex items-center rounded-[6px] border border-white/[0.08] bg-[#111111] p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-[4px] px-2.5 py-1 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-[#1a1a1a] text-white"
                : "text-[#a6a6a6] hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 토글 스위치 ──────────────────────────────────────────────────────────────

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">내 종목만</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex items-center gap-2 rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-1.5 transition-colors hover:bg-[#1a1a1a]"
      >
        <span
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
            checked ? "bg-[#3b82f6]" : "bg-white/[0.15]"
          }`}
        >
          <span
            className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
        <span className="text-xs text-[#cccccc]">{label}</span>
      </button>
    </div>
  );
}

// ─── 페이지네이션 ─────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const btn =
    "inline-flex h-8 min-w-[32px] items-center justify-center rounded-[4px] px-2 text-sm transition-colors";

  return (
    <div className="mt-6 flex items-center justify-center gap-1">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onChange(currentPage - 1)}
        className={`${btn} border border-white/[0.08] text-[#a6a6a6] ${
          currentPage === 1 ? "pointer-events-none opacity-30" : "hover:bg-[#1a1a1a] hover:text-white"
        }`}
      >
        <IconChevronLeft size={14} stroke={1.5} />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`${btn} border ${
            p === currentPage
              ? "border-white/20 bg-[#1a1a1a] text-white"
              : "border-white/[0.08] text-[#a6a6a6] hover:bg-[#1a1a1a] hover:text-white"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onChange(currentPage + 1)}
        className={`${btn} border border-white/[0.08] text-[#a6a6a6] ${
          currentPage === totalPages ? "pointer-events-none opacity-30" : "hover:bg-[#1a1a1a] hover:text-white"
        }`}
      >
        <IconChevronRight size={14} stroke={1.5} />
      </button>
    </div>
  );
}

// ─── 데이터 출처 카드 ─────────────────────────────────────────────────────────

function DataSourcesCard() {
  const sources = ["SEC EDGAR", "Earnings Call Transcript", "Finnhub", "TickerFlow AI Summary"];
  return (
    <div className="mt-8 rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      <div className="flex items-center gap-2">
        <IconDatabase size={16} stroke={1.5} className="text-[#a6a6a6]" />
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">데이터 출처</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <span key={s} className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#cccccc]">
            {s}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-[#7a7a7a]">마지막 업데이트 {CALLS_LAST_UPDATED}</p>
    </div>
  );
}

// ─── 빈 상태 ──────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-12 text-center">
      <p className="text-sm text-[#cccccc]">최근 3개월 내 어닝콜 데이터가 없습니다.</p>
      <p className="mt-1.5 text-xs text-[#a6a6a6]">
        실적 발표 이후 약 24시간 내 요약이 생성됩니다.
      </p>
    </div>
  );
}

// ─── 보드 ─────────────────────────────────────────────────────────────────────

export default function CallsBoard() {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [guidance, setGuidance] = useState<GuidanceFilter>("all");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo<EarningsCall[]>(() => {
    return MOCK_EARNINGS_CALLS.filter((c) => {
      if (guidance !== "all" && c.guidance_direction !== guidance) return false;
      if (watchlistOnly && !c.in_watchlist) return false;
      if (period !== "all") {
        const maxDays = period === "1m" ? 31 : 92;
        if (daysSince(c.call_date) > maxDays) return false;
      }
      return true;
    });
  }, [period, guidance, watchlistOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 필터 변경 시 1페이지로 리셋
  function resetAnd<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div>
      {/* 2. 필터 바 */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/[0.08] bg-[#0a0a0a]/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-end gap-4">
          <FilterGroup label="기간" options={PERIOD_OPTIONS} value={period} onChange={resetAnd(setPeriod)} />
          <FilterGroup
            label="가이던스 방향"
            options={GUIDANCE_OPTIONS}
            value={guidance}
            onChange={resetAnd(setGuidance)}
          />
          <ToggleSwitch label="와치리스트 종목" checked={watchlistOnly} onChange={resetAnd(setWatchlistOnly)} />
        </div>
      </div>

      {/* 3. 어닝콜 카드 목록 (1열 Full Width) */}
      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((c) => (
            <EarningsCallCard key={`${c.ticker}-${c.quarter}`} call={c} />
          ))}
        </div>
      )}

      {/* 4. 페이지네이션 */}
      {filtered.length > PAGE_SIZE && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setPage} />
      )}

      {/* 5. 데이터 출처 */}
      <DataSourcesCard />
    </div>
  );
}
