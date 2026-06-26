import StockCombobox from "./stock-combobox";

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

function ChangeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold leading-none text-white">{value}</span>
        <span className="text-xs text-[#60a5fa]">건</span>
      </div>
      <div className="mt-1 text-[11px] text-[#a6a6a6]">{label}</div>
    </div>
  );
}

interface Props {
  ticker: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  updatedAt: string | null;
  summary: {
    filings: number;
    keyEvents: number;
    insiderTrades: number;
    news: number;
    earnings: number;
  };
  comboboxOptions: { ticker: string; name: string }[];
}

export default function StockHeader({
  ticker,
  name,
  exchange,
  sector,
  industry,
  updatedAt,
  summary,
  comboboxOptions,
}: Props) {
  const sectorKr = sector ? (SECTOR_KR[sector] ?? sector) : null;
  const meta = [exchange, sectorKr, industry].filter(Boolean).join(" · ");

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#111111] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{name}</h1>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white">
              {ticker}
            </span>
          </div>
          {meta && <p className="mt-1 text-xs text-[#a6a6a6]">{meta}</p>}
        </div>
        <StockCombobox value={ticker} options={comboboxOptions} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-4 sm:grid-cols-3 lg:grid-cols-5">
        <ChangeStat label="최근 공시" value={summary.filings} />
        <ChangeStat label="주요 변화" value={summary.keyEvents} />
        <ChangeStat label="최근 뉴스" value={summary.news} />
        <ChangeStat label="최근 실적 발표" value={summary.earnings} />
        <ChangeStat label="최근 내부자 거래" value={summary.insiderTrades} />
      </div>

      {updatedAt && (
        <div className="mt-4 text-[11px] text-[#a6a6a6]">
          최근 30일 기준 · 마지막 업데이트 {updatedAt}
        </div>
      )}
    </div>
  );
}
