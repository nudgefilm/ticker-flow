import { Building2, Layers } from "lucide-react";

interface Props {
  ticker: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
}

const SECTOR_KR: Record<string, string> = {
  Technology: "기술", Healthcare: "헬스케어", Financials: "금융",
  "Consumer Discretionary": "임의소비재", "Consumer Staples": "필수소비재",
  Energy: "에너지", Industrials: "산업재", Materials: "소재",
  "Real Estate": "부동산", Utilities: "유틸리티", "Communication Services": "커뮤니케이션",
};

export default function SnapshotHeader({ ticker, name, exchange, sector, industry }: Props) {
  const sectorKr = sector ? (SECTOR_KR[sector] ?? sector) : null;

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-sm font-bold tracking-wide text-[#cccccc]">
          {ticker}
        </span>
        <h1 className="text-xl font-semibold text-white">{name}</h1>
      </div>
      {(exchange || sectorKr || industry) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#a6a6a6]">
          {exchange && (
            <span className="flex items-center gap-1">
              <Building2 size={12} />
              {exchange}
            </span>
          )}
          {sectorKr && (
            <span className="flex items-center gap-1">
              <Layers size={12} />
              {sectorKr}
            </span>
          )}
          {industry && (
            <span className="text-[#a6a6a6]">{industry}</span>
          )}
        </div>
      )}
    </div>
  );
}
