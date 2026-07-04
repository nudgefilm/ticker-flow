"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconRefresh, IconX } from "@tabler/icons-react";

const POLL_INTERVAL_MS = 3_000;
const TIMEOUT_MS = 60_000;

interface Props {
  runId: string | null;
}

export function SnapshotCollectModal({ runId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(!!runId);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!runId) return;

    function stopPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/collect/snapshot-status?id=${runId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.run?.status === "done" || data.run?.status === "error") {
          stopPolling();
          setOpen(false);
          router.refresh();
        }
      } catch {
        // 네트워크 오류는 다음 폴링에서 재시도
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setOpen(false);
    }, TIMEOUT_MS);

    return stopPolling;
  }, [runId, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className="relative z-10 w-full max-w-sm rounded-[8px] border border-white/[0.08] bg-[#1a1a1a] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-[#a6a6a6] transition-colors hover:text-white"
        >
          <IconX size={18} stroke={1.5} />
        </button>

        <IconRefresh className="mx-auto h-8 w-8 animate-spin text-[#60a5fa]" stroke={1.5} />

        <p className="mt-4 text-sm font-semibold text-white">데이터 수집 중</p>
        <p className="mt-2 text-sm leading-relaxed text-[#a6a6a6]">
          이 종목의 추가된 데이터를 확인하고 있습니다. 잠시만 기다려 주세요.
        </p>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 rounded-[6px] border border-white/[0.08] px-4 py-1.5 text-xs text-white transition-colors hover:bg-[#242424]"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
