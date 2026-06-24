import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata = {
  title: "이용약관 | TickerFlow",
};

const sections = [
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
    title: "구독 및 결제",
    content: `· Free 플랜은 무료로 이용할 수 있습니다.\n· Pro 플랜은 월 ₩14,900 또는 연 ₩142,800으로 이용할 수 있습니다.\n· 구독은 언제든지 해지할 수 있으며, 해지 후에도 결제 기간 만료일까지 이용 가능합니다.`,
  },
  {
    title: "약관 변경",
    content: `본 약관은 서비스 개선을 위해 변경될 수 있습니다. 변경 시 서비스 내 공지를 통해 안내합니다.`,
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
        <h1 className="mb-2 text-2xl font-semibold text-foreground">이용약관</h1>
        <p className="text-sm text-muted-foreground">최종 업데이트: 2026년 6월 24일</p>

        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 mt-8 text-base font-semibold text-foreground">{section.title}</h2>
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
