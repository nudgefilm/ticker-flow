import { IconFileText, IconAlertCircle, IconUser, IconNews, IconChartLine } from "@tabler/icons-react";

interface SummaryProps {
  summary: {
    filings: number;
    keyEvents: number;
    insiderTrades: number;
    news: number;
    earnings: number;
  };
}

const METRICS = [
  { key: "filings",       label: "공시",          icon: IconFileText,    color: "#60a5fa" },
  { key: "keyEvents",     label: "주요 이벤트",   icon: IconAlertCircle, color: "#f87171" },
  { key: "insiderTrades", label: "내부자 거래",   icon: IconUser,        color: "#a78bfa" },
  { key: "news",          label: "뉴스",          icon: IconNews,        color: "#34d399" },
  { key: "earnings",      label: "실적",          icon: IconChartLine,   color: "#fbbf24" },
] as const;

export default function ChangeSummary({ summary }: SummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {METRICS.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="flex flex-col gap-2 rounded-[6px] border border-white/[0.08] bg-[#111111] px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a6a6a6]">{label}</span>
            <Icon size={14} stroke={1.5} style={{ color }} />
          </div>
          <p className="text-2xl font-semibold tabular-nums text-white">{summary[key]}</p>
          <p className="text-xs text-[#a6a6a6]">최근 30일</p>
        </div>
      ))}
    </div>
  );
}
