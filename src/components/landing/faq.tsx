import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevronDown } from "@tabler/icons-react";

const PLAN_ROWS = [
  {
    plan: "Free",
    href: "/login",
    badgeClass: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    features: ["공시 피드", "뉴스 피드", "경제지표", "섹터 히트맵", "종목 스냅샷"],
  },
  {
    plan: "Pro",
    href: "/login",
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    features: ["어닝콜", "공시 인사이트", "내부자 거래", "와치리스트", "멤버 모니터링"],
  },
];

function PlanBreakdown() {
  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-border">
      {PLAN_ROWS.map((row) => (
        <div
          key={row.plan}
          className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
        >
          <Link
            href={row.href}
            className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold underline-offset-2 hover:underline ${row.badgeClass}`}
          >
            {row.plan}
          </Link>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {row.features.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const FAQS: { q: string; a: string; extra?: ReactNode }[] = [
  {
    q: "무료로 사용할 수 있나요?",
    a: "네. 주요 기능은 무료로 이용하실 수 있습니다. 더 많은 종목 모니터링, 어닝콜 요약, 공시 분석 등 고급 기능은 Pro 플랜에서 제공합니다.",
    extra: <PlanBreakdown />,
  },
  {
    q: "어떤 기업을 지원하나요?",
    a: "NASDAQ와 NYSE에 상장된 미국 기업을 대상으로 합니다. 관심 종목을 와치리스트에 등록하면 해당 기업의 공시, 뉴스, 어닝콜, 내부자 거래 등 주요 변화를 확인할 수 있습니다.",
  },
  {
    q: "데이터는 어디에서 수집하나요?",
    a: "미국 증권거래위원회(SEC) 공시를 비롯하여 공신력 있는 금융 공개 데이터를 수집하여 제공합니다. 각 콘텐츠에는 원문 링크가 함께 제공됩니다.",
  },
  {
    q: "어떤 내용이 제공되나요?",
    a: "공개된 공시와 어닝콜 원문을 바탕으로 기업의 핵심 내용이 한국어로 제공됩니다. 주요 공시, 경영진 발언, 핵심 질의응답, 내부자 거래 등 중요한 변화를 한눈에 확인할 수 있습니다.",
  },
  {
    q: "투자 추천 서비스인가요?",
    a: "아닙니다. TickerFlow는 공개된 기업 정보를 이해하기 쉽도록 정리하여 제공하는 모니터링 서비스입니다. 특정 종목에 대한 투자 권유나 투자 자문을 제공하지 않으며, 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.",
  },
];

export default function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">자주 묻는 질문</h2>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-lg border border-border bg-card px-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm font-medium text-foreground">
              {faq.q}
              <IconChevronDown
                size={18}
                stroke={1.6}
                className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="pb-4">
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              {faq.extra}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
