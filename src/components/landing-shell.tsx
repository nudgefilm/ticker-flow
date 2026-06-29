"use client";

import { useState } from "react";
import Navbar from "@/components/navbar";
import LoginModal from "@/components/login-modal";
import NoticeBanner from "@/components/notice-banner";

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const [showLogin, setShowLogin] = useState(false);
  return (
    <>
      <NoticeBanner />
      <Navbar onOpenLogin={() => setShowLogin(true)} />
      {children}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
