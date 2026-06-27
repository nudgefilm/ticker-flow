"use client";

import { useState } from "react";
import {
  IconArrowUpRight,
  IconArrowNarrowRight,
  IconArrowUp,
  IconArrowDown,
  IconExternalLink,
  IconChevronDown,
} from "@tabler/icons-react";
import type {
  EarningsCall,
  GuidanceDirection,
  KeywordChange,
} from "@/lib/mock/earnings-calls";

// ─── 가이던스 배지 ────────────────────────────────────────────────────────────

const GUIDANCE_META: Record<
  GuidanceDirection,
  { label: string; className: string }
> = {
  up: { label: "가이던스 상향", className: "border-green-500/20 bg-green-500/10 text-green-400" },
  maintain: { label: "가이던스 유지", className: "border-white/10 bg-white/[0.06] text-[#cccccc]" },
  down: { label: "가이던스 하향", className: "border-red-500/20 bg-red-500/10 text-red-400" },
};

const GUIDANCE_SHORT: Record<GuidanceDirection, string> = {
  up: "상향",
  maintain: "유지",
  down: "하향",
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function SectionLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">
      {children}
      {hint && (
        <span className="ml-1.5 font-normal normal-case tracking-normal text-[#6f6f6f]">
          ({hint})
        </span>
      )}
    </p>
  );
}

// ─── 실적 요약 항목 ───────────────────────────────────────────────────────────

function MetricItem({
  label,
  hint,
  value,
  estimate,
  accent,
}: {
  label: string;
  hint: string;
  value: string;
  estimate?: string;
  accent?: string;
}) {
  return (
  <div className="flex flex-col items-center gap-0.5 rounded-[6px] border border-[#3b82f6]/20 bg-[#3b82f6]/[0.15] px-4 py-3 text-center">
  <span className="text-xs text-[#a6a6a6]">
    {label} <span className="text-[#6f6f6f]">({hint})</span>
  </span>
  <span className={`text-base font-semibold ${accent ?? "text-white"}`}>{value}</span>
  {estimate && <span className="text-xs text-[#7a7a7a]">예상 {estimate}</span>}
  </div>
  );
}

// ─── 키워드 변화 칩 ───────────────────────────────────────────────────────────

