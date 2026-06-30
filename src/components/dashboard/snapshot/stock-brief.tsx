export function StockBriefPending({ ticker }: { ticker: string }) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#1a1a1a] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[#a6a6a6]">
            {ticker} BRIEF
          </p>
          <span className="rounded-[3px] bg-[#3b82f6]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#60a5fa]">
            Pro
          </span>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-[#666666]">BRIEF 생성 준비 중입니다. 잠시 후 다시 방문하시면 확인할 수 있습니다.</p>
      </div>
    </div>
  );
}

interface StockBriefProps {
  ticker: string;
  content: string;
  generatedAt: string;
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "1일 전";
  return `${diffDays}일 전`;
}

export function StockBrief({ ticker, content, generatedAt }: StockBriefProps) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111]">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#1a1a1a] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[#a6a6a6]">
            {ticker} BRIEF
          </p>
          <span className="rounded-[3px] bg-[#3b82f6]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#60a5fa]">
            Pro
          </span>
        </div>
        <span className="text-[11px] text-[#555555]">
          최근 업데이트: {relativeDate(generatedAt)}
        </span>
      </div>

      {/* 본문 */}
      <div className="px-5 py-4">
        <p className="text-sm leading-relaxed text-[#cccccc]">{content}</p>
        <p className="mt-3 text-[11px] text-[#555555]">
          최근 7일 공시·뉴스·내부자 거래·실적 정보를 바탕으로 제공됩니다. 투자 판단의 근거로 사용하지 마세요.
        </p>
      </div>
    </div>
  );
}
