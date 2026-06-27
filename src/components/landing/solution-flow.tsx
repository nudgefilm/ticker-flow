import { IconArrowDown, IconArrowRight } from "@tabler/icons-react";

const STEPS = ["공시", "뉴스", "어닝콜", "내부자 거래"];

export default function SolutionFlow() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-12 text-center">
        <h2 className="text-balance text-2xl font-semibold text-foreground md:text-3xl">
          TickerFlow는 기업의 변화를 한곳에서 보여드립니다.
        </h2>
      </div>

      {/* 모바일: 세로 / 데스크탑: 가로 flow */}
      <div className="flex flex-col items-center justify-center gap-3 md:flex-row md:gap-2">
        {STEPS.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-3 md:flex-row md:gap-2">
            <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-border bg-card text-sm font-medium text-foreground md:w-32">
              {step}
            </div>
            <IconArrowDown size={18} stroke={1.6} className="text-muted-foreground md:hidden" />
            <IconArrowRight size={18} stroke={1.6} className="hidden text-muted-foreground md:block" />
          </div>
        ))}
        <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-sm font-semibold text-blue-400 md:w-32">
          하나의 화면
        </div>
      </div>
    </section>
  );
}
