import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import RecentChanges from "@/components/recent-changes";
import Comparison from "@/components/comparison";
import Features from "@/components/features";
import Stats from "@/components/stats";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <RecentChanges />
        <Comparison />
        <Features />
        <Stats />
      </main>
      <Footer />
    </div>
  );
}
