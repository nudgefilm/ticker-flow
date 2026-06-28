"use client";

import Link from "next/link";
import { IconLock, IconUser, IconMicrophone, IconFlame, IconBell } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useProfile } from "@/lib/hooks/use-profile";

const ICON_MAP = {
  lock: IconLock,
  user: IconUser,
  microphone: IconMicrophone,
  flame: IconFlame,
  bell: IconBell,
} as const;

type IconName = keyof typeof ICON_MAP;

interface ProGateProps {
  children: ReactNode;
  iconName?: IconName;
  title?: string;
  description?: string;
}

export default function ProGate({
  children,
  iconName = "lock",
  title = "공시 인사이트는 Pro 전용 기능입니다",
  description = "SEC 공시 원문을 깊이 있게 분석한 한국어 리포트를 제공합니다.\n10-K 연간보고서 요약, 8-K 심층 분석, 10-Q 전분기 대비 변화 포인트.",
}: ProGateProps) {
  const profile = useProfile();
  const Icon = ICON_MAP[iconName];

  if (!profile) return null;

  if (profile.plan === "pro") return <>{children}</>;

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-6 py-8">
      <div className="flex flex-col items-center text-center">
        <Icon className="size-12 text-[#a6a6a6]" stroke={1.5} />
        <h2 className="mt-4 text-lg font-medium text-white">{title}</h2>
        <p className="mt-2 max-w-md whitespace-pre-line text-sm leading-relaxed text-[#a6a6a6]">
          {description}
        </p>
        <Link
          href="/billing"
          className="mt-6 rounded-[6px] bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
        >
          Pro 시작하기 →
        </Link>
        <Link
          href="/billing"
          className="mt-3 text-xs text-[#a6a6a6] underline underline-offset-2 transition-colors hover:text-[#cccccc]"
        >
          요금제 보기
        </Link>
      </div>
    </div>
  );
}
