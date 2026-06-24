import Link from "next/link";
import { IconLock } from "@tabler/icons-react";
import type { ComponentType } from "react";

interface ProGateProps {
  icon?: ComponentType<{ className?: string; stroke?: number }>;
  title?: string;
  description?: string;
}

export default function ProGate({
  icon: Icon = IconLock,
  title = "공시 인사이트는 Pro 전용 기능입니다",
  description = "SEC 공시 원문을 깊이 있게 분석한 한국어 리포트를 제공합니다.\n10-K 연간보고서 요약, 8-K 심층 분석, 10-Q 전분기 대비 변화 포인트.",
}: ProGateProps) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-8">
      <div className="flex flex-col items-center text-center">
        <Icon className="size-12 text-[#444444]" stroke={1.5} />
        <h2 className="mt-4 text-lg font-medium text-white">{title}</h2>
        <p className="mt-2 max-w-md whitespace-pre-line text-sm leading-relaxed text-[#a6a6a6]">
          {description}
        </p>
        <button className="mt-6 rounded-[6px] bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90">
          Pro 시작하기 →
        </button>
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
