import Link from "next/link";
import { IconChevronRight, IconPointFilled } from "@tabler/icons-react";

/* ── 변화 유형 (중립적 표현만 사용) ───────────────────────────────────────── */
type ChangeType = "공시" | "실적" | "어닝콜" | "내부자 거래" | "뉴스";

const TYPE_STYLE: Record<ChangeType, { label: string; className: string }> = {
  공시: { label: "신규 공시", className: "bg-blue-500/15 text-blue-400" },
  뉴스: { label: "뉴스 증가", className: "bg-purple-500/15 text-purple-400" },
  "내부자 거래": { label: "내부자 거래", className: "bg-orange-500/15 text-orange-400" },
  실적: { label: "실적 발표 예정", className: "bg-teal-500/15 text-teal-400" },
  어닝콜: { label: "어닝콜 등록", className: "bg-zinc-500/15 text-zinc-300" },
};

type ChangeItem = {
  rank: number;
  ticker: string;
  company: string;
  type: ChangeType;
  summary: string;
};

/* ── 더미 데이터 (실제 API 연동 없음) ─────────────────────────────────────── */
const ITEMS: ChangeItem[] = [
  { rank: 1, ticker: "NVDA", company: "NVIDIA", type: "공시", summary: "8-K 공시 2건 등록" },
  { rank: 2, ticker: "AAPL", company: "Apple", type: "내부자 거래", summary: "CEO 내부자 매수 신고" },
  { rank: 3, ticker: "TSLA", company: "Tesla", type: "실적", summary: "실적 발표 D-3" },
  { rank: 4, ticker: "MSFT", company: "Microsoft", type: "뉴스", summary: "최근 24시간 뉴스 5건" },
  { rank: 5, ticker: "AMZN", company: "Amazon", type: "공시", summary: "10-Q 제출" },
  { rank: 6, ticker: "META", company: "Meta Platforms", type: "어닝콜", summary: "어닝콜 요약 등록" },
  { rank: 7, ticker: "GOOGL", company: "Alphabet", type: "공시", summary: "8-K 공시 등록" },
  { rank: 8, ticker: "NFLX", company: "Netflix", type: "내부자 거래", summary: "내부자 거래 신고" },
  { rank: 9, ticker: "AMD", company: "Advanced Micro Devices", type: "실적", summary: "실적 발표 D-5" },
  { rank: 10, ticker: "CRM", company: "Salesforce", type: "뉴스", summary: "최근 뉴스 증가" },
];

export default function DailyChanges() {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-6">
        {/* ── 헤더 ── */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <IconPointFilled size={12} className="text-emerald-400 animate-pulse" />
            LIVE · 최근 24시간 주요 변화
          </span>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl text-balance">
            오늘의 미국 기업 변화
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base text-pretty">
            미국 주요 기업에서 최근 발생한 공시, 실적 발표, 내부자 거래, 뉴스 등
            중요한 변화를 한눈에 확인할 수 있습니다.
          </p>

          <div className="mt-4 flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
            <span>2026년 6월 29일 기준</span>
            <span>매일 오전 8시(KST) 업데이트</span>
          </div>
        </div>

        {/* ── TOP 10 리스트 ── */}
        <ul className="flex flex-col gap-4">
          {ITEMS.map((item) => {
            const badge = TYPE_STYLE[item.type];
            return (
              <li key={item.rank}>
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-4 rounded-[12px] border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-muted/40 sm:p-5"
                >
                  {/* 왼쪽: 순위 + 티커 */}
                  <div className="flex min-w-0 shrink-0 items-center gap-3">
                    <span className="w-7 text-center text-xl font-bold tabular-nums text-muted-foreground sm:text-2xl">
                      {item.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-foreground">{item.ticker}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.company}</p>
                    </div>
                  </div>

                  {/* 가운데: 배지 */}
                  <div className="hidden sm:block">
                    <span
                      className={`whitespace-nowrap rounded-[6px] px-2.5 py-1 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* 오른쪽: 변화 요약 */}
                  <div className="ml-auto min-w-0 text-right">
                    <span
                      className={`mb-1 inline-block rounded-[6px] px-2 py-0.5 text-[10px] font-medium sm:hidden ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <p className="line-clamp-2 text-sm font-medium text-foreground">
                      {item.summary}
                    </p>
                  </div>

                  {/* 화살표 */}
                  <IconChevronRight
                    size={18}
                    className="shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ── CTA ── */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-8 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:w-auto"
          >
            전체 변화 보기
            <IconChevronRight size={16} />
          </Link>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            무료 회원가입 후 관심 종목의 변화를 확인할 수 있습니다.
          </p>
        </div>

        {/* ── 면책 문구 ── */}
        <div className="mt-10 rounded-[12px] border border-border bg-card/50 px-5 py-4">
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 변화를 정리한 참고용 서비스입니다.
            <br />
            특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.
            <br />
            투자 판단과 그 결과에 대한 책임은 이용자 본인에게 있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
