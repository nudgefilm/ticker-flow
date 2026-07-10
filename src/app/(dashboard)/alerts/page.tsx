import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import {
  IconBell,
  IconMail,
  IconChartBar,
  IconBuildingStore,
} from "@tabler/icons-react";

// 2026-07-11: "TOP10"/"포착" 표현 제거(세션97 규제 리스크 점검) — TickerFlow
// 자체 스코어링 기반 순위·선정 결과를 노출하지 않고, 이메일에 포함되는 사실
// 항목만 나열하도록 문구를 정리했다.
const EMAIL_ITEMS = [
  { icon: IconBell,          text: "매일 오전 10시, 나스닥 기업동향 요약 발송" },
  { icon: IconBuildingStore, text: "나스닥 전체 기업의 공시·뉴스 등 주요 변화 자동 정리" },
  { icon: IconChartBar,      text: "기관 수급 변화·내부자 매수·실적 발표·전일 대비 변화 포함" },
];

export default function AlertsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="알림" />

      <div className="mt-6 max-w-xl flex-1 space-y-6">

        {/* 이메일 다이제스트 카드 */}
        <div className="rounded-[6px] border border-[#60a5fa]/40 bg-[#111111] p-6 shadow-[0_0_24px_rgba(96,165,250,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3b82f6]/10">
                <IconMail size={20} stroke={1.5} className="text-[#3b82f6]" />
              </div>
              <div>
                <p className="font-medium text-white">이메일 다이제스트</p>
                <p className="mt-0.5 text-xs text-[#a6a6a6]">매일 오전 10시 KST</p>
              </div>
            </div>
            <span className="rounded-[4px] bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-medium text-white">
              Pro
            </span>
          </div>
          <p className="text-sm leading-relaxed text-[#cccccc]">
            매일 오전 10시, 나스닥 기업동향 요약을 이메일로 발송합니다.
            나스닥 전체 기업의 공시·뉴스·내부자 거래 등 주요 변화를 자동으로
            정리하며, 와치리스트와 무관하게 구성됩니다.
          </p>
        </div>

        {/* 이메일 알림 안내 */}
        <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-5">
          <p className="mb-3 text-xs uppercase tracking-wider text-[#a6a6a6]">
            어떤 알림이 오나요?
          </p>
          <div className="space-y-3">
            {EMAIL_ITEMS.map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <item.icon size={15} stroke={1.5} className="mt-0.5 shrink-0 text-[#a6a6a6]" />
                <p className="text-sm text-[#cccccc]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <DashboardDisclaimer />
    </div>
  );
}
