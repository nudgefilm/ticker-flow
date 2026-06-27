"use client"

import { useState } from "react"
import { IconChevronDown, IconExternalLink } from "@tabler/icons-react"
import type { EarningsCall, GuidanceDirection } from "@/lib/earnings-calls"

function guidanceMeta(dir: GuidanceDirection) {
  if (dir === "up")
    return { cls: "border-green-500/20 bg-green-500/10 text-green-400", label: "가이던스 상향" }
  if (dir === "down")
    return { cls: "border-red-500/20 bg-red-500/10 text-red-400", label: "가이던스 하향" }
  return { cls: "border-white/10 bg-white/[0.06] text-[#cccccc]", label: "가이던스 유지" }
}

function SectionLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <p className="mb-2 text-xs font-medium text-[#a6a6a6]">
      {label}
      {hint && <span className="ml-1 font-normal text-[#6f6f6f]">{hint}</span>}
    </p>
  )
}

function MetricItem({
  label,
  hint,
  actual,
  estimate,
}: {
  label: string
  hint?: string
  actual: string
  estimate?: string
}) {
  return (
    <div className="flex flex-col items-center rounded-[4px] bg-[#161616] p-3 text-center">
      <p className="text-[10px] text-[#a6a6a6]">{label}</p>
      {hint && <p className="text-[10px] text-[#6f6f6f]">{hint}</p>}
      <p className="mt-2 text-base font-semibold tabular-nums text-white">{actual}</p>
      {estimate && (
        <p className="mt-0.5 text-[10px] text-[#7a7a7a]">예상 {estimate}</p>
      )}
    </div>
  )
}

function GuidanceMini({ dir }: { dir: GuidanceDirection }) {
  const { cls, label } = guidanceMeta(dir)
  const short = label.replace("가이던스 ", "")
  return (
    <span className={`rounded-[4px] border px-1.5 py-0.5 text-[10px] ${cls}`}>{short}</span>
  )
}

function formatCallDate(d: string): string {
  return d ? d.replace(/-/g, ".") : "";
}

