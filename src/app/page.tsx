import LandingShell from "@/components/landing-shell";
import Hero from "@/components/landing/hero";
import LiveFeed from "@/components/landing/live-feed";
import Problem from "@/components/landing/problem";
import SolutionFlow from "@/components/landing/solution-flow";
import FeatureCards from "@/components/landing/feature-cards";
import ProductTabs from "@/components/landing/product-tabs";
import WhyTickerFlow from "@/components/landing/why-tickerflow";
import TrustStats from "@/components/landing/trust-stats";
import Pricing from "@/components/landing/pricing";
import Faq from "@/components/landing/faq";
import FinalCta from "@/components/landing/final-cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div id="site-content" className="min-h-screen bg-background">
      <LandingShell>
        <main>
          <Hero />
          <LiveFeed />
          <Problem />
          <SolutionFlow />
          <FeatureCards />
          <ProductTabs />
          <WhyTickerFlow />
          <TrustStats />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </LandingShell>
    </div>
  );
}
