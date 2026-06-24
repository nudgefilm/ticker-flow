import DashboardHeader from "@/components/dashboard/dashboard-header";
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
      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
