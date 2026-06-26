import { FileText, Newspaper, UserRound, TrendingUp } from "lucide-react";
import type { TimelineEvent } from "@/lib/insights/types";
import { SectionCard } from "./ui";

const KIND_CONFIG = {
  filing: {
    color: "#60a5fa",
    bg: "bg-[#60a5fa]/15",
    Icon: FileText,
    label: "공시",
  },
  news: {
    color: "#fbbf24",
    bg: "bg-[#fbbf24]/15",
    Icon: Newspaper,
    label: "뉴스",
  },
  insider: {
    color: "#34d399",
    bg: "bg-[#34d399]/15",
    Icon: UserRound,
    label: "내부자",
  },
  earnings: {
    color: "#c084fc",
    bg: "bg-[#c084fc]/15",
    Icon: TrendingUp,
    label: "실적",
  },
} as const;

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function ChangeTimeline({ events }: { events: TimelineEvent[] }) {
  const displayed = events.slice(0, 20);

  return (
    <SectionCard
      title="변화 타임라인"
      description="최근 90일 이벤트 통합 (공시·뉴스·내부자·실적)"
    >
      {displayed.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#a6a6a6]">
          최근 활동 내역이 없습니다.
        </p>
      ) : (
        <ol className="relative space-y-4 pl-8 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-px before:bg-white/[0.08]">
          {displayed.map((ev) => {
            const cfg = KIND_CONFIG[ev.kind];
            const { Icon } = cfg;
            return (
              <li key={ev.id} className="relative">
                <span
                  className={`absolute -left-8 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-[#111111] ${cfg.bg}`}
                >
                  <Icon
                    className="h-3 w-3"
                    style={{ color: cfg.color }}
                    strokeWidth={2}
                  />
                </span>
                <div
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4"
                  style={{ borderLeft: `2px solid ${cfg.color}` }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    <time className="text-[11px] text-[#a6a6a6]">
                      {fmtDate(ev.date)}
                    </time>
                  </div>
                  <p className="line-clamp-1 text-sm font-medium text-white">
                    {ev.title}
                  </p>
                  {ev.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#a6a6a6]">
                      {ev.description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {events.length > 20 && (
        <p className="mt-4 text-center text-xs text-[#a6a6a6]">
          최근 20건 표시 중 (전체 {events.length}건)
        </p>
      )}
    </SectionCard>
  );
}
