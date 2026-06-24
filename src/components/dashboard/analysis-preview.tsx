import { IconChevronRight } from "@tabler/icons-react";
import type { ReactNode } from "react";

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#444444]">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const ACCORDION_ROWS = [
  "사업 개요",
  "핵심 리스크 요인",
  "재무 성과 요약",
  "재무제표 핵심 수치",
  "경영진 전망",
];

export default function AnalysisPreview() {
  return (
    <div className="mt-8">
      <p className="text-xs uppercase tracking-widest text-[#444444]">실제 제공되는 리포트 예시</p>

      <div
        className="mt-4 grid grid-cols-1 gap-3 blur-sm select-none md:grid-cols-2"
        aria-hidden="true"
      >
        {/* Card 1: 8-K 심층 분석 */}
        <div className="pointer-events-none rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          {/* 상단 */}
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-400">
              8-K
            </span>
            <span className="text-sm font-medium text-white">NVDA · 엔비디아</span>
            <span className="ml-auto text-xs text-[#a6a6a6]">3일 전</span>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <Section label="이벤트 성격">
              <p className="text-sm leading-relaxed text-[#cccccc]">
                엔비디아가 2026 회계연도 3분기 실적을 발표했습니다. 데이터센터 부문의 강력한
                성장이 전체 실적을 견인했으며, 전분기 대비 매출 성장이 지속되었습니다.
              </p>
            </Section>

            <Section label="주목할 수치">
              <div className="flex flex-wrap gap-2">
                {["매출 $44.1B", "EPS $2.94", "데이터센터 비중 88%"].map((stat) => (
                  <span
                    key={stat}
                    className="rounded-[4px] bg-[#1a1a1a] px-2 py-1 text-xs text-[#cccccc]"
                  >
                    {stat}
                  </span>
                ))}
              </div>
            </Section>

            <Section label="업계 맥락">
              <p className="text-sm leading-relaxed text-[#cccccc]">
                반도체 업계 전반의 수요 회복과 함께 엔비디아의 독점적 시장 지위가 유지되고
                있습니다. 경쟁사 대비 데이터센터 매출 비중이 높은 수준을 유지하고 있습니다.
              </p>
            </Section>
          </div>

          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <button
              disabled
              className="rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#444444]"
            >
              PDF 다운로드
            </button>
          </div>
        </div>

        {/* Card 2: 10-K 연간보고서 요약 */}
        <div className="pointer-events-none rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          {/* 상단 */}
          <div className="flex items-center gap-2">
            <span className="rounded-[4px] border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[11px] font-medium text-green-400">
              10-K
            </span>
            <span className="text-sm font-medium text-white">AAPL · 애플</span>
            <span className="ml-auto text-xs text-[#a6a6a6]">2주 전</span>
          </div>

          {/* 아코디언 행 */}
          <div className="mt-4">
            {ACCORDION_ROWS.map((row) => (
              <div
                key={row}
                className="flex items-center justify-between border-t border-white/[0.06] py-3"
              >
                <span className="text-sm text-[#cccccc]">{row}</span>
                <IconChevronRight size={16} stroke={1.5} className="text-[#a6a6a6]" />
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.06] pt-3">
            <button
              disabled
              className="rounded-[6px] border border-white/[0.08] px-3 py-1.5 text-xs text-[#444444]"
            >
              PDF 다운로드
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
