"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 h-16 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link
            href="#features"
            className="transition-colors hover:text-foreground"
          >
            기능
          </Link>
          <Link
            href="#pricing"
            className="transition-colors hover:text-foreground"
          >
            요금제
          </Link>
          <Link href="#" className="transition-colors hover:text-foreground">
            로그인
          </Link>
        </nav>

        <Link
          href="#"
          className="inline-flex h-8 items-center rounded-[6px] border border-foreground px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          시작하기
        </Link>
      </div>
    </header>
  );
}
