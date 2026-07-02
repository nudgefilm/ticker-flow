import Link from "next/link";

export type StockBriefState = "ready" | "pending" | "gated";

interface StockBriefProps {
  ticker: string;
  state: StockBriefState;
  descriptionKr?: string | null;
  companyImage?: string | null;
  content?: string | null;
  generatedAt?: string | null;
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "1일 전";
  return `${diffDays}일 전`;
}

function CompanyGlance({
  ticker,
  descriptionKr,
  companyImage,
}: {
  ticker: string;
  descriptionKr: string;
  companyImage?: string | null;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#a6a6a6]">
        기업 한눈에
      </p>
      <div className="flex items-start gap-3">
        {companyImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companyImage}
            alt={`${ticker} 로고`}
            className="mt-0.5 h-8 w-8 shrink-0 rounded-[4px] border border-white/[0.08] bg-white object-contain p-1"
          />
        ) : null}
        <p className="text-sm leading-relaxed text-[#cccccc]">{descriptionKr}</p>
      </div>
    </div>
  );
}

export function StockBrief({
  ticker,
  state,
  descriptionKr,
  companyImage,
  content,
  generatedAt,
}: StockBriefProps) {
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
        {state === "ready" && generatedAt ? (
          <span className="text-[11px] text-[#555555]">
            최근 업데이트: {relativeDate(generatedAt)}
          </span>
        ) : null}
      </div>

      {/* 본문 */}
      <div className="px-5 py-4">
        {descriptionKr ? (
          <div className="border-b border-white/[0.06] pb-4">
            <CompanyGlance ticker={ticker} descriptionKr={descriptionKr} companyImage={companyImage} />
          </div>
        ) : null}

        <div className={descriptionKr ? "pt-4" : ""}>
          {state === "ready" && content ? (
            <>
              <p className="text-sm leading-relaxed text-[#cccccc]">{content}</p>
              <p className="mt-3 text-[11px] text-[#555555]">
                최근 30일 공시·뉴스·내부자 거래·실적 정보를 바탕으로 제공됩니다. 투자 판단의 근거로 사용하지 마세요.
              </p>
            </>
          ) : state === "pending" ? (
            <p className="text-sm text-[#666666]">
              BRIEF 생성 준비 중입니다. 잠시 후 다시 방문하시면 확인할 수 있습니다.
            </p>
          ) : state === "gated" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#a6a6a6]">
                최근 기업 동향 요약은 Pro 플랜에서 확인할 수 있습니다.
              </p>
              <Link
                href="/billing"
                className="shrink-0 rounded-[6px] bg-white px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/90"
              >
                Pro 시작하기
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
