import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import {
  IconBrandTelegram,
  IconBell,
  IconFileText,
  IconRefresh,
  IconMail,
  IconChartBar,
  IconBuildingStore,
} from "@tabler/icons-react";

const TELEGRAM_CHANNEL_URL = "https://t.me/+c2UG4CGmAy1jMWQ9";

const TELEGRAM_ITEMS = [
  { icon: IconBell,        text: "매일 오전 11시 30분, 주요 공시 요약 발송" },
  { icon: IconFileText,    text: "CEO 교체·자사주 매입·M&A·가이던스 변경 등 주요 이벤트" },
  { icon: IconRefresh,     text: "CFO 교체·대규모 계약·증자 등 기업 변화 포함" },
];

const EMAIL_ITEMS = [
  { icon: IconBell,          text: "매일 오전 10시, 오늘의 기업동향 TOP10 요약 발송" },
  { icon: IconBuildingStore, text: "나스닥 전체에서 주요 변화가 포착된 기업 자동 큐레이션" },
  { icon: IconChartBar,      text: "기관 수급 변화·내부자 매수·실적 발표·전일 대비 변화 포함" },
];

export default function AlertsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="알림" />

      <div className="mt-6 flex-1">
        {/*
          4개 카드를 flat하게 2×2 그리드에 배치.
          CSS Grid는 같은 행의 모든 셀 높이를 자동으로 맞춤(align-items: stretch 기본값).
          소스 순서: [텔레그램 카드] → [이메일 카드] → [텔레그램 안내] → [이메일 안내]
          → 데스크탑: row1(텔레그램|이메일), row2(텔레그램 안내|이메일 안내) 로 정렬됨
        */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* [row1, col1] 텔레그램 채널 카드 */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#229ED9]/10">
                <IconBrandTelegram size={22} stroke={1.5} className="text-[#229ED9]" />
              </div>
              <div>
                <p className="font-medium text-white">TickerFlow 텔레그램 채널</p>
                <p className="mt-0.5 text-xs text-[#a6a6a6]">무료로 가입하고 알림을 받으세요</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[#cccccc]">
              주요 공시가 등록될 때마다 텔레그램 채널을 통해 알림을 받을 수 있습니다.
              별도 설정 없이 채널 가입만으로 이용 가능합니다.
            </p>
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#229ED9] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <IconBrandTelegram size={18} stroke={1.5} />
              채널 가입하기
            </a>
          </div>

          {/* [row1, col2] 이메일 다이제스트 카드 */}
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
              매일 오전 10시, 오늘의 기업동향 TOP10을 이메일로 발송합니다.
              나스닥 전체 기업 중 주요 변화가 포착된 기업을 자동 큐레이션하며,
              와치리스트와 무관하게 구성됩니다.
            </p>
          </div>

          {/* [row2, col1] 텔레그램 알림 안내 */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-5">
            <p className="mb-3 text-xs uppercase tracking-wider text-[#a6a6a6]">
              어떤 알림이 오나요?
            </p>
            <div className="space-y-3">
              {TELEGRAM_ITEMS.map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <item.icon size={15} stroke={1.5} className="mt-0.5 shrink-0 text-[#a6a6a6]" />
                  <p className="text-sm text-[#cccccc]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* [row2, col2] 이메일 알림 안내 */}
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
      </div>

      <DashboardDisclaimer />
    </div>
  );
}
