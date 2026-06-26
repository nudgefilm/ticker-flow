import { CheckCircle2 } from "lucide-react";
import type { TimelineEvent } from "@/lib/insights/types";
import { SectionCard } from "./ui";

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
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const displayed = sorted.slice(-10).reverse();

  return (
    <SectionCard title="주요 변화 요약" description="최근 발생한 주요 변화 목록">
      {displayed.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#a6a6a6]">
          최근 변화 내역이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {displayed.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: KIND_COLOR[ev.kind] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: KIND_COLOR[ev.kind] }}
                  >
                    {KIND_LABEL[ev.kind]}
                  </span>
                  <time className="text-[11px] text-[#a6a6a6]">
                    {fmtDate(ev.date)}
                  </time>
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-white">
                  {ev.title}
                </p>
                {ev.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-[#a6a6a6]">
                    {ev.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
