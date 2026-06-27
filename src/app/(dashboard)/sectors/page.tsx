import DashboardHeader from "@/components/dashboard/dashboard-header";
import SectorsBoard from "@/components/dashboard/sectors/sectors-board";

export default function SectorsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <DashboardHeader title="섹터 히트맵" badge />

      <SectorsBoard />

      {/* 면책 문구 */}
      <footer className="mt-2 border-t border-white/[0.06] py-4 text-left text-xs leading-relaxed text-[#a6a6a6]">
        <p>· 본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>· 특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>· 투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
