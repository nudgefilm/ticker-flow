"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck } from "@tabler/icons-react";

interface Props {
  ticker: string;
  initiallyInWatchlist: boolean;
  atLimit: boolean;
  isPro: boolean;
}

export function WatchlistAddButton({ ticker, initiallyInWatchlist, atLimit, isPro }: Props) {
  const router = useRouter();
  const [inWatchlist, setInWatchlist] = useState(initiallyInWatchlist);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (inWatchlist) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#a6a6a6]">
        <IconCheck size={14} stroke={2} />
        등록됨
      </span>
    );
  }

  if (atLimit) {
    return (
      <span className="shrink-0 rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#a6a6a6]">
        한도 초과 {isPro ? "(최대 30종목)" : "(Pro에서 30종목)"}
      </span>
    );
  }

  async function handleAdd() {
    setAdding(true);
    setError(null);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    setAdding(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "추가에 실패했습니다.");
      return;
    }

    setInWatchlist(true);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
      >
        {adding ? "추가 중..." : "＋ 종목 추가"}
      </button>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
