import FilingCard from "@/components/filing-card";

const secText = `ITEM 2.02 RESULTS OF OPERATIONS AND FINANCIAL CONDITION

On February 12, 2026, Tesla, Inc. (the "Company") provided an update regarding its production guidance for the second quarter of fiscal year 2026. Pursuant to the Company's review of manufacturing capacity and supply chain constraints, management has determined it is necessary to revise its previously disclosed production targets for the Cybertruck platform. The Company currently anticipates production volumes to be reduced by approximately fifteen percent (15%) relative to previously communicated estimates. Furthermore, the completion of the Austin Gigafactory expansion has been delayed to fiscal year 2027. Capitalized terms used herein and not otherwise defined shall have the meanings ascribed to such terms in the Annual Report on Form 10-K filed with the Securities and Exchange Commission.`;

export default function Comparison() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
          SEC 원문을 읽지 않아도
          <br />
          중요한 변화는 확인할 수 있습니다
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          수십 페이지 분량의 공시 대신, 기업에 어떤 변화가 발생했는지 핵심만 빠르게 확인하세요.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 좌: SEC 원문 */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            SEC 원문
          </p>
          <div className="relative overflow-hidden rounded-lg border border-border bg-card">
            <div className="p-5">
              <p className="text-xs leading-relaxed text-foreground blur-[1.5px]">
                {secText}
              </p>
            </div>
            {/* 빨간 오버레이 */}
            <div className="absolute inset-0 bg-red-950/30" />
            {/* 하단 페이드 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-card to-transparent" />
          </div>
        </div>

        {/* 우: TickerFlow */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            TickerFlow
          </p>
          <FilingCard
            badgeColor="blue"
            badgeLabel="8-K 주요이벤트"
            company="TSLA · 테슬라"
            summary="머스크 CEO, 생산 목표 하향 조정. 사이버트럭 생산량을 기존 계획 대비 15% 축소. 오스틴 기가팩토리 완공 연기."
            keyNumbers="생산 목표 -15%"
            time="오늘 10:42 KST"
          />
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        같은 공시, 다른 경험
      </p>
    </section>
  );
}
