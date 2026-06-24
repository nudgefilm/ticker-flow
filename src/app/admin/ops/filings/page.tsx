"use client";

import { IconEyeOff, IconTrash, IconSearch } from "@tabler/icons-react";

const filings = [
  { id: "001", ticker: "AAPL", type: "8-K", title: "Material Definitive Agreement", date: "2026-06-24", visible: true },
  { id: "002", ticker: "NVDA", type: "4", title: "Statement of Changes in Beneficial Ownership", date: "2026-06-24", visible: true },
  { id: "003", ticker: "TSLA", type: "SC 13G/A", title: "Amendment to Statement of Beneficial Ownership", date: "2026-06-23", visible: true },
  { id: "004", ticker: "META", type: "8-K", title: "Departure of Directors or Principal Officers", date: "2026-06-23", visible: false },
  { id: "005", ticker: "MSFT", type: "DEF 14A", title: "Definitive Proxy Statement", date: "2026-06-22", visible: true },
];

export default function OpsFilingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">공시 관리</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">수집된 공시를 관리합니다. 삭제·숨김 처리 가능합니다.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch size={14} stroke={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a6a6a6]" />
          <input
            type="text"
            placeholder="티커 또는 공시 유형 검색..."
            className="w-full rounded-lg border border-white/[0.08] bg-[#111111] py-2 pl-8 pr-3 text-sm text-white placeholder:text-[#a6a6a6] outline-none focus:border-white/20"
          />
        </div>
        <select className="rounded-lg border border-white/[0.08] bg-[#111111] px-3 py-2 text-sm text-[#a6a6a6] outline-none">
          <option>전체</option>
          <option>표시</option>
          <option>숨김</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">티커</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">유형</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">제목</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">날짜</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#a6a6a6]">관리</th>
            </tr>
          </thead>
          <tbody>
            {filings.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.04] hover:bg-[#1a1a1a] transition-colors">
                <td className="px-4 py-3">
                  <span className="font-semibold text-white">{row.ticker}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-[4px] bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">{row.type}</span>
                </td>
                <td className="px-4 py-3 text-[#a6a6a6] max-w-xs truncate">{row.title}</td>
                <td className="px-4 py-3 text-[#a6a6a6]">{row.date}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${row.visible ? "text-green-400" : "text-[#a6a6a6]"}`}>
                    {row.visible ? "표시" : "숨김"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[#a6a6a6] transition-colors hover:text-white"
                      title={row.visible ? "숨기기" : "표시"}
                    >
                      <IconEyeOff size={15} stroke={1.5} />
                    </button>
                    <button
                      type="button"
                      className="text-[#a6a6a6] transition-colors hover:text-red-400"
                      title="삭제"
                    >
                      <IconTrash size={15} stroke={1.5} />
                    </button>
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
