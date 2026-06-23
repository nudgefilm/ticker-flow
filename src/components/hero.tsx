import Link from "next/link";
import FilingCard from "@/components/filing-card";

export default function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-36 md:pt-40">
      <div className="animate-fade-in flex flex-col items-center text-center">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
          미국 기업의 중요한 변화,
          <br />
          놓치지 마세요
        </h1>

        <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
          공시, 뉴스, 실적 일정을 한곳에서.
          <br />
          관심 종목의 주요 변화를 빠르게 확인하는 나스닥 모니터링 대시보드.
        </p>

        <Link
          href="#"
          className="mt-8 inline-flex h-11 items-center rounded-[6px] border border-foreground px-6 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          시작하기
        </Link>

        {/* 샘플 카드 2장 */}
        <div className="mt-16 grid w-full max-w-2xl gap-4 text-left md:grid-cols-2">
          <FilingCard
            badgeColor="blue"
            badgeLabel="8-K 주요이벤트"
            event="생산 목표 변경"
            company="TSLA · 테슬라"
            summary="머스크 CEO, 2026 2분기 생산 목표 하향 조정. 픽업트럭 사이버트럭 생산량을 기존 계획 대비 15% 축소."
            keyNumbers="생산 목표 -15% · 완공 연기 2027"
            time="오늘 10:42 KST"
          />
          <FilingCard
            badgeColor="green"
            badgeLabel="10-Q 분기보고서"
            event="가이던스 변경"
            company="NVDA · 엔비디아"
            summary="2026 회계연도 2분기 데이터센터 매출 $39B 기록. 전분기 대비 21% 성장."
            keyNumbers="데이터센터 $39B · +21% QoQ"
            time="어제 06:02 KST"
          />
        </div>
      </div>
    </section>
  );
}
