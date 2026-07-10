import type { TickerBadgeReason } from "@/lib/collect/target-tickers";
import { cn } from "@/lib/utils";

// 2026-07-11: "top30"(TickerFlow 자체 스코어링 기반 선정 배지)은 제거했다 —
// 자본시장법 유사투자자문업 리스크 점검(세션97)에 따라 가중치 기반 종합
// 평가·선정 결과를 그대로 노출하는 표현을 공개/사용자 화면에서 없애는 조치의
// 일부. volume/sector는 각각 거래량·시가총액이라는 단일 객관 지표 정렬일 뿐
// TickerFlow의 가중치 스코어링 결과가 아니라서 유지한다.
const BADGE_CONFIG: Record<TickerBadgeReason, { label: string; color: string }> = {
  volume: { label: "거래량 상위", color: "#fbbf24" },
  sector: { label: "섹터 주목",   color: "#a78bfa" },
};

export function TickerBadges({
  reasons,
  className,
}: {
  reasons?: TickerBadgeReason[];
  className?: string;
}) {
  if (!reasons || reasons.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {reasons.map((reason) => {
        const { label, color } = BADGE_CONFIG[reason];
        return (
          <span
            key={reason}
            className="rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${color}26`, color }}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
