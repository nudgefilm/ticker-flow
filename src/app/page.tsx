"use client";

import { useState } from "react";
import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import RecentChanges from "@/components/recent-changes";
import Comparison from "@/components/comparison";
import Features from "@/components/features";
import Stats from "@/components/stats";
import Footer from "@/components/footer";
import LoginModal from "@/components/login-modal";
import { cn } from "@/lib/utils";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div
        className={cn(
          "min-h-screen bg-background transition-[filter] duration-200",
          showLogin && "pointer-events-none blur-sm"
        )}
      >
        <Navbar onOpenLogin={() => setShowLogin(true)} />
        <main>
          <Hero />
          <RecentChanges />
          <Comparison />
          <Features />
          <Stats />
        </main>
        <Footer />
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
