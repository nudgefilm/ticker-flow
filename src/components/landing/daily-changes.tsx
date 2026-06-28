import Link from "next/link";
import { IconChevronRight, IconPointFilled } from "@tabler/icons-react";

/* ── 변화 유형 (중립적 표현만 사용) ───────────────────────────────────────── */
type ChangeType = "공시" | "실적" | "어닝콜" | "내부자 거래" | "뉴스";

const TYPE_STYLE: Record<
  ChangeType,
  { label: string; text: string; bar: string; dot: string; ring: string; soft: string }
> = {
  공시: {
    label: "공시",
    text: "text-blue-400",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
    ring: "group-hover:border-blue-500/50",
    soft: "bg-blue-500/10",
  },
  뉴스: {
    label: "뉴스",
    text: "text-purple-400",
    bar: "bg-purple-500",
    dot: "bg-purple-500",
    ring: "group-hover:border-purple-500/50",
    soft: "bg-purple-500/10",
  },
  "내부자 거래": {
    label: "내부자",
    text: "text-orange-400",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
    ring: "group-hover:border-orange-500/50",
    soft: "bg-orange-500/10",
  },
  실적: {
    label: "실적",
    text: "text-teal-400",
    bar: "bg-teal-500",
    dot: "bg-teal-500",
    ring: "group-hover:border-teal-500/50",
    soft: "bg-teal-500/10",
  },
  어닝콜: {
    label: "어닝콜",
    text: "text-zinc-300",
    bar: "bg-zinc-400",
    dot: "bg-zinc-400",
    ring: "group-hover:border-zinc-400/50",
    soft: "bg-zinc-400/10",
  },
};

type ChangeItem = {
  rank: number;
  ticker: string;
  company: string;
  type: ChangeType;
  summary: string;
  count: number;
  intensity: number; // 0~100
};

/* ── 더미 데이터 (실제 API 연동 없음) ─────────────────────────────────────── */
const ITEMS: ChangeItem[] = [
  { rank: 1, ticker: "NVDA", company: "NVIDIA", type: "공시", summary: "8-K 공시 2건", count: 12, intensity: 100 },
  { rank: 2, ticker: "AAPL", company: "Apple", type: "내부자 거래", summary: "내부자 매수 신고", count: 9, intensity: 82 },
  { rank: 3, ticker: "TSLA", company: "Tesla", type: "실적", summary: "실적 발표 D-3", count: 8, intensity: 74 },
  { rank: 4, ticker: "MSFT", company: "Microsoft", type: "뉴스", summary: "뉴스 5건", count: 7, intensity: 65 },
  { rank: 5, ticker: "AMZN", company: "Amazon", type: "공시", summary: "10-Q 제출", count: 6, intensity: 58 },
  { rank: 6, ticker: "META", company: "Meta", type: "어닝콜", summary: "어닝콜 요약", count: 5, intensity: 48 },
  { rank: 7, ticker: "GOOGL", company: "Alphabet", type: "공시", summary: "8-K 공시", count: 4, intensity: 40 },
  { rank: 8, ticker: "NFLX", company: "Netflix", type: "내부자 거래", summary: "내부자 거래 신고", count: 4, intensity: 36 },
  { rank: 9, ticker: "AMD", company: "AMD", type: "실적", summary: "실적 발표 D-5", count: 3, intensity: 28 },
  { rank: 10, ticker: "CRM", company: "Salesforce", type: "뉴스", summary: "뉴스 증가", count: 3, intensity: 22 },
];

/* ── 상단 요약 통계 (유형별 집계 시각화) ──────────────────────────────────── */
const TOTAL = ITEMS.reduce((sum, i) => sum + i.count, 0);
const SUMMARY: { type: ChangeType; value: number }[] = (
  ["공시", "뉴스", "내부자 거래", "실적", "어닝콜"] as ChangeType[]
).map((type) => ({
  type,
  value: ITEMS.filter((i) => i.type === type).reduce((s, i) => s + i.count, 0),
}));

export default function DailyChanges() {
  return (
    <section className="py-12 lg:py-14">
      <div className="mx-auto max-w-5xl px-6">
        {/* ── 헤더 ── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <IconPointFilled size={12} className="animate-pulse text-emerald-400" />
              LIVE · 최근 24시간
            </span>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground md:text-2xl text-balance">
              오늘의 미국 기업 변화 <span className="text-muted-foreground">TOP 10</span>
            </h2>
          </div>
          <div className="text-left text-[11px] leading-tight text-muted-foreground sm:text-right">
            <span className="font-mono tabular-nums text-foreground">{TOTAL}</span>건의 변화 · 2026.06.29
            <br />
            매일 오전 8시(KST) 업데이트
          </div>
        </div>

        {/* ── 유형별 집계 막대 (스택 시각화) ── */}
        <div className="mb-2.5 flex h-2 w-full overflow-hidden rounded-full bg-muted">
          {SUMMARY.map((s) => (
            <div
              key={s.type}
              className={TYPE_STYLE[s.type].bar}
              style={{ width: `${(s.value / TOTAL) * 100}%` }}
              title={`${TYPE_STYLE[s.type].label} ${s.value}건`}
            />
          ))}
        </div>
        <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1">
          {SUMMARY.map((s) => (
            <span key={s.type} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`size-2 rounded-full ${TYPE_STYLE[s.type].dot}`} />
              {TYPE_STYLE[s.type].label}
              <span className="font-mono tabular-nums text-foreground">{s.value}</span>
            </span>
          ))}
        </div>

        {/* ── TOP 10 그리드 타일 (히트맵형 시각화) ── */}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ITEMS.map((item) => {
            const t = TYPE_STYLE[item.type];
            return (
              <li key={item.rank}>
                <Link
                  href="/dashboard"
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-[12px] border border-border bg-card p-3 transition-colors duration-150 hover:bg-muted/40 ${t.ring}`}
                >
                  {/* 순위 + 유형 점 */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold tabular-nums text-muted-foreground">
                      #{item.rank}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${t.text}`}>
                      <span className={`size-1.5 rounded-full ${t.dot}`} />
                      {t.label}
                    </span>
                  </div>

                  {/* 티커 + 회사 */}
                  <div>
                    <p className="font-mono text-base font-bold leading-none text-foreground">{item.ticker}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{item.company}</p>
                  </div>

                  {/* 변화 요약 */}
                  <p className="mt-2 line-clamp-1 text-[11px] text-foreground/80">{item.summary}</p>

                  {/* 활동 강도 막대 + 건수 (시각화) */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${item.intensity}%` }} />
                    </div>
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                      {item.count}
                      <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">건</span>
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* ── CTA + 면책 ── */}
        <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            공개 정보 기반 참고용 서비스이며, 투자 권유·자문을 제공하지 않습니다.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:w-auto"
          >
            전체 변화 보기
            <IconChevronRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
