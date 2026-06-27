"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { Filing } from "@/lib/insights/types";
import { SectionCard } from "./ui";

const FILTERS = ["전체", "8-K", "10-Q", "10-K", "Insider", "기타"] as const;
type Filter = (typeof FILTERS)[number];
const LIMIT = 5;

function matchesFilter(formType: string, filter: Filter): boolean {
  if (filter === "전체") return true;
  if (filter === "Insider") {
    return formType === "Form 4" || formType === "4" || formType.startsWith("4/");
  }
  if (filter === "기타") {
    const known = ["8-K", "10-Q", "10-K", "Form 4", "4"];
    return !known.some((t) => formType.startsWith(t));
  }
  return formType.startsWith(filter);
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function RecentFilings({ filings }: { filings: Filing[] }) {
  const [filter, setFilter] = useState<Filter>("전체");
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(
    () => filings.filter((f) => matchesFilter(f.formType, filter)),
    [filings, filter]
  );

  const displayed = expanded ? rows : rows.slice(0, LIMIT);
  const hasMore = rows.length > LIMIT;

  return (
    <SectionCard
      title="최근 공시"
      description="최근 30일 공시 목록"
      action={
        <div className="flex flex-wrap justify-end gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setExpanded(false); }}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[#60a5fa] text-[#0a0a0a]"
                  : "bg-white/[0.06] text-[#a6a6a6] hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#a6a6a6]">
          해당 필터에 맞는 공시가 없습니다.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-white/[0.06]">
            {displayed.map((f) => (
              <li key={f.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                <time
                  className="w-12 shrink-0 pt-0.5 text-xs text-[#a6a6a6]"
                  dateTime={f.date}
                >
                  {fmtDate(f.date)}
                </time>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {f.formType}
                      </span>
                      {f.eventType && (
                        <span className="rounded bg-[#60a5fa]/15 px-1.5 py-0.5 text-[11px] font-medium text-[#60a5fa]">
                          {f.eventType}
                        </span>
                      )}
                    </div>
                    {f.url && f.url !== "#" && (
                      <Link
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
                      >
                        원문 보기
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-[#cccccc]">{f.summary}</p>
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
                <><ChevronDown className="h-3.5 w-3.5" /> {rows.length - LIMIT}개 더 보기</>
              )}
            </button>
          )}
        </>
      )}
    </SectionCard>
  );
}
