import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import AnalysisPreview from "@/components/dashboard/analysis-preview";

export default function AnalysisPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="공시 인사이트" badge />
      <div className="mt-6 flex-1">
        <ProGate
          title="공시 인사이트는 Pro 전용 기능입니다"
          description="SEC 공시 원문을 깊이 있게 분석한 한국어 리포트를 제공합니다.&#10;10-K 연간보고서 요약, 8-K 심층 분석, 10-Q 전분기 대비 변화 포인트."
        >
          <AnalysisPreview />
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
