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
    content: `· 결제일로부터 7일 이내 환불 요청 시, 서비스 이용 이력이 없는 경우 전액 환불해 드립니다.\n· 서비스 이용 이력이 있는 경우 잔여 기간 기준 비례 환불이 적용됩니다.\n· 7일 이후에는 환불이 제공되지 않습니다.\n· 환불 요청: support@tickerflow.net`,
  },
  {
    title: "Cancellation",
    content: `· You may cancel your subscription at any time.\n· Upon cancellation, you will retain access until the end of your current billing period.\n· No additional charges will occur after cancellation.`,
  },
  {
    title: "Refunds",
    content: `· Refund requests made within 7 days of payment will be fully refunded, provided the service has not been used.\n· If the service has been used, a prorated refund based on the remaining period will be applied.\n· No refunds are provided after 7 days.\n· To request a refund: support@tickerflow.net`,
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
          최종 업데이트: 2026년 7월 5일
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
