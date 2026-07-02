import { SectionCard } from "@/components/dashboard/insights/ui";
import type { ReactNode } from "react";

interface Props {
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  ceo?: string | null;
  fullTimeEmployees?: number | null;
  ipoDate?: string | null;
  headquarters?: string | null;
  marketCap?: number | null;
  website?: string | null;
}

const SECTOR_KR: Record<string, string> = {
  Technology: "기술", Healthcare: "헬스케어", Financials: "금융", "Financial Services": "금융",
  "Consumer Discretionary": "경기소비재", "Consumer Cyclical": "경기소비재",
  "Consumer Staples": "필수소비재", "Consumer Defensive": "필수소비재",
  Energy: "에너지", Industrials: "산업재", Materials: "소재",
  "Real Estate": "부동산", Utilities: "유틸리티", "Communication Services": "커뮤니케이션",
};

function formatMarketCap(v: number): string {
  if (v >= 1_000_000_000_000) return `$${(v / 1_000_000_000_000).toFixed(1)}T`;
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${v.toLocaleString("ko-KR")}`;
}

function formatIpoYear(isoDate: string): string | null {
  const year = new Date(isoDate).getFullYear();
  return isNaN(year) ? null : `${year}년 상장`;
}

function formatWebsiteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function CompanyInfo({
  exchange,
  sector,
  industry,
  ceo,
  fullTimeEmployees,
  ipoDate,
  headquarters,
  marketCap,
  website,
}: Props) {
  const sectorKr = sector ? (SECTOR_KR[sector] ?? sector) : null;
  const ipoLabel = ipoDate ? formatIpoYear(ipoDate) : null;

  const rows: { label: string; value: ReactNode }[] = [
    ...(exchange ? [{ label: "거래소", value: exchange as ReactNode }] : []),
    ...(sectorKr ? [{ label: "섹터 (업종)", value: sectorKr as ReactNode }] : []),
    ...(industry ? [{ label: "산업", value: industry as ReactNode }] : []),
    { label: "국가", value: "미국" as ReactNode },
    { label: "통화", value: "USD" as ReactNode },
    ...(ceo ? [{ label: "CEO", value: ceo as ReactNode }] : []),
    ...(fullTimeEmployees != null
      ? [{ label: "직원 수", value: `${fullTimeEmployees.toLocaleString("ko-KR")}명` as ReactNode }]
      : []),
    ...(ipoLabel ? [{ label: "상장일", value: ipoLabel as ReactNode }] : []),
    ...(headquarters ? [{ label: "본사", value: headquarters as ReactNode }] : []),
    ...(marketCap != null ? [{ label: "시가총액", value: formatMarketCap(marketCap) as ReactNode }] : []),
    ...(website
      ? [
          {
            label: "홈페이지",
            value: (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#60a5fa] hover:underline"
              >
                {formatWebsiteLabel(website)} ↗
              </a>
            ) as ReactNode,
          },
        ]
      : []),
  ];

  return (
    <SectionCard title="기업 정보">
      {rows.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">정보 없음</p>
      ) : (
        <dl className="divide-y divide-white/[0.06]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <dt className="text-xs text-[#a6a6a6]">{row.label}</dt>
              <dd className="text-sm font-medium text-white">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </SectionCard>
  );
}
