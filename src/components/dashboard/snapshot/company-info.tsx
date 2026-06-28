import { SectionCard } from "@/components/dashboard/insights/ui";

interface Props {
  exchange: string | null;
  sector: string | null;
  industry: string | null;
}

const SECTOR_KR: Record<string, string> = {
  Technology: "기술", Healthcare: "헬스케어", Financials: "금융", "Financial Services": "금융",
  "Consumer Discretionary": "경기소비재", "Consumer Cyclical": "경기소비재",
  "Consumer Staples": "필수소비재", "Consumer Defensive": "필수소비재",
  Energy: "에너지", Industrials: "산업재", Materials: "소재",
  "Real Estate": "부동산", Utilities: "유틸리티", "Communication Services": "커뮤니케이션",
};

export function CompanyInfo({ exchange, sector, industry }: Props) {
  const sectorKr = sector ? (SECTOR_KR[sector] ?? sector) : null;

  const rows: { label: string; value: string }[] = [
    ...(exchange ? [{ label: "거래소", value: exchange }] : []),
    ...(sectorKr ? [{ label: "섹터 (업종)", value: sectorKr }] : []),
    ...(industry ? [{ label: "산업", value: industry }] : []),
    { label: "국가", value: "미국" },
    { label: "통화", value: "USD" },
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
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
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
