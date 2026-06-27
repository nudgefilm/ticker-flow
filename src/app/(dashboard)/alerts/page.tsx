import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import ProGate from "@/components/dashboard/pro-gate";
import AlertsPreview from "@/components/dashboard/alerts-preview";

export default function AlertsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="알림" badge />
      <div className="mt-6 flex-1">
        <ProGate
          iconName="bell"
          title="알림은 Pro 전용 기능입니다"
          description="관심 종목에 공시가 등록되면 즉시 이메일로 알려드립니다.&#10;공시 유형, 알림 시간대, 종목별 ON/OFF를 직접 설정하세요."
        >
          <AlertsPreview />
        </ProGate>
      </div>
      <DashboardDisclaimer />
    </div>
  );
}
