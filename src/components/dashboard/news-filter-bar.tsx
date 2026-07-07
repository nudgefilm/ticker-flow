import Link from "next/link";
import { IconX } from "@tabler/icons-react";

export default function NewsFilterBar({ activeTicker }: { activeTicker?: string }) {
  if (!activeTicker) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#60a5fa]/15 px-2.5 py-1.5 text-sm font-medium text-[#60a5fa]">
      {activeTicker}
      <Link href="/news" aria-label="종목 필터 해제" className="text-[#60a5fa] hover:text-white">
        <IconX size={14} stroke={2} />
      </Link>
    </span>
  );
}
