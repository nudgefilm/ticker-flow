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
        본 서비스는 공개된 금융 정보를 시각화하는 도구입니다. 투자 권유가 아닙니다.
      </footer>
    </div>
  );
}
