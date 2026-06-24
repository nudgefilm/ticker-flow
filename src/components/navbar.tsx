"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import { cn } from "@/lib/utils";

type DropdownKey = "모니터링" | "인사이트" | "매크로" | null;

const menus: {
  label: DropdownKey & string;
  items: { label: string; href: string; pro?: boolean }[];
}[] = [
  {
    label: "모니터링",
    items: [
      { label: "공시 피드", href: "/dashboard" },
      { label: "뉴스 피드", href: "/news" },
      { label: "실적 캘린더", href: "/earnings" },
    ],
  },
  {
    label: "인사이트",
    items: [
      { label: "종목 스냅샷", href: "/stocks" },
      { label: "공시 인사이트", href: "/analysis", pro: true },
      { label: "어닝콜 요약", href: "/calls", pro: true },
      { label: "인사이더", href: "/insider", pro: true },
      { label: "섹터 히트맵", href: "/sectors", pro: true },
    ],
  },
  {
    label: "매크로",
    items: [{ label: "경제지표", href: "/macro" }],
  },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<DropdownKey>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleMouseEnter(label: DropdownKey) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(label);
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setActive(null), 150);
  }

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
        {/* 좌측: 로고 */}
        <Logo />

        {/* 우측: 드롭다운 메뉴 + 로그인 + 시작하기 */}
        <div className="flex items-center">
          <nav className="hidden items-center gap-1 md:flex">
            {menus.map((menu) => (
              <div
                key={menu.label}
                className="relative"
                onMouseEnter={() => handleMouseEnter(menu.label as DropdownKey)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 rounded-[6px] px-3 py-2 text-sm transition-colors",
                    active === menu.label
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {menu.label}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    className={cn(
                      "transition-transform duration-200",
                      active === menu.label && "rotate-180"
                    )}
                  >
                    <path
                      d="M2 4l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {active === menu.label && (
                  <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-background/95 py-1.5 shadow-lg backdrop-blur-md">
                    {menu.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                      >
                        {item.label}
                        {item.pro && (
                          <span className="rounded-[4px] bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                            Pro
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-3 border-l border-border pl-4 md:ml-4">
            <Link
              href="/dashboard"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:block"
            >
              로그인
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center rounded-[6px] border border-foreground px-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              시작하기
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
