import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import type { Filing } from "@/lib/insights/types";
import { InsightCard, ImportanceBadge, FormTypeBadge, EmptyState, relativeDate } from "./ui";

export default function RecentFilings({ filings }: { filings: Filing[] }) {
  return (
    <InsightCard title="최근 공시 (30일)">
      {filings.length === 0 ? (
        <EmptyState message="최근 30일 내 공시가 없습니다." />
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {filings.map((f) => (
            <div key={f.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              {/* Row 1: 배지 + 날짜 */}
              <div className="flex flex-wrap items-center gap-2">
                <FormTypeBadge formType={f.formType} />
                {f.eventType && (
                  <span className="inline-flex shrink-0 items-center rounded-[4px] border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                    {f.eventType}
                  </span>
                )}
                <ImportanceBadge importance={f.importance} />
                <span className="ml-auto shrink-0 text-xs text-[#a6a6a6]">{relativeDate(f.date)}</span>
                {f.url !== "#" && (
                  <Link
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
                  >
                    원문
                    <IconExternalLink size={11} stroke={1.5} />
                  </Link>
                )}
              </div>
              {/* Row 2: 요약 */}
              <p className="text-sm leading-relaxed text-[#cccccc]">{f.summary}</p>
            </div>
          ))}
        </div>
      )}
    </InsightCard>
  );
}
