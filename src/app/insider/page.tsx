import { IconUser } from "@tabler/icons-react";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import ProGate from "@/components/dashboard/pro-gate";
import InsiderPreview from "@/components/dashboard/insider-preview";

export default function InsiderPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="인사이더" badge />
      <div className="mt-6">
        <ProGate
          icon={IconUser}
          title="인사이더는 Pro 전용 기능입니다"
          description={
            "CEO·임원진이 자사 주식을 사고팔았는지 빠르게 확인하세요.\nSEC Form 4 공시를 기반으로 주요 내부자 거래와 변화 흐름을 모니터링할 수 있습니다."
          }
        />
      </div>
      <InsiderPreview />
      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#444444]">
        본 서비스는 공개된 금융 정보를 시각화하는 도구입니다. 투자 권유가 아닙니다.
      </footer>
    </div>
  );
}
