import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <span className={cn("text-[19px] font-semibold tracking-tight text-foreground", className)}>
      TickerFlow
    </span>
  );
}
