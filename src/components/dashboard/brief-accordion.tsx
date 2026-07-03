"use client";

import { useState, type ReactNode } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

export function BriefAccordion({
  title,
  badge,
  accent,
  headerBg,
  children,
}: {
  title: string;
  badge?: string;
  accent: string;
  headerBg: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#1a1a1a]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-5 py-4 ${headerBg}`}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: accent }}>
            {title}
          </span>
          {badge && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
            >
              {badge}
            </span>
          )}
        </span>
        <IconChevronDown
          size={18}
          stroke={2}
          style={{
            color: accent,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-4 px-5 pb-5 pt-4" style={{ borderTop: `1px solid ${accent}33` }}>
          {children}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-1.5 rounded-[6px] py-2.5 text-xs font-medium transition-colors hover:bg-white/[0.04]"
            style={{ color: accent, border: `1px solid ${accent}33` }}
          >
            접기
            <IconChevronUp size={14} stroke={2} />
          </button>
        </div>
      )}
    </div>
  );
}
