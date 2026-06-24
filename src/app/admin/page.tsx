import {
  IconUsers,
  IconCurrencyDollar,
  IconEye,
  IconTrendingUp,
  IconCircleCheck,
  IconAlertCircle,
} from "@tabler/icons-react";

const kpiCards = [
  { label: "총 가입자", value: "127명", sub: "+18 이번 주", icon: IconUsers, color: "text-blue-400" },
  { label: "유료 전환율", value: "8.7%", sub: "Pro 11명 / Free 116명", icon: IconTrendingUp, color: "text-green-400" },
  { label: "일별 방문자", value: "342명", sub: "오늘 기준", icon: IconEye, color: "text-purple-400" },
  { label: "월 매출", value: "₩1,328,100", sub: "이번 달 예상", icon: IconCurrencyDollar, color: "text-yellow-400" },
];

const recentActivity = [
  { label: "오늘 신규 가입", value: "5명", status: "ok" },
  { label: "오늘 공시 수집", value: "1,203건", status: "ok" },
  { label: "오늘 뉴스 수집", value: "847건", status: "ok" },
  { label: "수집 오류", value: "0건", status: "ok" },
  { label: "Claude API 오늘 비용", value: "$1.24", status: "ok" },
  { label: "마지막 수집", value: "09:15", status: "ok" },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">어드민 홈</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">TickerFlow 운영 현황 요약</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#a6a6a6]">{card.label}</p>
                <p className="mt-1.5 text-2xl font-semibold text-white">{card.value}</p>
                <p className="mt-1 text-xs text-[#a6a6a6]">{card.sub}</p>
              </div>
              <card.icon size={20} stroke={1.5} className={card.color} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 오늘 현황 */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">오늘 현황</h2>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.status === "ok" ? (
                    <IconCircleCheck size={14} stroke={1.5} className="text-green-400" />
                  ) : (
                    <IconAlertCircle size={14} stroke={1.5} className="text-red-400" />
                  )}
                  <span className="text-sm text-[#a6a6a6]">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 일별 방문자 추이 (목업) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <h2 className="mb-4 text-sm font-medium text-white">일별 방문자 (7일)</h2>
          <div className="flex items-end gap-1.5 h-28">
            {[210, 265, 190, 320, 280, 305, 342].map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-blue-500/30"
                  style={{ height: `${(v / 342) * 100}%` }}
                />
                <span className="text-[10px] text-[#a6a6a6]">
                  {["월", "화", "수", "목", "금", "토", "일"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 플랜 분포 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">플랜 분포</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 overflow-hidden rounded-full bg-[#1a1a1a] h-3">
            <div className="h-full rounded-full bg-blue-500" style={{ width: "91.3%" }} />
          </div>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <span className="text-[#a6a6a6]">Free <span className="text-white font-medium">116명</span></span>
            <span className="text-[#a6a6a6]">Pro <span className="text-green-400 font-medium">11명</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
