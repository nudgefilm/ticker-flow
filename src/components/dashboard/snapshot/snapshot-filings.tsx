import Link from "next/link";
import { ExternalLink, ArrowRight } from "lucide-react";
import type { Filing } from "@/lib/insights/types";
import { SectionCard } from "@/components/dashboard/insights/ui";

interface Props {
  filings: Filing[];
  ticker: string;
}

export function SnapshotFilings({ filings, ticker }: Props) {
  return (
    <SectionCard title="최근 공시" description="최근 5건">
      {filings.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">최근 30일 내 수집된 공시가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {filings.slice(0, 5).map((filing, i) => (
            <li key={i} className="flex items-start gap-4 py-3 first:pt-0">
              <span className="w-20 shrink-0 text-xs text-[#a6a6a6]">{filing.date}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white">
                    {filing.formType}
                  </span>
                  {filing.eventType ? (
                    <span className="rounded bg-[#60a5fa]/15 px-1.5 py-0.5 text-xs font-medium text-[#60a5fa]">
                      {filing.eventType}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm text-white/90">{filing.summary}</p>
              </div>
              {filing.url && filing.url !== "#" && (
                <a
                  href={filing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 text-xs text-[#a6a6a6] hover:text-[#60a5fa]"
                >
                  원문 보기 <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <Link
          href={`/analysis?symbol=${ticker}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#60a5fa] hover:text-[#93c5fd]"
        >
          공시 인사이트 보기 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SectionCard>
  );
}
