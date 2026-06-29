"use client";

import Link from "next/link";
import { useState } from "react";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

function PlanBreakdown() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Free */}
      <div className="rounded-[10px] border border-border bg-muted/30 p-4">
        <Link href="/login" className="mb-3 inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-semibold text-foreground hover:bg-muted/80">
          Free
        </Link>
        <ul className="flex flex-col gap-2">
          {["공시 피드", "뉴스 피드", "실적 캘린더", "경제지표", "종목 스냅샷"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconCheck size={12} stroke={2} className="shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
      {/* Pro */}
      <div className="rounded-[10px] border border-amber-500/30 bg-amber-500/5 p-4">
        <Link href="/login" className="mb-3 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20">
          Pro
        </Link>
        <ul className="flex flex-col gap-2">
          {["Free 기능 전체 포함", "어닝콜 한국어 요약", "공시 인사이트", "내부자 거래", "섹터 히트맵", "알림 설정"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconCheck size={12} stroke={2} className="shrink-0 text-amber-400" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const FAQS: { q: string; a: string; extra?: React.ReactNode }[] = [
  {
    q: "무료로 사용할 수 있나요?",
    a: "네. 공시 피드, 뉴스 피드, 실적 캘린더, 경제지표, 종목 스냅샷은 무료로 이용하실 수 있습니다. 어닝콜 한국어 요약, 공시 인사이트, 내부자 거래, 섹터 히트맵, 알림 설정 등 고급 기능은 Pro 플랜에서 제공합니다.",
    extra: <PlanBreakdown />,
  },
  {
    q: "어떤 기업을 지원하나요?",
    a: "NASDAQ와 NYSE에 상장된 미국 기업을 대상으로 합니다. 관심 종목을 와치리스트에 등록하면 해당 기업의 공시, 뉴스, 어닝콜, 내부자 거래 등 주요 변화를 확인할 수 있습니다.",
  },
  {
    q: "데이터는 어디에서 수집하나요?",
    a: "미국 증권거래위원회(SEC) 공시를 비롯하여 공신력 있는 금융 공개 데이터를 수집하여 제공합니다. 각 콘텐츠에는 원문 링크가 함께 제공되어 사용자가 직접 확인하실 수 있습니다.",
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

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-2">
      {FAQS.map((faq, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[10px] border border-border bg-card"
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/40"
          >
            <span className="text-sm font-medium text-foreground">{faq.q}</span>
            <IconChevronDown
              size={16}
              stroke={1.5}
              className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
                open === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === i && (
            <div className="border-t border-border px-6 pb-5 pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              {faq.extra}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
