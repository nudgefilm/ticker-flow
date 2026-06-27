"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { TimelineEvent } from "@/lib/insights/types";
import { SectionCard } from "./ui";

const LIMIT = 5;

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  filing: "공시",
  news: "뉴스",
  insider: "내부자 거래",
  earnings: "실적",
};

const KIND_COLOR: Record<TimelineEvent["kind"], string> = {
  filing: "#60a5fa",
  news: "#fbbf24",
  insider: "#34d399",
  earnings: "#c084fc",
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function ChangeSummary({ events }: { events: TimelineEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  const displayed = expanded ? sorted : sorted.slice(0, LIMIT);
  const hasMore = sorted.length > LIMIT;

  return (
    <SectionCard title="주요 변화 요약" description="최근 발생한 주요 변화 목록">
      {sorted.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#a6a6a6]">최근 변화 내역이 없습니다.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {displayed.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: KIND_COLOR[ev.kind] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: KIND_COLOR[ev.kind] }}
                    >
                      {KIND_LABEL[ev.kind]}
                    </span>
                    <time className="text-[11px] text-[#a6a6a6]">{fmtDate(ev.date)}</time>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-white">{ev.title}</p>
                  {ev.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-[#a6a6a6]">{ev.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] py-2 text-xs text-[#a6a6a6] transition-colors hover:text-white"
            >
              {expanded ? (
                <><ChevronUp className="h-3.5 w-3.5" /> 접기</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" /> {sorted.length - LIMIT}개 더 보기</>
              )}
            </button>
          )}
        </>
      )}
    </SectionCard>
  );
}
