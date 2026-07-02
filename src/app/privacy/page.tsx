import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata = {
  title: "개인정보처리방침 | TickerFlow",
};

const SECTIONS = [
  {
    title: "수집하는 개인정보",
    content: `서비스 이용 과정에서 아래와 같은 정보를 수집합니다.\n· 구글 계정 정보 (이메일, 이름, 프로필 사진)\n· 서비스 이용 기록 및 접속 로그\n· 결제 정보 (구독 플랜, 결제 일시)`,
  },
  {
    title: "개인정보 이용 목적",
    content: `수집한 개인정보는 다음 목적으로만 사용합니다.\n· 서비스 제공 및 회원 관리\n· 구독 플랜 관리 및 결제 처리\n· 서비스 개선 및 신규 기능 개발\n· 공지사항 및 서비스 관련 안내 발송`,
  },
  {
    title: "개인정보 보유 기간",
    content: `회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관 후 파기합니다.`,
  },
  {
    title: "개인정보 제3자 제공",
    content: `언폴드랩은 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, 결제 처리를 위해 Polar.sh에 최소한의 정보를 제공합니다.`,
  },
  {
    title: "문의",
    content: `개인정보 관련 문의사항은 아래로 연락해 주세요.\n· 운영사: 언폴드랩\n· 이메일: support@tickerflow.net`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          개인정보처리방침
        </h1>
        <p className="text-sm text-muted-foreground">
          최종 업데이트: 2026년 6월 24일
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
