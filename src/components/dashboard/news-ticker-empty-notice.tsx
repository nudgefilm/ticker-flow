"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconInfoCircle } from "@tabler/icons-react";

export function NewsTickerEmptyNotice({ ticker }: { ticker: string }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/news");
    }, 2500);
    return () => clearTimeout(t);
  }, [ticker, router]);

  return (
    <>
      <p className="py-10 text-center text-sm text-[#a6a6a6]">
        {ticker} 관련 뉴스가 없습니다.
      </p>
      <div className="fixed bottom-5 right-5 z-50 flex w-80 items-start gap-3 rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-4 shadow-xl">
        <IconInfoCircle size={16} stroke={1.5} className="mt-0.5 shrink-0 text-blue-400" />
        <p className="flex-1 text-sm leading-relaxed text-white">
          {ticker} 관련 뉴스가 없어 전체 뉴스 피드로 이동합니다.
        </p>
      </div>
    </>
  );
}
