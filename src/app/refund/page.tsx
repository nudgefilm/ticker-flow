import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata = {
  title: "환불정책 | TickerFlow",
};

const SECTIONS = [
  {
    title: "구독 취소",
    content: `· 구독은 언제든지 취소할 수 있습니다.\n· 취소 시 현재 결제 기간이 종료될 때까지 서비스를 이용할 수 있습니다.\n· 취소 후 추가 결제는 발생하지 않습니다.`,
  },
  {
    title: "환불",
    content: `· 결제일로부터 14일 이내, 서비스를 이용하지 않은 경우 전액 환불해 드립니다. (Paddle Buyer Terms 및 전자상거래법 기준 — 국내 전자상거래법상 청약철회 기간인 7일보다 더 긴 14일을 적용해 드립니다.)\n· 월간 플랜: 14일 경과 후 해지 시 환불이 제공되지 않습니다. 다만 자동 갱신은 즉시 중단되며, 이미 결제한 기간 동안은 서비스를 계속 이용하실 수 있습니다.\n· 연간 플랜: 14일 경과 후 해지 시, 해지 신청월을 제외한 나머지 개월 수에 대해 월 단위로 환불해 드립니다. (연간 결제액 ÷ 12 × 잔여 개월 수. 1개월 미만 잔여일수는 계산하지 않습니다.)\n· 환불 요청: support@tickerflow.net\n· 환불은 결제 대행사(Paddle)의 검토 절차를 거쳐 처리되며, 승인까지 다소 시일이 소요될 수 있습니다.`,
  },
  {
    title: "Cancellation",
    content: `· You may cancel your subscription at any time.\n· Upon cancellation, you will retain access until the end of your current billing period.\n· No additional charges will occur after cancellation.`,
  },
  {
    title: "Refunds",
    content: `· If you request a refund within 14 days of payment and have not used the service, you will be fully refunded (per Paddle's Buyer Terms and Korea's e-commerce law — Paddle's 14-day window is longer than, and takes precedence over, the 7-day withdrawal period under Korean e-commerce law).\n· Monthly plan: No refund is provided after 14 days. Auto-renewal is cancelled immediately, and you retain access for the period already paid.\n· Annual plan: If cancelled after 14 days, you will be refunded on a monthly basis for the remaining months, excluding the month in which you cancel. (Annual payment ÷ 12 × remaining months. Partial months are not counted.)\n· To request a refund: support@tickerflow.net\n· Refunds are processed through our payment provider's (Paddle) review process, and approval may take some time.`,
  },
];

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          환불정책
        </h1>
        <p className="text-sm text-muted-foreground">
          최종 업데이트: 2026년 7월 6일
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 mt-8 text-base font-semibold text-foreground">
              {section.title}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {section.content}
            </p>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
