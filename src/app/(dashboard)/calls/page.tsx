import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import CallsPreview from "@/components/dashboard/calls-preview";

export default function CallsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="어닝콜 요약" badge />
      <p className="mt-2 text-sm text-[#a6a6a6]">
        어닝콜(실적 발표 컨퍼런스콜)이란 경영진이 투자자·애널리스트에게 실적을 직접 설명하는 자리입니다.
      </p>
      <div className="mt-6 flex-1">
        <ProGate
          iconName="microphone"
          title="어닝콜 요약은 Pro 전용 기능입니다"
          description="실적 발표 후 어닝콜 스크립트를 구조화된 한국어 요약으로 제공합니다.&#10;가이던스 방향, CEO 핵심 키워드, Q&A 핵심 3문답, 전분기 톤 변화까지."
        >
          <CallsPreview />
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
