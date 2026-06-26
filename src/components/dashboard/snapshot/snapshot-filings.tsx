import Link from "next/link";
import { ExternalLink, ChevronRight } from "lucide-react";
import type { Filing } from "@/lib/insights/types";

interface Props {
  filings: Filing[];
  ticker: string;
}

function filingBadgeClass(formType: string): string {
  const ft = formType.toUpperCase();
  if (ft.startsWith("8-K")) return "border-amber-500/20 bg-amber-500/10 text-amber-400";
  if (ft.startsWith("10-K") || ft.startsWith("10-Q")) return "border-blue-500/20 bg-blue-500/10 text-blue-400";
  if (ft === "4" || ft === "4/A") return "border-purple-500/20 bg-purple-500/10 text-purple-400";
  return "border-white/[0.08] bg-white/[0.04] text-[#a6a6a6]";
}

function importanceDot(imp: Filing["importance"]) {
  if (imp === "high") return "bg-red-400";
  if (imp === "medium") return "bg-amber-400";
  return "bg-[#a6a6a6]";
}

export default function SnapshotFilings({ filings, ticker }: Props) {
  return (
    <div className="flex flex-col rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">최근 공시 (30일)</p>
        <Link
          href={`/analysis?symbol=${ticker}`}
          className="flex items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
        >
          공시 인사이트 보기
          <ChevronRight size={12} />
        </Link>
      </div>

      {filings.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">최근 30일 내 수집된 공시가 없습니다.</p>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.06]">
          {filings.map((f) => (
            <div key={f.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium ${filingBadgeClass(f.formType)}`}
                >
                  {f.formType}
                </span>
                {f.eventType && (
                  <span className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-[11px] text-[#a6a6a6]">
                    {f.eventType}
                  </span>
                )}
                <span
                  className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${importanceDot(f.importance)}`}
                  title={f.importance === "high" ? "주요 이벤트" : f.importance === "medium" ? "정기 보고서" : "일반"}
                />
                <span className="shrink-0 text-xs text-[#a6a6a6]">{f.date}</span>
              </div>
              <p className="text-sm leading-relaxed text-[#a6a6a6]">{f.summary}</p>
              {f.url && f.url !== "#" && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-1 text-xs text-[#a6a6a6] transition-colors hover:text-[#cccccc]"
                >
                  SEC 원문
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
