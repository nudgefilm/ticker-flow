import { IconFileText, IconNews, IconUser, IconTrendingUp } from "@tabler/icons-react";
import type { TimelineEvent } from "@/lib/insights/types";
import { InsightCard, EmptyState } from "./ui";

const KIND_CONFIG = {
  filing:   { icon: IconFileText,   color: "#60a5fa", label: "공시" },
  news:     { icon: IconNews,       color: "#34d399", label: "뉴스" },
  insider:  { icon: IconUser,       color: "#a78bfa", label: "내부자" },
  earnings: { icon: IconTrendingUp, color: "#fbbf24", label: "실적" },
} as const;

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function ChangeTimeline({ events }: { events: TimelineEvent[] }) {
  const displayed = events.slice(0, 20);

  return (
    <InsightCard title="변화 타임라인">
      {displayed.length === 0 ? (
        <EmptyState message="최근 활동 내역이 없습니다." />
      ) : (
        <div className="relative flex flex-col gap-0">
          {/* 세로 선 */}
          <div className="absolute left-[19px] top-0 h-full w-px bg-white/[0.06]" />

          {displayed.map((ev) => {
            const { icon: Icon, color, label } = KIND_CONFIG[ev.kind];
            return (
              <div key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
                {/* 아이콘 */}
                <div
                  className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a0a0a]"
                  style={{ color }}
                >
                  <Icon size={16} stroke={1.5} />
                </div>

                {/* 내용 */}
                <div className="flex flex-1 flex-col gap-0.5 pt-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color }}>
                      {label}
                    </span>
                    <span className="text-xs text-[#a6a6a6]">{formatDate(ev.date)}</span>
                  </div>
                  <p className="text-sm font-medium text-[#cccccc] line-clamp-1">{ev.title}</p>
                  {ev.description && (
                    <p className="text-xs leading-relaxed text-[#a6a6a6] line-clamp-2">{ev.description}</p>
                  )}
                </div>
              </div>
            );
          })}

          {events.length > 20 && (
            <p className="pt-2 text-center text-xs text-[#a6a6a6]">
              최근 20건 표시 중 (전체 {events.length}건)
            </p>
          )}
        </div>
      )}
    </InsightCard>
  );
}
