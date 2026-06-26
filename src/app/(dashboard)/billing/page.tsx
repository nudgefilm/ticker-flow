import DashboardHeader from "@/components/dashboard/dashboard-header"
import BillingCurrent from "@/components/dashboard/billing-current"
import BillingPlanCard from "@/components/dashboard/billing-plan-card"
import { IconReceipt, IconCircleCheck } from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const FREE_FEATURES = [
  "와치리스트 5종목",
  "공시 피드 최근 10건",
  "뉴스 피드 (6시간 지연)",
  "실적 캘린더",
  "경제지표 캘린더",
  "최근 실적 확인",
]

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
]

const PRODUCT_ID = process.env.POLAR_PRODUCT_ID_MONTHLY ?? ""

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const success = params.success === "true"

  // 현재 유저 조회
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email ?? ""

  // 플랜 조회
  let plan = "free"
  if (email) {
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from("profiles")
      .select("plan")
      .eq("email", email)
      .single()
    plan = profile?.plan ?? "free"
  }

  const isPro = plan === "pro"

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="구독 관리" />

      {success && (
        <div className="mt-6 flex items-center gap-3 rounded-[6px] border border-green-500/20 bg-green-500/10 px-5 py-4">
          <IconCircleCheck size={20} stroke={1.5} className="shrink-0 text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-400">Pro 플랜이 시작되었습니다</p>
            <p className="mt-0.5 text-xs text-[#a6a6a6]">이제 모든 Pro 기능을 이용하실 수 있습니다.</p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <BillingCurrent plan={plan} email={email} productId={PRODUCT_ID} />
      </div>

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">플랜 비교</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <BillingPlanCard
            name="Free"
            price="₩0"
            features={FREE_FEATURES}
            isPro={isPro}
          />
          <BillingPlanCard
            name="Pro"
            price="₩14,900"
            annual="연간 결제 시 ₩11,900/월 (₩142,800/년)"
            features={PRO_FEATURES}
            featured
            isPro={isPro}
            userEmail={email}
            productId={PRODUCT_ID}
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
  )
}
