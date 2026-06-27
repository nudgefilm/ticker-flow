import { IconExternalLink } from "@tabler/icons-react";
import type { MacroIndicator } from "@/lib/mock/macro";
import MiniLineChart from "./mini-line-chart";

// 전월 대비 변화 표기 — 색상으로 의미 부여하지 않고 중립 아이콘/텍스트만 사용
function ChangeLabel({ indicator }: { indicator: MacroIndicator }) {
  const { changeDirection, changeValue, changeUnit } = indicator;

  if (changeDirection === "flat") {
    return <span className="text-xs text-[#a6a6a6]">변동 없음</span>;
  }

  const symbol = changeDirection === "up" ? "▲" : "▼";
  return (
    <span className="text-xs tabular-nums text-[#cccccc]">
      <span className="text-[#a6a6a6]">{symbol}</span> {changeValue}
      {changeUnit} <span className="text-[#6f6f6f]">전월 대비</span>
    </span>
  );
}

function formatDate(d: string) {
  return d.replaceAll("-", ".");
}

export default function IndicatorCard({ indicator }: { indicator: MacroIndicator }) {
  return (
    <div className="flex flex-col gap-3 rounded-[8px] border border-white/[0.08] bg-[#1c1c1c] px-5 py-4">
      {/* 지표명 + 약어/설명 */}
      <div>
        <p className="text-sm font-semibold text-white">{indicator.name}</p>
        <p className="mt-0.5 text-xs text-[#6f6f6f]">
          {indicator.code} <span className="text-[#a6a6a6]">({indicator.codeDesc})</span>
        </p>
      </div>

      {/* 현재 값 + 전월 대비 변화 */}
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-semibold tabular-nums text-white">
          {indicator.value}
          <span className="ml-1 text-sm font-normal text-[#a6a6a6]">{indicator.unit}</span>
        </p>
        <ChangeLabel indicator={indicator} />
      </div>

      {/* 최근 12개월 추이 */}
      <div className="pt-1">
        <p className="mb-1 text-[11px] uppercase tracking-wide text-[#6f6f6f]">최근 12개월 추이</p>
        <MiniLineChart data={indicator.history} />
      </div>

      {/* 발표 정보 */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3 text-xs">
        <div>
          <p className="text-[#6f6f6f]">최근 발표</p>
          <p className="mt-0.5 tabular-nums text-[#cccccc]">{formatDate(indicator.lastReleaseDate)}</p>
        </div>
        <div>
          <p className="text-[#6f6f6f]">다음 발표 예정</p>
          <p className="mt-0.5 tabular-nums text-[#cccccc]">
            {indicator.nextReleaseDate ? formatDate(indicator.nextReleaseDate) : "미정"}
          </p>
        </div>
      </div>

      {/* 데이터 출처 */}
      <a
        href={indicator.fredUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-xs text-[#60a5fa] transition-colors hover:text-[#93c5fd]"
      >
        FRED 원문 보기
        <IconExternalLink size={12} stroke={2} />
      </a>
    </div>
  );
}
