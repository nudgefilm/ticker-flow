"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconBell,
  IconBrandTelegram,
  IconMail,
  IconChevronRight,
} from "@tabler/icons-react";
import { useProfile } from "@/lib/hooks/use-profile";

interface DashboardHeaderProps {
  title: string;
  badge?: boolean;
}

export default function DashboardHeader({ title, badge = false }: DashboardHeaderProps) {
  const profile = useProfile();
  const isPro = profile?.plan === "pro";

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-medium text-white">{title}</h1>
        {badge && (
          <span className="rounded-[4px] bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-medium text-white">
            Pro
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* 알림 드롭다운 */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-white/[0.08] text-[#a6a6a6] transition-colors hover:text-white"
          >
            <IconBell size={18} stroke={1.5} />
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-[8px] border border-white/[0.08] bg-[#111111] shadow-xl">
              {/* 헤더 */}
              <div className="border-b border-white/[0.06] px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#a6a6a6]">
                  알림
                </p>
              </div>

              {/* 텔레그램 채널 */}
              <a
                href="https://t.me/+c2UG4CGmAy1jMWQ9"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#1a1a1a]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#229ED9]/15">
                  <IconBrandTelegram size={16} stroke={1.5} className="text-[#229ED9]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">TickerFlow 텔레그램 채널</p>
                  <p className="text-xs text-[#a6a6a6]">무료로 가입하고 알림을 받으세요</p>
                </div>
                <IconChevronRight size={14} stroke={1.5} className="shrink-0 text-[#a6a6a6]" />
              </a>

              <div className="mx-4 border-t border-white/[0.06]" />

              {/* 이메일 다이제스트 */}
              <Link
                href={isPro ? "/alerts" : "/billing"}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#1a1a1a]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#60a5fa]/15">
                  <IconMail size={16} stroke={1.5} className="text-[#60a5fa]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white">이메일 다이제스트</p>
                    {!isPro && (
                      <span className="rounded-[3px] bg-[#3b82f6] px-1 py-0.5 text-[9px] font-medium leading-none text-white">
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#a6a6a6]">
                    {isPro
                      ? "설정에서 수신 주기를 변경할 수 있습니다"
                      : "Pro로 업그레이드하면 사용 가능합니다"}
                  </p>
                </div>
                {isPro ? (
                  <span className="shrink-0 rounded-[4px] border border-[#34d399]/30 bg-[#34d399]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#34d399]">
                    구독 중
                  </span>
                ) : (
                  <IconChevronRight size={14} stroke={1.5} className="shrink-0 text-[#a6a6a6]" />
                )}
              </Link>

              {/* 전체 알림 설정 */}
              <div className="border-t border-white/[0.06] px-4 py-2.5">
                <Link
                  href="/alerts"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between text-xs text-[#a6a6a6] transition-colors hover:text-white"
                >
                  <span>전체 알림 설정 보기</span>
                  <IconChevronRight size={12} stroke={1.5} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {!isPro && (
          <Link
            href="/billing"
            className="flex h-9 items-center rounded-[6px] bg-white px-3 text-sm font-medium text-black transition-colors hover:bg-white/90"
          >
            Pro로 업그레이드
          </Link>
        )}
      </div>
    </div>
  );
}
