import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { PricingPlans } from "@/components/pricing-plans";

export const metadata = {
  title: "요금제 | TickerFlow",
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-12 text-center">
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
            요금제
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            미국 기업의 중요한 변화, 놓치지 마세요.
            <br />
            필요한 만큼만 이용하는 심플한 요금제입니다.
          </p>
        </div>

        <PricingPlans />
      </main>
      <Footer />
    </>
  );
}
