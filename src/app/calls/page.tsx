import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import CallsBoard from "@/components/dashboard/calls/calls-board";

export default function CallsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <main className="mx-auto max-w-5xl px-6 py-8 md:px-10">
        <div className="flex h-full flex-col">
          {/* 1. 페이지 헤더 */}
          <DashboardHeader title="어닝콜 요약" badge />
          <p className="mt-2 text-sm text-[#a6a6a6]">
            실적 발표 이후 경영진의 핵심 발언을 한국어로 구조화하여 제공합니다.
          </p>

          <div className="mt-6 flex-1">
            <ProGate
              iconName="microphone"
              title="어닝콜 요약은 Pro 전용 기능입니다"
              description="실적 발표 후 어닝콜 스크립트를 구조화된 한국어 요약으로 제공합니다.&#10;가이던스 방향, 경영진 핵심 발언, Q&A 핵심 문답, 전분기 톤 변화까지."
            >
              <CallsBoard />
            </ProGate>
          </div>

          {/* 면책 문구 */}
          <footer className="mt-8 border-t border-white/[0.06] py-4 text-left text-xs leading-relaxed text-[#a6a6a6]">
            <p>· 본 페이지는 공개된 실적 발표 자료를 기반으로 제공합니다.</p>
            <p>· 한국어 요약은 원문의 이해를 돕기 위한 참고 자료입니다.</p>
            <p>· 투자 권유가 아니며 투자 판단의 책임은 이용자 본인에게 있습니다.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
