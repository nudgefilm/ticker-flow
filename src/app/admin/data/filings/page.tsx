import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

const collectionLog = [
  { date: "2026-06-24", time: "09:15", count: 1203, errors: 0 },
  { date: "2026-06-23", time: "09:12", count: 987, errors: 2 },
  { date: "2026-06-22", time: "09:08", count: 1145, errors: 0 },
  { date: "2026-06-21", time: "09:11", count: 832, errors: 1 },
  { date: "2026-06-20", time: "09:15", count: 1067, errors: 0 },
];

export default function FilingsDataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">공시 수집 현황</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">SEC EDGAR 공시 수집 상태</p>
      </div>

      {/* 상태 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "마지막 수집 시각", value: "2026-06-24 09:15" },
          { label: "오늘 수집 건수", value: "1,203건" },
          { label: "오류", value: "0건", ok: true },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-xs text-[#a6a6a6]">{card.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${card.ok !== undefined ? (card.ok ? "text-green-400" : "text-red-400") : "text-white"}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* 수집 이력 */}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">오류</th>
            </tr>
          </thead>
          <tbody>
            {collectionLog.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3 text-white">{row.date}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.time}</td>
                <td className="px-4 py-3 text-white">{row.count.toLocaleString()}건</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {row.errors === 0 ? (
                      <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                    ) : (
                      <IconAlertCircle size={14} stroke={1.5} className="text-red-400" />
                    )}
                    <span className={row.errors === 0 ? "text-green-400" : "text-red-400"}>
                      {row.errors}건
                    </span>
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
