"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconUsers,
  IconCreditCard,
  IconShieldStar,
  IconFileText,
  IconNews,
  IconLanguage,
  IconServer,
  IconClipboardList,
  IconSpeakerphone,
  IconAlertTriangle,
  IconCurrencyDollar,
  IconKey,
  IconRefresh,
  IconLogout,
  IconBrandYoutube,
} from "@tabler/icons-react";
import Logo from "@/components/logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const adminNavGroups: NavGroup[] = [
  {
    label: "개요",
    items: [
      { href: "/admin", label: "어드민 홈", icon: IconLayoutDashboard, exact: true },
    ],
  },
  {
    label: "유저",
    items: [
      { href: "/admin/users", label: "유저 목록", icon: IconUsers, exact: true },
      { href: "/admin/users/subscriptions", label: "구독 현황", icon: IconCreditCard },
      { href: "/admin/users/pro-grant", label: "Pro 수동 부여", icon: IconShieldStar },
    ],
  },
  {
    label: "데이터",
    items: [
      { href: "/admin/data/filings", label: "공시 수집 현황", icon: IconFileText },
      { href: "/admin/data/news", label: "뉴스 수집 현황", icon: IconNews },
      { href: "/admin/data/translation", label: "번역 사용량", icon: IconLanguage },
      { href: "/admin/data/api", label: "API 상태", icon: IconServer },
    ],
  },
  {
    label: "운영",
    items: [
      { href: "/admin/ops/filings", label: "공시 관리", icon: IconClipboardList },
      { href: "/admin/ops/notices", label: "공지사항 관리", icon: IconSpeakerphone },
      { href: "/admin/ops/reports", label: "문의·신고 목록", icon: IconAlertTriangle },
      { href: "/admin/youtube", label: "유튜브 채널", icon: IconBrandYoutube },
    ],
  },
  {
    label: "시스템",
    items: [
      { href: "/admin/system/costs", label: "비용 모니터링", icon: IconCurrencyDollar },
      { href: "/admin/system/env", label: "환경변수 상태", icon: IconKey },
      { href: "/admin/system/trigger", label: "수동 재수집", icon: IconRefresh },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/[0.08] bg-[#0f0f0f]">
      {/* 로고 */}
      <div className="flex-none px-4 py-4">
        <a href="https://www.tickerflow.net">
          <Logo />
        </a>
      </div>

      {/* Admin 배지 */}
      <div className="flex-none px-4 pb-3">
        <span className="inline-flex items-center rounded-[4px] bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-red-400">
          Admin
        </span>
      </div>

      {/* 네비게이션 */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-2">
        {adminNavGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="my-2 border-t border-white/[0.06]" />}
            <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-[#a6a6a6]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#a6a6a6] hover:bg-[#1a1a1a] hover:text-white"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-sm bg-red-400" />
                    )}
                    <item.icon size={18} stroke={1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 하단 */}
      <div className="flex-none border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-400">
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">관리자</p>
            <p className="truncate text-xs text-[#a6a6a6]">Admin 권한</p>
          </div>
          <a
            href="https://www.tickerflow.net"
            className="flex-none text-[#a6a6a6] transition-colors hover:text-white"
            aria-label="사이트로 이동"
          >
            <IconLogout size={16} stroke={1.5} />
          </a>
        </div>
      </div>
    </aside>
  );
}
