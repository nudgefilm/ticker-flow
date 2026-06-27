import { cn } from "@/lib/utils";
import type { Importance } from "@/lib/insights/types";
import type { ReactNode } from "react";

export function InsightCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111]", className)}>
      <div className="border-b border-white/[0.06] bg-[#0f0f0f] px-5 py-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const IMPORTANCE_STYLES: Record<Importance, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-white/[0.04] text-[#a6a6a6] border-white/[0.08]",
};

const IMPORTANCE_LABELS: Record<Importance, string> = {
  high: "주요",
  medium: "일반",
  low: "참고",
};

export function ImportanceBadge({ importance }: { importance: Importance }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium",
        IMPORTANCE_STYLES[importance]
      )}
    >
      {IMPORTANCE_LABELS[importance]}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-[#a6a6a6]">{message}</p>;
}

export function FormTypeBadge({ formType }: { formType: string }) {
  const ft = formType.toUpperCase();
  let cls = "border-white/[0.08] bg-white/[0.04] text-[#a6a6a6]";
  if (ft.startsWith("8-K")) cls = "border-amber-500/20 bg-amber-500/10 text-amber-400";
  else if (ft.startsWith("10-K") || ft.startsWith("10-Q")) cls = "border-blue-500/20 bg-blue-500/10 text-blue-400";
  else if (ft === "4" || ft === "4/A") cls = "border-purple-500/20 bg-purple-500/10 text-purple-400";

  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-[4px] border px-1.5 py-0.5 text-[11px] font-medium", cls)}>
      {formType}
    </span>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#111111]">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] bg-[#0f0f0f] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs text-[#a6a6a6]">{description ?? ' '}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function relativeDate(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff < 7) return `${diff}일 전`;
  const [, m, day] = isoStr.slice(0, 10).split("-");
  return `${parseInt(m)}월 ${parseInt(day)}일`;
}
