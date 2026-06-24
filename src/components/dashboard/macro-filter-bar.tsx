import { IconChevronDown } from "@tabler/icons-react";

export default function MacroFilterBar() {
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
      >
        이번 주
        <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
      </button>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-[6px] border border-white/[0.08] bg-[#111111] px-3 py-1.5 text-sm text-[#cccccc] transition-colors hover:bg-[#1a1a1a]"
      >
        전체
        <IconChevronDown size={14} stroke={1.5} className="text-[#a6a6a6]" />
      </button>
    </div>
  );
}
