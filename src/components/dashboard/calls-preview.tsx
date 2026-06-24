import type { ReactNode } from "react";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#444444]">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="mt-2 first:mt-0">
      <p className="text-xs text-[#666666]">Q: {q}</p>
      <p className="mt-0.5 text-sm text-[#cccccc]">A: {a}</p>
    </div>
  );
}

export default function CallsPreview() {
  return (
    <div className="mt-8">
      <p className="text-xs uppercase tracking-widest text-[#444444]">요약 미리보기</p>

      <div
        className="mt-4 grid gap-3 blur-sm select-none md:grid-cols-2"
        aria-hidden="true"
      >
        {/* Card 1: NVDA */}
        <div className="pointer-events-none rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[4px] border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[11px] font-medium text-green-400">
              실적
            </span>
            <span className="text-sm font-medium text-white">NVDA · 엔비디아</span>
            <div className="ml-auto flex items-center gap-2 text-xs text-[#666666]">
              <span>Q2 FY2026</span>
              <span>3일 전</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <Section label="가이던스">
              <div className="flex flex-col gap-2">
                <span className="inline-flex w-fit items-center rounded-[4px] border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[11px] font-medium text-green-400">
                  상향
                </span>
                <p className="text-sm leading-relaxed text-[#cccccc]">
                  3분기 매출 가이던스 $450억~$460억 제시, 전분기 대비 약 5% 상향. 데이터센터
                  수요 강세를 근거로 마진 가이던스도 소폭 상향.
                </p>
              </div>
            </Section>

            <Section label="CEO 핵심 키워드 TOP 5">
              <div className="flex flex-wrap gap-1.5">
                {["Blackwell", "데이터센터", "수요", "마진", "중국"].map((kw) => (
                  <span
                    key={kw}
                    className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#cccccc]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </Section>

            <Section label="Q&A 핵심 문답">
              <div className="flex flex-col gap-3">
                <QA
                  q="중국 수출 규제 영향은?"
                  a="규제 준수 하에 대체 제품 개발 중이며 중장기 수요는 견조하다."
                />
                <QA
                  q="Blackwell 공급 일정은?"
                  a="2026년 하반기 본격 양산 예정, 수요 대비 공급 타이트한 상황."
                />
              </div>
            </Section>
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <p className="text-xs text-green-400">전분기 대비 톤: 낙관적 → 매우 낙관적</p>
          </div>
        </div>

        {/* Card 2: TSLA */}
        <div className="pointer-events-none rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[4px] border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[11px] font-medium text-green-400">
              실적
            </span>
            <span className="text-sm font-medium text-white">TSLA · 테슬라</span>
            <div className="ml-auto flex items-center gap-2 text-xs text-[#666666]">
              <span>Q2 FY2026</span>
              <span>1주 전</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <Section label="가이던스">
              <div className="flex flex-col gap-2">
                <span className="inline-flex w-fit items-center rounded-[4px] border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[11px] font-medium text-red-400">
                  하향
                </span>
                <p className="text-sm leading-relaxed text-[#cccccc]">
                  연간 차량 인도 목표를 기존 대비 10~15% 하향 조정. 사이버트럭 생산 차질과
                  일부 시장 수요 둔화 반영.
                </p>
              </div>
            </Section>

            <Section label="CEO 핵심 키워드 TOP 5">
              <div className="flex flex-wrap gap-1.5">
                {["사이버트럭", "FSD", "생산", "마진", "에너지"].map((kw) => (
                  <span
                    key={kw}
                    className="rounded-[4px] bg-[#1a1a1a] px-2 py-0.5 text-xs text-[#cccccc]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </Section>

            <Section label="Q&A 핵심 문답">
              <div className="flex flex-col gap-3">
                <QA
                  q="사이버트럭 생산 차질 원인은?"
                  a="부품 공급망 이슈로 인한 일시적 지연, 4분기 내 정상화 목표."
                />
                <QA
                  q="FSD 수익화 일정은?"
                  a="2026년 말 구독 모델 전환 검토 중, 규제 승인 일정에 따라 유동적."
                />
              </div>
            </Section>
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <p className="text-xs text-amber-400">전분기 대비 톤: 낙관적 → 신중</p>
          </div>
        </div>
      </div>
    </div>
  );
}
