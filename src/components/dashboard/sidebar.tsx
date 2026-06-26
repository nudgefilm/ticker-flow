"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconStar,
  IconFileText,
  IconNews,
  IconCalendar,
  IconBuilding,
  IconBulb,
  IconMicrophone,
  IconUser,
  IconFlame,
  IconChartBar,
  IconBell,
  IconCreditCard,
  IconLogout,
} from "@tabler/icons-react";
import TickerSearch from "@/components/dashboard/ticker-search";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/lib/hooks/use-profile";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  pro?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "내 종목",
    items: [
      { href: "/watchlist", label: "와치리스트", icon: IconStar },
    ],
  },
  {
    label: "모니터링",
    items: [
      { href: "/dashboard", label: "공시 피드", icon: IconFileText },
      { href: "/news", label: "뉴스 피드", icon: IconNews },
      { href: "/earnings", label: "실적 캘린더", icon: IconCalendar },
    ],
  },
  {
    label: "인사이트",
    items: [
      { href: "/stocks", label: "종목 스냅샷", icon: IconBuilding },
      { href: "/analysis", label: "공시 인사이트", icon: IconBulb, pro: true },
      { href: "/calls", label: "어닝콜 요약", icon: IconMicrophone, pro: true },
      { href: "/insider", label: "인사이더", icon: IconUser, pro: true },
      { href: "/sectors", label: "섹터 히트맵", icon: IconFlame, pro: true },
    ],
  },
  {
    label: "매크로",
    items: [
      { href: "/macro", label: "경제지표", icon: IconChartBar },
    ],
  },
  {
    label: "설정",
    items: [
      { href: "/alerts", label: "알림 설정", icon: IconBell, pro: true },
      { href: "/billing", label: "구독 관리", icon: IconCreditCard },
      { href: "/mypage", label: "마이페이지", icon: IconUser },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/[0.08] bg-[#0f0f0f]">
      {/* 로고 */}
      <div className="flex-none px-4 py-4">
        <Link href="/">
          <span className="text-[19px] font-semibold tracking-tight text-white">TickerFlow</span>
        </Link>
      </div>

      {/* 검색 */}
      <div className="flex-none px-3 pb-3">
        <TickerSearch />
      </div>

      {/* 네비게이션 */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-2">
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && (
              <div className="my-2 border-t border-white/[0.06]" />
            )}
            <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-[#a6a6a6]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#a6a6a6] hover:bg-[#1a1a1a] hover:text-white"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-sm bg-white" />
                    )}
                    <item.icon size={18} stroke={1.5} />
                    <span>{item.label}</span>
                    {item.pro && (
                      <span className="ml-auto rounded-[4px] bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Pro
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 사용자 섹션 */}
      <div className="flex-none border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 flex-none">
            <AvatarFallback className="bg-[#1a1a1a] text-xs text-white">
              {profile?.initial ?? "—"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">{profile?.email ?? "—"}</p>
            <p className="truncate text-xs text-[#a6a6a6]">
              {profile?.plan === "pro" ? "Pro 플랜" : "Free 플랜"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-none text-[#a6a6a6] transition-colors hover:text-white"
            aria-label="로그아웃"
          >
            <IconLogout size={16} stroke={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
