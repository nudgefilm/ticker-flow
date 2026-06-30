import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata = {
  title: "데이터 출처 안내 | TickerFlow",
};

const SOURCES = [
  { title: "공시 정보",   content: "미국 증권거래위원회(SEC EDGAR) 공식 데이터베이스" },
  { title: "어닝콜",      content: "기업 공식 실적 발표 컨퍼런스콜 기반 한국어 요약" },
  { title: "뉴스",        content: "공개된 뉴스 매체 정보를 기반으로 제공됩니다." },
  { title: "실적 캘린더", content: "나스닥(NASDAQ)·뉴욕증권거래소(NYSE) 상장 기업의 실적 발표 일정을 기반으로 제공됩니다." },
  { title: "내부자 거래", content: "미국 증권거래위원회(SEC EDGAR) Form 4 공시 기반 임원·대주주 거래 내역" },
  { title: "경제지표",    content: "미국 연방준비제도(FRED) 데이터베이스 (GDP, CPI(소비자물가지수), 금리 등)" },
];

export default function DataSourcesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          데이터 출처 안내
        </h1>
        <p className="text-sm text-muted-foreground">
          최종 업데이트: 2026년 6월 25일
        </p>

        {SOURCES.map((source) => (
          <section key={source.title}>
            <h2 className="mb-3 mt-8 text-base font-semibold text-foreground">
              {source.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {source.content}
            </p>
          </section>
        ))}

        <p className="mt-12 text-sm leading-relaxed text-muted-foreground border-t border-border pt-8">
          본 서비스는 공개된 정보를 수집·정리·시각화하여 제공하며, 투자 판단의
          근거로 사용하기 전 원문 출처를 직접 확인하시기 바랍니다.
        </p>
      </main>
      <Footer />
    </>
  );
}
