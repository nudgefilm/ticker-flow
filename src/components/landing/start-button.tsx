"use client";

import { useState } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import LoginModal from "@/components/login-modal";
import { cn } from "@/lib/utils";

interface StartButtonProps {
  label?: string;
  variant?: "primary" | "outline";
  className?: string;
}

export default function StartButton({
  label = "무료로 시작하기",
  variant = "primary",
  className,
}: StartButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-5 text-sm font-medium transition-colors",
          variant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/85"
            : "border border-border bg-transparent text-foreground hover:bg-secondary/60",
          className,
        )}
      >
        {label}
        <IconArrowRight size={16} stroke={1.8} />
      </button>
      {open && <LoginModal onClose={() => setOpen(false)} />}
    </>
  );
}
