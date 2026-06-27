const MOCKUP_ROWS = [
  { badge: "8-K", badgeClass: "bg-blue-500/20 text-blue-400", ticker: "NVDA", time: "12분 전", text: "데이터센터 부문 신규 공급 계약 관련 주요 사항을 보고했습니다." },
  { badge: "Form 4", badgeClass: "bg-amber-500/20 text-amber-400", ticker: "TSLA", time: "38분 전", text: "등기임원의 보통주 거래 내역이 접수되었습니다." },
  { badge: "10-Q", badgeClass: "bg-green-500/20 text-green-400", ticker: "MSFT", time: "2시간 전", text: "분기 보고서가 제출되었습니다. 클라우드 부문 매출이 함께 공개되었습니다." },
];

export default function Hero() {
  return (
    <section className="pb-20 pt-36 md:pt-40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
        {/* 좌측: 텍스트 */}
        <div className="animate-fade-in flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            미국 기업의 변화, 놓치지 마세요.
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
            <span
              className="text-blue-400"
              style={{ filter: "drop-shadow(0 0 10px rgba(96, 165, 250, 0.6))" }}
            >
              TickerFlow
            </span>
            <br />
            나스닥 모니터링
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            공시, 어닝콜, 내부자 거래, 뉴스를 한국어로.
            <br className="hidden sm:block" />
            여러 사이트를 오갈 필요 없이 하나의 화면에서 확인하세요.
          </p>

        </div>

        {/* 우측: 대시보드 목업 */}
        <div className="relative hidden lg:block">
          <div className="absolute -inset-8 -z-10 rounded-3xl bg-blue-500/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-[#0f0f0f] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">tickerflow.net</span>
            </div>
            <div className="space-y-2 p-4">
              {MOCKUP_ROWS.map((row) => (
                <div key={row.ticker} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${row.badgeClass}`}>
                      {row.badge}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">{row.ticker}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{row.time}</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/70">{row.text}</p>
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
