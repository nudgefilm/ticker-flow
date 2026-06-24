import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import AnalysisPreview from "@/components/dashboard/analysis-preview";

export default function AnalysisPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="공시 인사이트" badge />
      <div className="mt-6">
        <ProGate />
      </div>
      <AnalysisPreview />
      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#444444]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
