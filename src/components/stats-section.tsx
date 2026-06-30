"use client"

import {
  Building2,
  FileText,
  Newspaper,
  LineChart,
  Users,
  Megaphone,
  BarChart3,
} from "lucide-react"
import { useCountUp } from "./use-count-up"

type WeeklyItem = { day: string; value: number }

export type StatsSectionProps = {
  featured: number
  filingCount: number
  newsCount: number
  macroCount: number
  insiderCount: number
  earningsCallCount: number
  earningsCount: number
  weeklyCollection: WeeklyItem[]
}

type DisplayStat = {
  value: number
  suffix: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function toDisplayStat(n: number, floor = 0): { value: number; suffix: string } {
  const actual = Math.max(n, floor)
  if (actual >= 100_000) return { value: Math.floor(actual / 10_000), suffix: "만+" }
  if (actual >= 10_000)  return { value: Math.floor(actual / 1_000), suffix: "K+" }
  return { value: actual, suffix: "+" }
}

function FeaturedCounter({ count }: { count: number }) {
  const { ref, value } = useCountUp(count)
  return (
    <div ref={ref}>
      <div className="font-mono text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
        {value.toLocaleString("ko-KR")}
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">실시간 모니터링 기업</p>
    </div>
  )
}

function StatItem({ stat }: { stat: DisplayStat }) {
  const { ref, value } = useCountUp(stat.value)
  const Icon = stat.icon
  return (
    <div ref={ref} className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chart-1/10 text-chart-1">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-lg font-semibold leading-none tracking-tight text-foreground">
          {value.toLocaleString("ko-KR")}
          <span>{stat.suffix}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{stat.label}</p>
      </div>
    </div>
  )
}

export function StatsSection({
  featured,
  filingCount,
  newsCount,
  macroCount,
  insiderCount,
  earningsCallCount,
  earningsCount,
  weeklyCollection,
}: StatsSectionProps) {
  const stats: DisplayStat[] = [
    { ...toDisplayStat(filingCount, 150_000), label: "수집 공시",   icon: FileText },
    { ...toDisplayStat(newsCount, 320_000),   label: "수집 뉴스",   icon: Newspaper },
    { ...toDisplayStat(macroCount),           label: "경제지표",     icon: LineChart },
    { ...toDisplayStat(insiderCount),         label: "내부자 거래",  icon: Users },
    { ...toDisplayStat(earningsCallCount, 5_000), label: "어닝콜 분석", icon: Megaphone },
    { ...toDisplayStat(earningsCount),        label: "실적 발표",   icon: BarChart3 },
  ]

  const maxCollection = Math.max(...weeklyCollection.map((d) => d.value), 1)

  return (
    <section className="w-full bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        >
          {/* 상단: 배지 + 헤딩 + featured 통계 + 바 차트 */}
          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-1 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-chart-1" />
                </span>
                실시간 데이터 파이프라인
              </div>
              <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                매일 수집하고 정리합니다
              </h2>
              <div className="mt-8">
                <FeaturedCounter count={featured} />
              </div>
            </div>

            {/* 최근 7일 일별 수집량 바 차트 */}
            <div className="relative rounded-2xl border border-border bg-background/60 p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium text-muted-foreground">최근 7일 일별 수집량</p>
                <p className="font-mono text-xs text-muted-foreground">단위: 건</p>
              </div>
              <div className="mt-4 flex h-32 items-end justify-between gap-2 sm:h-36">
                {weeklyCollection.map((d, i) => {
                  const isLatest = i === weeklyCollection.length - 1
                  return (
                    <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-foreground">
                        {d.value}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-md ${isLatest ? "bg-chart-1" : "bg-chart-1/35"}`}
                          style={{ height: `${(d.value / maxCollection) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground">{d.day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 설명 */}
          <p className="relative mt-10 text-pretty text-sm leading-relaxed text-muted-foreground">
            공시, 뉴스, 실적, 내부자 거래까지. 흩어진 시장 데이터를 매일 자동으로 수집하고 분석 가능한 형태로 정리합니다.
          </p>

          {/* 구분선 */}
          <div className="my-8 h-px w-full bg-border" />

          {/* 하단: 6개 지표 그리드 */}
          <div className="relative grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
            {stats.map((stat) => (
              <StatItem key={stat.label} stat={stat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
