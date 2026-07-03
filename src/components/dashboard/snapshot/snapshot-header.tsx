import { WatchlistAddButton } from "@/components/dashboard/snapshot/watchlist-add-button";

interface Props {
  ticker: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  updatedAt: string | null;
  showWatchlistButton?: boolean;
  inWatchlist?: boolean;
  atLimit?: boolean;
  isPro?: boolean;
}

export function SnapshotHeader({
  ticker,
  name,
  exchange,
  sector,
  industry,
  updatedAt,
  showWatchlistButton = false,
  inWatchlist = false,
  atLimit = false,
  isPro = false,
}: Props) {
  const meta = [exchange, sector, industry, updatedAt ? `마지막 업데이트 ${updatedAt}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">{name}</h1>
          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white">
            {ticker}
          </span>
        </div>
        {showWatchlistButton ? (
          <WatchlistAddButton
            ticker={ticker}
            initiallyInWatchlist={inWatchlist}
            atLimit={atLimit}
            isPro={isPro}
          />
        ) : null}
      </div>
      {meta && (
        <p className="mt-2 text-xs text-[#a6a6a6]">{meta}</p>
      )}
    </div>
  );
}
