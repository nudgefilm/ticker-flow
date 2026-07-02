"use client";

import { TOP_COMPANIES } from "@/lib/top-companies";

export function CompanyTicker({
  companies = TOP_COMPANIES,
  className = "",
}: {
  companies?: string[];
  className?: string;
}) {
  const items = [...companies, ...companies]; // 이음새 없는 루프용 복제

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        maskImage: "linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)",
      }}
    >
      <ul className="animate-ticker-up flex flex-col gap-2">
        {items.map((name, i) => (
          <li
            key={`${name}-${i}`}
            className="text-right text-[8px] font-normal tracking-tight text-white md:text-[10px]"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}
