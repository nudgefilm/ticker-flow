import { Building2, Layers, Briefcase } from "lucide-react";

interface Props {
  exchange: string | null;
  sector: string | null;
  industry: string | null;
}

const SECTOR_KR: Record<string, string> = {
  Technology: "기술", Healthcare: "헬스케어", Financials: "금융",
  "Consumer Discretionary": "임의소비재", "Consumer Staples": "필수소비재",
  Energy: "에너지", Industrials: "산업재", Materials: "소재",
  "Real Estate": "부동산", Utilities: "유틸리티", "Communication Services": "커뮤니케이션",
};

export default function CompanyInfo({ exchange, sector, industry }: Props) {
  const sectorKr = sector ? (SECTOR_KR[sector] ?? sector) : null;

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (exchange) rows.push({ icon: <Building2 size={13} />, label: "거래소", value: exchange });
  if (sectorKr) rows.push({ icon: <Layers size={13} />, label: "섹터", value: sectorKr });
  if (industry) rows.push({ icon: <Briefcase size={13} />, label: "산업", value: industry });

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">기업 정보</p>
      {rows.length === 0 ? (
        <p className="text-sm text-[#a6a6a6]">정보 없음</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[#a6a6a6]">
                {r.icon}
                <span className="text-xs">{r.label}</span>
              </div>
              <span className="text-xs font-medium text-[#cccccc]">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
