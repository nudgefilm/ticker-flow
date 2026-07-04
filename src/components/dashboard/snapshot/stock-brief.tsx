import Link from "next/link";
import { IconLock } from "@tabler/icons-react";

export type StockBriefState = "ready" | "pending" | "gated";

interface StockBriefProps {
  ticker: string;
  state: StockBriefState;
  content?: string | null;
  generatedAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "1일 전";
  return `${diffDays}일 전`;
}

function shortDate(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", ".");
}

export function CompanyGlanceCard({
  ticker,
  descriptionKr,
  companyImage,
}: {
  ticker: string;
  descriptionKr: string;
  companyImage?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111111]">
      <div className="border-b border-white/[0.06] bg-[#1a1a1a] px-5 py-3.5">
        <p className="text-xs font-medium uppercase tracking-widest text-[#a6a6a6]">
          기업 한눈에
        </p>
      </div>
      <div className="flex items-start gap-3 px-5 py-4">
        {companyImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companyImage}
            alt={`${ticker} 로고`}
            className="mt-0.5 h-8 w-8 shrink-0 rounded-[4px] border border-white/[0.08] bg-white object-contain p-1"
          />
        ) : null}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#cccccc]">
          {descriptionKr}
        </p>
      </div>
    </div>
  );
}

export function StockBrief({
  ticker,
  state,
  content,
  generatedAt,
  periodStart,
  periodEnd,
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
        <div>
          {state === "ready" && content ? (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#a6a6a6]">
                최근 동향
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#cccccc]">
                {content}
              </p>
              <p className="mt-3 text-[11px] text-[#cccccc]">
                📌 최근 30일 공시·뉴스·내부자 거래·실적 정보를 바탕으로 제공됩니다. 투자 판단의 근거로 사용하지 마세요.
                {periodStart && periodEnd
                  ? ` (기준 기간: ${shortDate(periodStart)} ~ ${shortDate(periodEnd)})`
                  : null}
              </p>
            </>
          ) : state === "pending" ? (
            <p className="text-sm text-[#666666]">
              BRIEF 생성 준비 중입니다. 잠시 후 다시 방문하시면 확인할 수 있습니다.
            </p>
          ) : state === "gated" ? (
            <div className="relative">
              {/* 흐린 콘텐츠 — 실제 BRIEF 항목처럼 보이도록 배치 */}
              <div aria-hidden="true" className="pointer-events-none select-none blur-[4px]">
                <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#a6a6a6]">
                  최근 동향
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#cccccc]">
                  최근 30일간 신규 공시가 등록되었으며, 내부자 거래와 실적 발표 일정에 변화가 확인되었습니다.
                  관련 뉴스에서도 사업 현황에 대한 주요 내용이 다수 보도되었습니다.
                  세부 항목은 공시, 내부자 거래, 실적, 뉴스 순으로 정리되어 제공됩니다.
                </p>
                <p className="mt-3 text-[11px] text-[#cccccc]">
                  📌 최근 30일 공시·뉴스·내부자 거래·실적 정보를 바탕으로 제공됩니다. 투자 판단의 근거로 사용하지 마세요.
                </p>
              </div>

              {/* 중앙 오버레이 잠금 카드 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex max-w-xs flex-col items-center gap-2 rounded-xl border border-white/[0.12] bg-[#1a1a1a] p-6 text-center">
                  <IconLock className="size-6 shrink-0 text-[#60a5fa]" stroke={1.75} />
                  <p className="text-sm text-[#cccccc]">Pro 플랜에서 확인할 수 있습니다.</p>
                  <Link
                    href="/billing"
                    className="mt-1 shrink-0 rounded-[6px] bg-white px-4 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white/90"
                  >
                    Pro 시작하기 →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
