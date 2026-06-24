import { IconCircleCheck } from "@tabler/icons-react";

const newsLog = [
  { date: "2026-06-24", time: "10:30", count: 847, sources: "Finnhub" },
  { date: "2026-06-23", time: "10:25", count: 712, sources: "Finnhub" },
  { date: "2026-06-22", time: "10:31", count: 803, sources: "Finnhub" },
  { date: "2026-06-21", time: "10:28", count: 654, sources: "Finnhub" },
  { date: "2026-06-20", time: "10:30", count: 891, sources: "Finnhub" },
];

export default function NewsDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">뉴스 수집 현황</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">Finnhub 뉴스 수집 상태</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "마지막 수집 시각", value: "2026-06-24 10:30" },
          { label: "오늘 수집 건수", value: "847건" },
          { label: "데이터 소스", value: "Finnhub" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-white">수집 이력 (최근 5일)</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">날짜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">시각</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">수집 건수</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">소스</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">상태</th>
            </tr>
          </thead>
          <tbody>
            {newsLog.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{row.date}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.time}</td>
                <td className="px-4 py-3 text-white">{row.count.toLocaleString()}건</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.sources}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                    <span className="text-green-400 text-xs">정상</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
