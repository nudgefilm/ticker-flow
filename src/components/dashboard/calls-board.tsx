"use client"

import { useMemo, useState } from "react"
import type { EarningsCall, GuidanceDirection } from "@/lib/earnings-calls"
import EarningsCallCard from "@/components/dashboard/earnings-call-card"

const PAGE_SIZE = 3

function daysSince(dateStr: string): number {
  if (!dateStr) return Infinity
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

type PeriodFilter = "all" | "1m" | "3m"
type GuidanceFilter = "all" | GuidanceDirection

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "1m", label: "최근 1개월" },
  { value: "3m", label: "최근 3개월" },
]

const GUIDANCE_OPTIONS: { value: GuidanceFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "up", label: "상향" },
  { value: "maintain", label: "유지" },
  { value: "down", label: "하향" },
]

interface Props {
  calls: EarningsCall[]
  isPro: boolean
}

export default function CallsBoard({ calls, isPro: _isPro }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>("all")
  const [guidance, setGuidance] = useState<GuidanceFilter>("all")
  const [watchlistOnly, setWatchlistOnly] = useState(false)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return calls.filter((c) => {
      if (period === "1m" && daysSince(c.call_date) > 31) return false
      if (period === "3m" && daysSince(c.call_date) > 92) return false
      if (guidance !== "all" && c.guidance_direction !== guidance) return false
      if (watchlistOnly && !c.in_watchlist) return false
      return true
    })
  }, [calls, period, guidance, watchlistOnly])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  const hasWatchlist = calls.some((c) => c.in_watchlist)

  return (
    <div>
      {/* 필터 바 */}
      <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-4 rounded-[8px] border border-white/[0.06] bg-[#0a0a0a]/90 px-4 py-3 backdrop-blur">
        {/* 기간 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#a6a6a6]">기간</span>
          <div className="flex rounded-[4px] bg-[#1a1a1a] p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => changeFilter(setPeriod, opt.value)}
                className={`rounded-[3px] px-2.5 py-1 text-xs transition-colors ${
                  period === opt.value
                    ? "bg-[#3b82f6] text-white"
                    : "text-[#a6a6a6] hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 가이던스 방향 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#a6a6a6]">가이던스</span>
          <div className="flex rounded-[4px] bg-[#1a1a1a] p-0.5">
            {GUIDANCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => changeFilter(setGuidance, opt.value)}
                className={`rounded-[3px] px-2.5 py-1 text-xs transition-colors ${
                  guidance === opt.value
                    ? "bg-[#3b82f6] text-white"
                    : "text-[#a6a6a6] hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 내 종목만 토글 */}
        {hasWatchlist && (
          <label className="ml-auto flex cursor-pointer items-center gap-2">
            <span className="text-xs text-[#a6a6a6]">내 종목만</span>
            <button
              role="switch"
              aria-checked={watchlistOnly}
              onClick={() => changeFilter(setWatchlistOnly, !watchlistOnly)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                watchlistOnly ? "bg-[#3b82f6]" : "bg-white/[0.15]"
              }`}
            >
              <span
                className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  watchlistOnly ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        )}
      </div>

      {/* 목록 */}
      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-[#a6a6a6]">최근 3개월 내 어닝콜 데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {paginated.map((call) => (
            <EarningsCallCard key={call.id} call={call} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-[4px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#a6a6a6] transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`rounded-[4px] border px-3 py-1.5 text-xs transition-colors ${
                n === page
                  ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#60a5fa]"
                  : "border-white/[0.08] text-[#a6a6a6] hover:text-white"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-[4px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#a6a6a6] transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}

      {/* 데이터 출처 카드 */}
      <div className="mt-10 rounded-[8px] border border-white/[0.06] bg-[#1a1a1a] p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
          데이터 출처
        </p>
        <ul className="flex flex-col gap-1.5 text-xs text-[#7a7a7a]">
          <li>· SEC EDGAR — 공시 원문</li>
          <li>· Earnings Call Transcript — 컨퍼런스콜 스크립트</li>
          <li>· Finnhub — 실적 수치 (EPS, 매출)</li>
          <li>· TickerFlow 요약 — 한국어 구조화 요약</li>
        </ul>
      </div>
    </div>
  )
}
