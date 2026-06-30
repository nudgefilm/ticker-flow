"use client";

import { useRef, useState } from "react";
import { FileText, Newspaper, UserRound, TrendingUp } from "lucide-react";
import type { TimelineEvent } from "@/lib/insights/types";
import { SectionCard } from "./ui";
import { SectionPager } from "./section-pager";

const KIND_CONFIG = {
  filing:   { color: "#60a5fa", bg: "bg-[#60a5fa]/15", Icon: FileText,   label: "공시"   },
  news:     { color: "#fbbf24", bg: "bg-[#fbbf24]/15", Icon: Newspaper,   label: "뉴스"   },
  insider:  { color: "#34d399", bg: "bg-[#34d399]/15", Icon: UserRound,   label: "내부자" },
  earnings: { color: "#c084fc", bg: "bg-[#c084fc]/15", Icon: TrendingUp,  label: "실적"   },
} as const;

const PAGE_SIZE = 10; // 5행 × 2열

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function ChangeTimeline({ events }: { events: TimelineEvent[] }) {
  const [page, setPage] = useState(1);
  const sectionRef = useRef<HTMLDivElement>(null);

  function handlePageChange(p: number) {
    setPage(p);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const totalPages = Math.ceil(events.length / PAGE_SIZE);
  const displayed = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div ref={sectionRef}>
    <SectionCard
      title="변화 타임라인"
      description="최근 90일 이벤트 통합 (공시·뉴스·내부자·실적)"
    >
      {events.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#a6a6a6]">
          최근 활동 내역이 없습니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {displayed.map((ev) => {
              const cfg = KIND_CONFIG[ev.kind];
              const { Icon } = cfg;
              return (
                <div
                  key={ev.id}
                  className="flex flex-col rounded-lg border border-white/[0.08] bg-white/[0.03] p-4"
                  style={{ borderLeft: `2px solid ${cfg.color}` }}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                      <Icon className="h-3 w-3" style={{ color: cfg.color }} strokeWidth={2} />
                    </span>
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <time className="text-[11px] text-[#a6a6a6]">{fmtDate(ev.date)}</time>
                  </div>
                  <p className="line-clamp-1 text-sm font-medium text-white">{ev.title}</p>
                  {ev.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#a6a6a6]">
                      {ev.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <SectionPager page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </SectionCard>
    </div>
  );
}
