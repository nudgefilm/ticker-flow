import { IconMicrophone } from "@tabler/icons-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import CallsPreview from "@/components/dashboard/calls-preview";

export default function CallsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="어닝콜 요약" badge />
      <div className="mt-6">
        <ProGate
          icon={IconMicrophone}
          title="어닝콜 요약은 Pro 전용 기능입니다"
          description={
            "실적 발표 후 어닝콜 스크립트를 구조화된 한국어 요약으로 제공합니다.\n가이던스 방향, CEO 핵심 키워드, Q&A 핵심 3문답, 전분기 톤 변화까지."
          }
        />
      </div>
      <CallsPreview />
      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#444444]">
        본 서비스는 공개된 금융 정보를 시각화하는 도구입니다. 투자 권유가 아닙니다.
      </footer>
    </div>
  );
}
