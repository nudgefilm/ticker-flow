import { cn } from "@/lib/utils";

export default function StockEarningsTable({
  rows,
}: {
  rows: { quarter: string; revenue: string; eps: string; latest?: boolean }[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">분기 실적</p>
      <div className="mt-4 grid grid-cols-3 text-xs text-[#a6a6a6]">
        <span>분기</span>
        <span>매출</span>
        <span>EPS</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.quarter}
          className={cn(
            "grid grid-cols-3 border-t border-white/[0.06] py-2.5 text-sm tabular-nums",
            row.latest ? "font-medium text-white" : "text-[#cccccc]"
          )}
        >
          <span>{row.quarter}</span>
          <span>{row.revenue}</span>
          <span>{row.eps}</span>
        </div>
      ))}
    </div>
  );
}
