import { IconBuilding, IconChartBar, IconClock } from "@tabler/icons-react";

interface StockHeaderProps {
  ticker: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  lastClose: number | null;
  updatedAt: string | null;
}

const SECTOR_KR: Record<string, string> = {
  Technology: "기술",
  Healthcare: "헬스케어",
  Financials: "금융",
  "Consumer Discretionary": "경기소비재",
  Industrials: "산업재",
  "Communication Services": "커뮤니케이션",
  "Consumer Staples": "필수소비재",
  Energy: "에너지",
  Utilities: "유틸리티",
  "Real Estate": "부동산",
  Materials: "소재",
};

export default function StockHeader({
  ticker,
  name,
  exchange,
  sector,
  lastClose,
  updatedAt,
}: StockHeaderProps) {
  const sectorKr = sector ? (SECTOR_KR[sector] ?? sector) : null;

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* 왼쪽: 기업 정보 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-xs font-medium text-[#cccccc]">
              {ticker}
            </span>
            {exchange && (
              <div className="flex items-center gap-1 text-xs text-[#a6a6a6]">
                <IconBuilding size={12} stroke={1.5} />
                <span>{exchange}</span>
              </div>
            )}
          </div>
          <h2 className="text-lg font-semibold text-white">{name}</h2>
          {sectorKr && (
            <div className="flex items-center gap-1 text-xs text-[#a6a6a6]">
              <IconChartBar size={12} stroke={1.5} />
              <span>{sectorKr}</span>
            </div>
          )}
        </div>

        {/* 오른쪽: 주가 */}
        <div className="flex flex-col items-end gap-1">
          {lastClose !== null ? (
            <p className="text-2xl font-semibold tabular-nums text-white">
              ${lastClose.toFixed(2)}
            </p>
          ) : (
            <p className="text-sm text-[#a6a6a6]">주가 데이터 없음</p>
          )}
          {updatedAt && (
            <div className="flex items-center gap-1 text-xs text-[#a6a6a6]">
              <IconClock size={11} stroke={1.5} />
              <span>{updatedAt} 기준</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
