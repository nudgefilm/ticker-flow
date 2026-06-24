import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

const apiStatus = [
  {
    name: "Finnhub",
    status: "정상",
    ok: true,
    todayCalls: "4,821",
    limit: "60,000 / 일",
    remaining: "55,179",
    latency: "142ms",
  },
  {
    name: "EDGAR (SEC)",
    status: "정상",
    ok: true,
    todayCalls: "1,203",
    limit: "10 req/s",
    remaining: "—",
    latency: "287ms",
  },
];

export default function ApiStatusPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">API 상태</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">외부 API 호출 현황 및 잔여 한도</p>
      </div>

      <div className="space-y-4">
        {apiStatus.map((api) => (
          <div key={api.name} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-white">{api.name}</h2>
                <div className="flex items-center gap-1.5">
                  {api.ok ? (
                    <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                  ) : (
                    <IconAlertCircle size={14} stroke={1.5} className="text-red-400" />
                  )}
                  <span className={`text-xs ${api.ok ? "text-green-400" : "text-red-400"}`}>{api.status}</span>
                </div>
              </div>
              <span className="text-xs text-[#a6a6a6]">평균 응답: {api.latency}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#a6a6a6]">오늘 호출 수</p>
                <p className="mt-1 text-lg font-semibold text-white">{api.todayCalls}</p>
              </div>
              <div>
                <p className="text-xs text-[#a6a6a6]">한도</p>
                <p className="mt-1 text-lg font-semibold text-white">{api.limit}</p>
              </div>
              <div>
                <p className="text-xs text-[#a6a6a6]">잔여</p>
                <p className="mt-1 text-lg font-semibold text-green-400">{api.remaining}</p>
              </div>
            </div>
            {api.name === "Finnhub" && (
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-[#a6a6a6]">일일 한도 사용률</span>
                  <span className="text-xs text-white">8%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div className="h-full rounded-full bg-green-500" style={{ width: "8%" }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-[#a6a6a6]">실시간 API 상태는 모니터링 연동 후 표시됩니다.</p>
    </div>
  );
}
