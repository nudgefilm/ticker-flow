import DashboardHeader from "@/components/dashboard/dashboard-header";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import ProGate from "@/components/dashboard/pro-gate";
import SectorsBoard from "@/components/sectors/sectors-board";

export const dynamic = "force-dynamic";

export default function SectorsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <DashboardHeader title="섹터 히트맵" badge />
      <div className="flex-1">
        <ProGate
          iconName="flame"
          title="섹터 히트맵은 Pro 전용 기능입니다"
          description="나스닥 섹터별 공시·뉴스 활동량을 한눈에 파악합니다.&#10;트리맵, Top 섹터 카드, 키워드 분석을 제공합니다."
        >
          <SectorsBoard />
        </ProGate>
      </div>
      <DashboardDisclaimer />
    </div>
  );
}
