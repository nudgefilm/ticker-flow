import Link from "next/link";
import { IconBell } from "@tabler/icons-react";

interface DashboardHeaderProps {
  title: string;
  isPro?: boolean;
  badge?: boolean;
}

export default function DashboardHeader({
  title,
  isPro = false,
  badge = false,
}: DashboardHeaderProps) {
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
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-white/[0.08] text-[#a6a6a6] transition-colors hover:text-white"
        >
          <IconBell size={18} stroke={1.5} />
        </button>

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
