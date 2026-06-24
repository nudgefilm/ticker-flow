import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/tickerflow-logo.png"
        alt="TickerFlow"
        width={160}
        height={160}
        className="h-10 w-10 object-contain"
        priority
      />
      <span className="text-[19px] font-semibold tracking-tight text-white">
        TickerFlow
      </span>
    </div>
  );
}
