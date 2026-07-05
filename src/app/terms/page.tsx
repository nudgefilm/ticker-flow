import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata = {
  title: "이용약관 | TickerFlow",
};

const SECTIONS = [
  {
    title: "서비스 개요",
    content: `TickerFlow(이하 '서비스')는 언폴드랩이 운영하는 나스닥 모니터링 대시보드입니다. 본 서비스는 공개된 정보를 수집·가공·시각화하여 제공하는 정보 서비스이며, 투자 자문 서비스가 아닙니다.`,
  },
  {
    title: "이용 조건",
    content: `· 만 19세 이상이면 누구나 이용할 수 있습니다.\n· 구글 계정을 통해 가입할 수 있습니다.\n· 1인 1계정 원칙을 준수해야 합니다.`,
  },
  {
    title: "서비스 이용 제한",
    content: `아래의 경우 서비스 이용이 제한될 수 있습니다.\n· 서비스 운영을 방해하는 행위\n· 타인의 개인정보를 도용하는 행위\n· 서비스 콘텐츠를 무단으로 복제·배포하는 행위`,
  },
  {
    title: "면책 조항",
    content: `본 서비스는 공개된 정보를 기반으로 시장 흐름을 시각화한 참고용 도구입니다. 특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다. 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다. 언폴드랩은 서비스 내 정보의 정확성·완전성을 보장하지 않으며, 이로 인한 손실에 대해 법적 책임을 지지 않습니다.`,
  },
  {
    title: "알림 및 이메일 발송",
    content: `· 서비스 가입 시 서비스 관련 이메일 수신에 동의한 것으로 간주합니다.\n· 가입 후 7일간 데일리 다이제스트를 무료로 발송합니다.\n· Pro 플랜 이용 중에는 데일리 다이제스트가 매일 발송됩니다.\n· 수신을 원하지 않으시면 이메일 하단의 수신 거부 링크를 통해 언제든지 거부할 수 있습니다.`,
  },
  {
    title: "구독 및 결제",
    content: `· Free 플랜은 무료로 이용할 수 있습니다.\n· Pro 플랜은 월 ₩14,900 또는 연 ₩142,800으로 이용할 수 있습니다.\n· 구독은 언제든지 해지할 수 있으며, 해지 후에도 결제 기간 만료일까지 이용 가능합니다.`,
  },
  {
    title: "환불 정책",
    content: `구독 취소\n· 구독은 언제든지 취소할 수 있습니다.\n· 취소 시 현재 결제 기간이 종료될 때까지 서비스를 이용할 수 있습니다.\n· 취소 후 추가 결제는 발생하지 않습니다.\n\n환불\n· 결제일로부터 7일 이내 환불 요청 시, 서비스 이용 이력이 없는 경우 전액 환불해 드립니다.\n· 서비스 이용 이력이 있는 경우 잔여 기간 기준 비례 환불이 적용됩니다.\n· 7일 이후에는 환불이 제공되지 않습니다.\n· 환불 요청은 support@tickerflow.net으로 문의해 주세요.\n\n문의\n· 결제 관련 문의: support@tickerflow.net`,
  },
  {
    title: "약관 변경",
    content: `본 약관은 서비스 개선을 위해 변경될 수 있습니다. 변경 시 서비스 내 공지를 통해 안내합니다.`,
  },
  {
    title: "데이터 출처",
    content: `본 서비스는 공개된 데이터와 제휴 데이터 제공업체의 정보를 활용합니다. 주요 데이터 출처는 다음과 같습니다.\n· 미국 증권거래위원회(SEC EDGAR)\n· 미국 연방준비제도(FRED)\n· Finnhub\n· Financial Modeling Prep(FMP)`,
  },
  {
    title: "문의",
    content: `서비스 이용 관련 문의사항은 아래로 연락해 주세요.\n· 운영사: 언폴드랩\n· 이메일: support@tickerflow.net`,
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          이용약관
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
