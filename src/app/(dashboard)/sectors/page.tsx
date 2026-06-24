import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import SectorsPreview from "@/components/dashboard/sectors-preview";

export default function SectorsPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="섹터 히트맵" badge />
      <div className="mt-6 flex-1">
        <ProGate
          iconName="flame"
          title="섹터 히트맵은 Pro 전용 기능입니다"
          description="미국 주요 성장 섹터의 뉴스 흐름을 일별 히트맵으로 시각화합니다.&#10;반도체, 클라우드, 전기차, 바이오 등 핵심 섹터의 시장 분위기 변화를 한눈에 확인하세요."
        >
          <SectorsPreview />
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
