import { IconStar } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
  badge?: boolean;
}

interface StockHeaderCardProps {
  ticker: string;
  company: string;
  exchange: string;
  price: string;
  change: string;
  changeUp: boolean;
  changeAbs: string;
  stats: Stat[];
}

export default function StockHeaderCard({
  ticker,
  company,
  exchange,
  price,
  change,
  changeUp,
  changeAbs,
  stats,
}: StockHeaderCardProps) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* 좌측: 티커 + 가격 */}
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs text-[#cccccc]">
              {ticker}
            </span>
            <span className="text-lg font-semibold text-white">{company}</span>
            <span className="rounded-[4px] bg-[#1a1a1a] px-1.5 py-0.5 text-xs text-[#a6a6a6]">
              {exchange}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-3xl font-semibold tabular-nums text-white">{price}</span>
            <span
              className={cn(
                "rounded-[4px] border px-1.5 py-0.5 text-sm font-medium",
                changeUp
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400"
              )}
            >
              {change}
            </span>
            <span className="text-sm text-[#a6a6a6]">{changeAbs}</span>
          </div>
        </div>

        {/* 우측: 통계 + 와치리스트 */}
        <div className="flex flex-col items-start gap-4 lg:items-end">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-xs text-[#a6a6a6]">{stat.label}</p>
                {stat.badge ? (
                  <span className="mt-1 inline-flex items-center rounded-[4px] border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-400">
                    {stat.value}
                  </span>
                ) : (
                  <p className="mt-1 text-sm font-medium text-white">{stat.value}</p>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
          >
            <IconStar size={14} stroke={1.5} />
            와치리스트
          </button>
        </div>
      </div>
    </div>
  );
}