export default function EarningsCallCard({ call }: { call: EarningsCall }) {
  const [qaExpanded, setQaExpanded] = useState(false)

  const { cls: gdCls, label: gdLabel } = guidanceMeta(call.guidance_direction)
  const surprisePositive = call.surprise_percent >= 0
  const visibleQa = qaExpanded ? call.qa_pairs : call.qa_pairs.slice(0, 2)
  const hasMetrics = call.revenue_actual || call.eps_actual || call.surprise_percent !== 0
  const hasChanges =
    call.keyword_changes.length > 0 ||
    (call.tone_previous && call.tone_current)

  return (
    <div className="rounded-[8px] border border-white/[0.08] bg-[#1c1c1c] shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
      {/* 1. 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-xs font-medium text-[#60a5fa]">
              {call.ticker}
            </span>
            <span className="text-sm font-medium text-[#e5e5e5]">{call.company_name}</span>
          </div>
          <p className="mt-1 text-xs text-[#7a7a7a]">
            {call.quarter} · {formatCallDate(call.call_date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {call.has_earnings_release && (
            <span className="rounded-[4px] border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#cccccc]">
              실적 발표
            </span>
          )}
          <span className={`rounded-[4px] border px-2 py-0.5 text-[11px] ${gdCls}`}>
            {gdLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* 2. 핵심 요약 */}
        {call.headline_summary && (
          <div className="rounded-[6px] border border-[#f97316]/20 bg-[#f97316]/[0.15] p-4">
            <SectionLabel label="이번 어닝콜 핵심 요약" />
            <p className="text-sm leading-relaxed text-[#e5e5e5]">{call.headline_summary}</p>
          </div>
        )}

        {/* 3. 실적 요약 */}
        {hasMetrics && (
          <div className="rounded-[6px] border border-[#3b82f6]/20 bg-[#3b82f6]/[0.15] p-4">
            <SectionLabel label="실적 요약" />
            <div className="grid grid-cols-3 gap-3">
              {call.revenue_actual && (
                <MetricItem
                  label="Revenue"
                  hint="(매출)"
                  actual={call.revenue_actual}
                  estimate={call.revenue_estimate || undefined}
                />
              )}
              {call.eps_actual && (
                <MetricItem
                  label="EPS"
                  hint="(주당순이익)"
                  actual={call.eps_actual}
                  estimate={call.eps_estimate || undefined}
                />
              )}
              {call.surprise_percent !== 0 && (
                <div className="flex flex-col items-center rounded-[4px] bg-[#161616] p-3 text-center">
                  <p className="text-[10px] text-[#a6a6a6]">Surprise</p>
                  <p className="text-[10px] text-[#6f6f6f]">(예상 대비)</p>
                  <p
                    className={`mt-2 text-base font-semibold tabular-nums ${
                      surprisePositive ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {surprisePositive ? "+" : ""}
                    {call.surprise_percent.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. 가이던스 */}
        {call.guidance_summary && (
          <div>
            <SectionLabel label="가이던스" hint="(회사가 제시한 향후 실적 전망)" />
            <div className="rounded-[6px] bg-[#161616] p-4">
              <span className={`mb-3 inline-block rounded-[4px] border px-2 py-0.5 text-[11px] ${gdCls}`}>
                {gdLabel}
              </span>
              <p className="text-sm leading-relaxed text-[#cccccc]">{call.guidance_summary}</p>
            </div>
          </div>
        )}

        {/* 5. 핵심 키워드 */}
        {call.keywords.length > 0 && (
          <div>
            <SectionLabel label="핵심 키워드" />
            <div className="flex flex-wrap gap-2">
              {call.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-[4px] bg-[#1a1a1a] px-2.5 py-1 text-xs text-[#cccccc]"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 6. 경영진 핵심 발언 */}
        {call.key_statements.length > 0 && (
          <div>
            <SectionLabel label="경영진 핵심 발언" />
            <div className="flex flex-col gap-3">
              {call.key_statements.map((stmt, i) => (
                <div
                  key={i}
                  className="rounded-[6px] border-l-2 border-[#3b82f6] bg-[#161616] py-3 pl-4 pr-4"
                >
                  <p className="text-sm leading-relaxed text-[#cccccc]">{stmt.text}</p>
                  <p className="mt-1.5 text-xs text-[#7a7a7a]">{stmt.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Q&A */}
        {call.qa_pairs.length > 0 && (
          <div>
            <SectionLabel label="Q&A 핵심 문답" hint="(컨퍼런스콜 질의응답)" />
            <div className="flex flex-col gap-3">
              {visibleQa.map((qa, i) => (
                <div key={i} className="rounded-[6px] bg-[#161616] p-4">
                  <p className="text-xs font-medium text-[#a6a6a6]">Q. {qa.question}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#cccccc]">A. {qa.answer}</p>
                </div>
              ))}
            </div>
            {call.qa_pairs.length > 2 && (
              <button
                onClick={() => setQaExpanded(!qaExpanded)}
                className="mt-2 flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-white"
              >
                <IconChevronDown
                  size={14}
                  stroke={1.5}
                  className={`transition-transform ${qaExpanded ? "rotate-180" : ""}`}
                />
                {qaExpanded
                  ? "접기"
                  : `더보기 (${call.qa_pairs.length - 2}개 더)`}
              </button>
            )}
          </div>
        )}

        {/* 8. 전분기 대비 변화 */}
        {hasChanges && (
          <div>
            <SectionLabel label="전분기 대비 변화" />
            <div className="rounded-[6px] bg-[#161616] p-4 space-y-3">
              {call.guidance_previous && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 font-medium text-[#cccccc]">가이던스</span>
                  <GuidanceMini dir={call.guidance_previous} />
                  <span className="text-[#6f6f6f]">→</span>
                  <GuidanceMini dir={call.guidance_direction} />
                </div>
              )}
              {call.keyword_changes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] text-[#6f6f6f]">키워드 언급 증감</p>
                  <div className="flex flex-wrap gap-1.5">
                    {call.keyword_changes.map((kc) => (
                      <span
                        key={kc.keyword}
                        className={`rounded-[4px] px-2 py-0.5 text-[11px] ${
                          kc.direction === "up"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {kc.direction === "up" ? "↑" : "↓"} {kc.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {call.tone_previous && call.tone_current && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 font-medium text-[#cccccc]">발언 톤</span>
                  <span className="text-[#a6a6a6]">{call.tone_previous}</span>
                  <span className="text-[#6f6f6f]">→</span>
                  <span className="text-[#a6a6a6]">{call.tone_current}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 9. 하단 링크 + 수집 시각 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
        <div className="flex gap-4">
          <a
            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${call.ticker}&type=10-Q&dateb=&owner=include&count=10`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-white"
          >
            <IconExternalLink size={12} stroke={1.5} />
            SEC 원문
          </a>
          {(call.transcript_url || call.source_url) && (
            <a
              href={call.transcript_url || call.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-white"
            >
              <IconExternalLink size={12} stroke={1.5} />
              Transcript
            </a>
          )}
        </div>
        {call.summary_generated_at && (
          <span className="text-[10px] text-[#6f6f6f]">
            수집: {call.summary_generated_at}
          </span>
        )}
      </div>
    </div>
  )
}