function KeywordChangeChip({ change }: { change: KeywordChange }) {
  const up = change.direction === "up";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-xs ${
        up
          ? "border-green-500/20 bg-green-500/[0.08] text-green-400"
          : "border-red-500/20 bg-red-500/[0.08] text-red-400"
      }`}
    >
      {change.keyword}
      {up ? <IconArrowUp size={12} stroke={2} /> : <IconArrowDown size={12} stroke={2} />}
    </span>
  );
}

// ─── 카드 ─────────────────────────────────────────────────────────────────────

export default function EarningsCallCard({ call }: { call: EarningsCall }) {
  const [showAllQa, setShowAllQa] = useState(false);

  const guidance = GUIDANCE_META[call.guidance_direction];
  const surpriseAccent = call.surprise_percent >= 0 ? "text-green-400" : "text-red-400";
  const guidanceChanged = call.guidance_direction !== call.guidance_previous;
  const visibleQa = showAllQa ? call.qa_pairs : call.qa_pairs.slice(0, 2);

  return (
    <article className="rounded-[8px] border border-white/[0.08] bg-[#1c1c1c] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:p-6">
      {/* 3-1 카드 헤더 */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs font-semibold text-white">
              {call.ticker}
            </span>
            <span className="text-sm font-medium text-white">{call.company_name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#a6a6a6]">
            <span>{call.quarter}</span>
            <span className="text-[#3a3a3a]">·</span>
            <span>{call.relative_time}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {call.has_earnings_release && (
            <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-400">실적 발표</Badge>
          )}
          <Badge className={guidance.className}>{guidance.label}</Badge>
        </div>
      </header>

      {/* 3-2 이번 어닝콜 핵심 요약 */}
      <div className="mt-4 rounded-[6px] border border-[#f97316]/20 bg-[#f97316]/[0.15] p-4">
        <SectionLabel>이번 어닝콜 핵심 요약</SectionLabel>
        <p className="mt-2 text-sm leading-relaxed text-[#e5e5e5]">{call.headline_summary}</p>
      </div>

      {/* 3-3 실적 요약 */}
      <div className="mt-5">
        <SectionLabel>실적 요약</SectionLabel>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricItem label="Revenue" hint="매출" value={call.revenue_actual} estimate={call.revenue_estimate} />
          <MetricItem label="EPS" hint="주당순이익" value={call.eps_actual} estimate={call.eps_estimate} />
          <MetricItem
            label="Surprise"
            hint="예상 대비 차이"
            value={`${call.surprise_percent >= 0 ? "+" : ""}${call.surprise_percent.toFixed(1)}%`}
            accent={surpriseAccent}
          />
        </div>
      </div>

      {/* 3-4 가이던스 */}
      <div className="mt-5">
        <SectionLabel hint="회사가 제시한 향후 실적 전망">가이던스</SectionLabel>
        <div className="mt-2 flex flex-col gap-2">
          <Badge className={guidance.className}>{GUIDANCE_SHORT[call.guidance_direction]}</Badge>
          <p className="text-sm leading-relaxed text-[#cccccc]">{call.guidance_summary}</p>
        </div>
      </div>

      {/* 3-5 핵심 키워드 */}
      <div className="mt-5">
        <SectionLabel>핵심 키워드</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {call.keywords.map((kw) => (
            <span key={kw} className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#cccccc]">
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* 3-6 경영진 핵심 발언 */}
      <div className="mt-5">
        <SectionLabel>경영진 핵심 발언</SectionLabel>
        <div className="mt-2 flex flex-col gap-3">
          {call.key_statements.map((s, i) => (
            <div key={i} className="border-l-2 border-white/[0.12] pl-3">
              <p className="text-sm leading-relaxed text-[#cccccc]">{s.text}</p>
              <p className="mt-1 text-xs font-medium text-[#a6a6a6]">{s.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3-7 Q&A 핵심 문답 */}
      <div className="mt-5">
        <SectionLabel hint="컨퍼런스콜 질의응답">Q&amp;A 핵심 문답</SectionLabel>
        <div className="mt-2 flex flex-col gap-3">
          {visibleQa.map((qa, i) => (
            <div key={i} className="rounded-[6px] border border-white/[0.06] bg-[#161616] px-4 py-3">
              <p className="text-sm font-medium text-[#e5e5e5]">Q. {qa.question}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#a6a6a6]">A. {qa.answer}</p>
            </div>
          ))}
        </div>
        {call.qa_pairs.length > 2 && (
          <button
            type="button"
            onClick={() => setShowAllQa((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-white"
          >
            {showAllQa ? "접기" : "더보기"}
            <IconChevronDown
              size={14}
              stroke={1.5}
              className={`transition-transform ${showAllQa ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* 3-8 전분기 대비 변화 */}
      <div className="mt-5 rounded-[6px] border border-white/[0.06] bg-[#161616] p-4">
        <SectionLabel>전분기 대비 변화</SectionLabel>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {/* 가이던스 변화 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[#7a7a7a]">가이던스</span>
            <div className="flex items-center gap-2 text-sm text-[#cccccc]">
              <span>{GUIDANCE_SHORT[call.guidance_previous]}</span>
              <IconArrowNarrowRight size={16} stroke={1.5} className="text-[#a6a6a6]" />
              <span className={guidanceChanged ? "font-medium text-white" : "text-[#cccccc]"}>
                {GUIDANCE_SHORT[call.guidance_direction]}
              </span>
            </div>
          </div>

          {/* 핵심 키워드 변화 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[#7a7a7a]">핵심 키워드</span>
            <div className="flex flex-wrap gap-1.5">
              {call.keyword_changes.map((c) => (
                <KeywordChangeChip key={c.keyword} change={c} />
              ))}
            </div>
          </div>

          {/* 발언 톤 변화 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-[#7a7a7a]">경영진 발언 톤</span>
            <div className="flex items-center gap-2 text-sm text-[#cccccc]">
              <span>{call.tone_previous}</span>
              <IconArrowNarrowRight size={16} stroke={1.5} className="text-[#a6a6a6]" />
              <span
                className={
                  call.tone_previous !== call.tone_current ? "font-medium text-white" : "text-[#cccccc]"
                }
              >
                {call.tone_current}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-9 카드 하단 */}
      <footer className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <a
            href={call.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-white"
          >
            SEC 원문
            <IconExternalLink size={13} stroke={1.5} />
          </a>
          <a
            href={call.transcript_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-white"
          >
            Transcript
            <IconArrowUpRight size={13} stroke={1.5} />
          </a>
        </div>
        <span className="text-xs text-[#7a7a7a]">수집 시각 {call.summary_generated_at}</span>
      </footer>
    </article>
  );
}
