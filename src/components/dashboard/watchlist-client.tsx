"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCircleCheck, IconRefresh, IconX } from "@tabler/icons-react";
import WatchlistCard, { type WatchlistStock } from "@/components/dashboard/watchlist-card";

const FREE_LIMIT = 5;
const PRO_LIMIT = 30;

export default function WatchlistClient({
  initialStocks,
  isPro,
}: {
  initialStocks: WatchlistStock[];
  isPro: boolean;
}) {
  const router = useRouter();
  const stocks = initialStocks;

  const [deletingTicker, setDeletingTicker] = useState<string | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [collectStatus, setCollectStatus] = useState<"collecting" | "done" | null>(null);

  // 수집 완료 3초 후 자동 닫기
  useEffect(() => {
    if (collectStatus !== "done") return;
    const t = setTimeout(() => setCollectStatus(null), 3000);
    return () => clearTimeout(t);
  }, [collectStatus]);

  const totalFilings = stocks.reduce((sum, s) => sum + s.newFilings, 0);
  const totalNews = stocks.reduce((sum, s) => sum + s.newNews, 0);
  const earningsImminentCount = stocks.filter((s) => s.earningsDday !== "—").length;
  const atLimit = isPro ? stocks.length >= PRO_LIMIT : stocks.length >= FREE_LIMIT;

  async function handleDelete(ticker: string) {
    setDeletingTicker(ticker);
    await fetch(`/api/watchlist/${ticker}`, { method: "DELETE" });
    setDeletingTicker(null);
    router.refresh();
  }

  async function handleAdd() {
    const ticker = addInput.trim().toUpperCase();
    if (!ticker) return;
    setAdding(true);
    setAddError("");

    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticker }),
    });

    setAdding(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAddError(data.error ?? "추가에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    setAddInput("");
    setShowAddInput(false);
    router.refresh();

    // 백그라운드 수집 시작
    setCollectStatus("collecting");
    fetch(`/api/collect/watchlist-ticker?ticker=${ticker}`)
      .then(() => {
        setCollectStatus("done");
        router.refresh();
      })
      .catch(() => setCollectStatus("done"));
  }

  return (
    <>
      {/* 정보 바 */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-white">
            {`내 등록 종목 (${stocks.length} / ${isPro ? PRO_LIMIT : FREE_LIMIT})`}
          </span>
          {!isPro && (
            <span className="text-sm text-[#a6a6a6]">
              Free 플랜은 최대 {FREE_LIMIT}종목까지 등록 가능합니다.
            </span>
          )}
          {isPro && stocks.length >= PRO_LIMIT && (
            <span className="text-sm text-[#a6a6a6]">
              와치리스트는 최대 {PRO_LIMIT}개까지 등록 가능합니다.
            </span>
          )}
        </div>
        {atLimit ? (
          <button
            disabled
            className="h-9 cursor-not-allowed rounded-[6px] border border-white/[0.08] px-3 text-sm text-[#a6a6a6]"
          >
            + 종목 추가
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowAddInput(true);
              setAddError("");
            }}
            className="h-9 shrink-0 rounded-[6px] border border-white/[0.08] px-3 text-sm text-white transition-colors hover:bg-[#1a1a1a]"
          >
            + 종목 추가
          </button>
        )}
      </div>

      {/* 종목 추가 입력 */}
      {showAddInput && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={addInput}
              onChange={(e) => setAddInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && !adding && handleAdd()}
              placeholder="티커 입력 (예: AAPL)"
              maxLength={10}
              autoFocus
              className="h-9 flex-1 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-3 text-sm text-white placeholder-[#a6a6a6] outline-none focus:border-white/20"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addInput.trim()}
              className="h-9 rounded-[6px] border border-white/[0.08] px-4 text-sm text-white transition-colors hover:bg-[#1a1a1a] disabled:opacity-50"
            >
              {adding ? "추가 중..." : "추가"}
            </button>
            <button
              onClick={() => {
                setShowAddInput(false);
                setAddInput("");
                setAddError("");
              }}
              className="h-9 rounded-[6px] px-3 text-sm text-[#a6a6a6] transition-colors hover:text-white"
            >
              취소
            </button>
          </div>
          {addError && <p className="text-xs text-red-400">{addError}</p>}
        </div>
      )}

      {/* 최근 7일 변화 요약 */}
      {stocks.length > 0 && (
        <div className="mt-5 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">최근 7일 변화</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "공시", count: `${totalFilings}건` },
              { label: "뉴스", count: `${totalNews}건` },
              { label: "실적 임박", count: `${earningsImminentCount}건` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[4px] bg-blue-500/[0.15] px-3 py-2.5 text-center">
                <p className="text-xl font-semibold tabular-nums text-white">{stat.count}</p>
                <p className="mt-0.5 text-xs text-[#a6a6a6]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 종목 없음 */}
      {stocks.length === 0 && (
        <p className="mt-10 text-center text-sm text-[#a6a6a6]">
          등록된 종목이 없습니다. 종목을 추가해주세요.
        </p>
      )}

      {/* 종목 카드 그리드 */}
      {stocks.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {stocks.map((stock, i) => (
            <div
              key={stock.ticker}
              className={
                stocks.length % 2 !== 0 && i === stocks.length - 1
                  ? "md:col-span-2"
                  : undefined
              }
            >
              <WatchlistCard
                stock={stock}
                onDelete={() => handleDelete(stock.ticker)}
                isDeleting={deletingTicker === stock.ticker}
              />
            </div>
          ))}
        </div>
      )}

      {/* 수집 중 토스트 */}
      {collectStatus && (
        <div className="fixed bottom-5 right-5 z-50 w-80 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-4 shadow-xl">
          <div className="flex items-start gap-3">
            {collectStatus === "collecting" ? (
              <IconRefresh size={16} stroke={1.5} className="mt-0.5 shrink-0 animate-spin text-blue-400" />
            ) : (
              <IconCircleCheck size={16} stroke={1.5} className="mt-0.5 shrink-0 text-green-400" />
            )}
            <p className="flex-1 text-sm leading-relaxed text-white">
              {collectStatus === "collecting"
                ? "등록 종목에 대한 최근 30일 이내 공시와 최근 7일 뉴스를 수집하고 있습니다."
                : "수집이 완료되었습니다."}
            </p>
            {collectStatus === "done" && (
              <button
                type="button"
                onClick={() => setCollectStatus(null)}
                className="shrink-0 text-[#a6a6a6] transition-colors hover:text-white"
                aria-label="닫기"
              >
                <IconX size={14} stroke={1.5} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 업그레이드 배너 — Free 유저에게만 표시 */}
      {!isPro && (
        <div className="mt-3 flex items-center justify-between rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-5 py-4">
          <p className="text-sm text-[#cccccc]">
            Pro로 업그레이드하면 최대 {PRO_LIMIT}종목까지 등록하고 모든 기능을 이용할 수 있습니다.
          </p>
          <button className="h-9 shrink-0 rounded-[6px] border border-white/[0.08] px-3 text-sm text-white transition-colors hover:bg-[#1a1a1a]">
            Pro 시작하기
          </button>
        </div>
      )}
    </>
  );
}
