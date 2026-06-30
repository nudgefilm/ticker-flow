import type { ReactNode } from "react";
import { FilingBadge } from "@/components/filing-card";
import { cn } from "@/lib/utils";

/* ─── 내부 목업 컴포넌트들 ──────────────────────────────────────────────── */

function CompactFiling({
  color,
  ticker,
  label,
  time,
}: {
  color: "blue" | "green" | "amber";
  ticker: string;
  label: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[6px] border border-border bg-card px-3 py-2.5">
      <FilingBadge color={color} label={ticker} />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

function EarningsRow({
  ticker,
  dDay,
  eps,
}: {
  ticker: string;
  dDay: string;
  eps: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[6px] border border-border bg-card px-3 py-2.5">
      <span className="text-sm font-medium text-foreground">{ticker}</span>
      <span className="text-sm tabular-nums text-muted-foreground">
        EPS {eps}
      </span>
      <span className="rounded-[4px] bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-400">
        {dDay}
      </span>
    </div>
  );
}

function StockCard() {
  const metrics = [
    { label: "시총", value: "$2.15T" },
    { label: "52주 고가", value: "$974" },
    { label: "다음 실적", value: "D-18" },
  ];
  const chips = ["내부자 거래 1건", "신규 공시 3건", "실적 발표 D-18"];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div>
        <p className="text-base font-semibold text-foreground">엔비디아</p>
        <p className="text-sm text-muted-foreground">NVDA</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map(({ label, value }) => (
          <div
            key={label}
            className="rounded border border-border bg-secondary/50 px-2 py-2 text-center"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
              {value}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip}
            className="rounded-[4px] border border-border bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── FeatureRow ────────────────────────────────────────────────────────── */

interface FeatureRowProps {
  title: string;
  description: string;
  mockup: ReactNode;
  reverse?: boolean;
}

function FeatureRow({ title, description, mockup, reverse = false }: FeatureRowProps) {
  return (
    <div className="grid items-center gap-12 md:grid-cols-2">
      <div className={cn(reverse && "md:order-2")}>
        <h3 className="text-xl font-semibold text-foreground md:text-2xl">
          {title}
        </h3>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
      <div className={cn(reverse && "md:order-1")}>{mockup}</div>
    </div>
  );
}

/* ─── 데이터 ─────────────────────────────────────────────────────────────── */

const features: FeatureRowProps[] = [
  {
    title: "기업의 중요한 변화, 매일 확인",
    description:
      "실적 발표\n대규모 계약\nCEO 교체\n내부자 거래\n\n미국 기업의 주요 변화를 빠르게 정리합니다.",
    mockup: (
      <div className="space-y-2">
        <CompactFiling color="blue" ticker="TSLA" label="8-K 주요이벤트" time="오늘 23:14" />
        <CompactFiling color="green" ticker="NVDA" label="10-Q 분기보고서" time="어제 06:02" />
        <CompactFiling color="amber" ticker="PLTR" label="Form 4 내부자거래" time="2일 전 09:30" />
      </div>
    ),
  },
  {
    title: "실적 발표, 한국 시간으로",
    description:
      "나스닥 주요 종목의 실적 발표 일정을 한국 시간(KST)으로 확인하세요. 시장 예상 EPS와 실적 발표 일정을 함께 확인할 수 있습니다.",
    mockup: (
      <div className="space-y-2">
        <EarningsRow ticker="NVDA" dDay="D-2" eps="$2.80" />
        <EarningsRow ticker="AAPL" dDay="D-3" eps="$1.43" />
        <EarningsRow ticker="MSFT" dDay="D-4" eps="$3.11" />
        <EarningsRow ticker="META" dDay="D-5" eps="$5.22" />
      </div>
    ),
    reverse: true,
  },
  {
    title: "관심 종목의 변화, 한 화면에서",
    description:
      "최근 공시\n관련 뉴스\n실적 일정\n내부자 거래\n\n관심 종목의 모든 변화를 한 페이지에서 확인할 수 있습니다.",
    mockup: <StockCard />,
  },
];

/* ─── 섹션 ──────────────────────────────────────────────────────────────── */

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="space-y-20 md:space-y-28">
        {features.map((feature) => (
          <FeatureRow key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}
