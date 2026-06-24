import { IconBell } from "@tabler/icons-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import AlertsPreview from "@/components/dashboard/alerts-preview";

export default function AlertsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="알림" badge />
      <div className="mt-6">
        <ProGate
          icon={IconBell}
          title="알림은 Pro 전용 기능입니다"
          description={
            "관심 종목에 공시가 등록되면 즉시 이메일로 알려드립니다.\n공시 유형, 알림 시간대, 종목별 ON/OFF를 직접 설정하세요."
          }
        />
      </div>
      <AlertsPreview />
      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#444444]">
        본 서비스는 공개된 정보를 기반으로 시장 흐름을 시각화한 참고용 도구입니다. 투자 판단과
        결과에 대한 책임은 이용자 본인에게 있습니다.
      </footer>
    </div>
  );
}
