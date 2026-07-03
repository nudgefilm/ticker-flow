import type { InsiderTrade } from "@/lib/insights/types";
import { SectionCard } from "@/components/dashboard/insights/ui";
import { ScrollHintList } from "@/components/dashboard/scroll-hint-list";

function compactAmount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function SnapshotInsider({
  trades,
  className,
}: {
  trades: InsiderTrade[];
  className?: string;
}) {
  return (
    <SectionCard
      title="내부자 거래"
      description="내부자(임원·이사·10% 이상 대주주) 최근 10건"
      className={className}
    >
      {trades.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">최근 내부자 거래 내역이 없습니다.</p>
      ) : (
        <ScrollHintList maxHeight={320}>
          <ul className="divide-y divide-white/[0.06]">
            {trades.slice(0, 10).map((t) => {
              const buy = t.type === "매수";
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">{t.name}</span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          color: buy ? "#34d399" : "#f87171",
                          backgroundColor: buy ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                        }}
                      >
                        {t.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#a6a6a6]">
                      {t.date}
                      {t.titleLabel ? ` · ${t.titleLabel}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-white">{compactAmount(t.value)}</p>
                    <p className="mt-0.5 text-[11px] text-[#a6a6a6]">
                      {t.shares != null ? t.shares.toLocaleString("en-US") + "주" : "—"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollHintList>
      )}
      <p className="mt-auto pt-3 text-[10px] text-[#a6a6a6]">📌 출처: SEC Form 4 공시</p>
    </SectionCard>
  );
}
