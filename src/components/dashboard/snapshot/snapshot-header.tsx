interface Props {
  ticker: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  updatedAt: string | null;
}

export function SnapshotHeader({ ticker, name, exchange, sector, industry, updatedAt }: Props) {
  const meta = [exchange, sector, industry, updatedAt ? `마지막 업데이트 ${updatedAt}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-white">{name}</h1>
        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white">
          {ticker}
        </span>
      </div>
      {meta && (
        <p className="mt-2 text-xs text-[#a6a6a6]">{meta}</p>
      )}
    </div>
  );
}
