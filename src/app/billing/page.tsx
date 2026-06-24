import DashboardHeader from "@/components/dashboard/dashboard-header";
import BillingCurrent from "@/components/dashboard/billing-current";
import BillingPlanCard from "@/components/dashboard/billing-plan-card";
import { IconReceipt } from "@tabler/icons-react";

const FREE_FEATURES = [
  "와치리스트 5종목",
  "공시 피드 최근 10건",
  "뉴스 피드 (6시간 지연)",
  "실적 캘린더",
  "경제지표 캘린더",
  "최근 실적 확인",
];

const PRO_FEATURES = [
  "와치리스트 무제한",
  "공시 피드 전체 실시간",
  "뉴스 피드 즉시",
  "실적 캘린더",
  "경제지표 캘린더",
  "공시 발생 즉시 이메일 알림",
  "공시 인사이트",
  "어닝콜 요약",
  "인사이더",
  "섹터 히트맵",
  "알림 설정 커스텀",
  "CSV 다운로드",
];

export default function BillingPage() {
  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="구독 관리" isPro />
      <div className="mt-6">
        <BillingCurrent />
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">플랜 비교</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <BillingPlanCard name="Free" price="₩0" features={FREE_FEATURES} />
          <BillingPlanCard
            name="Pro"
            price="₩14,900"
            annual="연간 결제 시 ₩11,900/월 (₩142,800/년)"
            features={PRO_FEATURES}
            featured
          />
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">결제 내역</p>
        <div className="mt-4 flex flex-col items-center rounded-[6px] border border-white/[0.08] bg-[#111111] px-5 py-8 text-center">
          <IconReceipt className="size-8 text-[#a6a6a6]" stroke={1.5} />
          <p className="mt-3 text-sm text-[#a6a6a6]">결제 내역이 없습니다.</p>
          <p className="mt-1 text-xs text-[#a6a6a6]">
            Pro 구독 시 결제 내역이 여기에 표시됩니다.
          </p>
        </div>
      </div>

      <footer className="mt-8 border-t border-white/[0.06] py-4 text-center text-xs text-[#a6a6a6]">
        <p>본 서비스는 공개된 정보를 기반으로 기업 활동과 시장 흐름을 정리한 참고용 도구입니다.</p>
        <p>특정 종목에 대한 투자 권유 또는 투자 자문을 제공하지 않습니다.</p>
        <p>투자 판단과 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
      </footer>
    </div>
  );
}
