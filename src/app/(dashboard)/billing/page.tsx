import DashboardHeader from "@/components/dashboard/dashboard-header"
import { IconCircleCheck, IconCheck } from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const MONTHLY_CHECKOUT_URL = "https://buy.polar.sh/polar_cl_b4362962-9365-4bfb-be40-1f5ad65b45af"
const ANNUAL_CHECKOUT_URL = "https://buy.polar.sh/polar_cl_046ffe47-7b01-4427-b69b-63202cf5ae85"

const FEATURES = [
  "와치리스트 무제한",
  "공시 피드 전체 실시간",
  "뉴스 피드 즉시",
  "공시 발생 즉시 이메일 알림",
  "공시 인사이트",
  "어닝콜 요약",
  "내부자 거래",
  "섹터 히트맵",
  "알림 설정 커스텀",
]

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const success = params.success === "true"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let plan = "free"
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
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

      {/* 현재 플랜 상태 */}
      <div className="mt-6 rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">현재 플랜</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{isPro ? "Pro" : "Free"}</p>
            <p className="mt-1 text-sm text-[#a6a6a6]">
              {isPro
                ? "모든 Pro 기능을 이용 중입니다."
                : "기본 기능을 무료로 이용 중입니다."}
            </p>
          </div>
          {isPro && (
            <span className="rounded-[6px] bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400">
              활성
            </span>
          )}
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">플랜 선택</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

          {/* 월간 플랜 */}
          <div className="flex flex-col rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
            <p className="text-base font-semibold text-white">월간 플랜</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums text-white">₩14,900</span>
              <span className="text-sm text-[#a6a6a6]">/ 월</span>
            </div>
            <ul className="mt-5 flex flex-col gap-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#cccccc]">
                  <IconCheck size={14} stroke={2} className="shrink-0 text-[#a6a6a6]" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPro ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-[6px] border border-white/[0.08] py-2.5 text-sm text-[#a6a6a6]"
                >
                  현재 Pro 플랜 이용 중
                </button>
              ) : (
                <a
                  href={MONTHLY_CHECKOUT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-[6px] border border-white/[0.2] py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-white/[0.05]"
                >
                  월간 구독 시작
                </a>
              )}
            </div>
          </div>

          {/* 연간 플랜 */}
          <div className="flex flex-col rounded-[6px] border-2 border-white/[0.2] bg-[#111111] p-5">
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold text-white">연간 플랜</p>
              <span className="rounded-[4px] bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                2개월 무료
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums text-white">₩142,800</span>
              <span className="text-sm text-[#a6a6a6]">/ 년</span>
            </div>
            <p className="mt-1 text-xs text-[#a6a6a6]">월 ₩11,900 상당</p>
            <ul className="mt-5 flex flex-col gap-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-[#cccccc]">
                  <IconCheck size={14} stroke={2} className="shrink-0 text-white" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {isPro ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-[6px] border border-white/[0.08] py-2.5 text-sm text-[#a6a6a6]"
                >
                  현재 Pro 플랜 이용 중
                </button>
              ) : (
                <a
                  href={ANNUAL_CHECKOUT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-[6px] bg-white py-2.5 text-center text-sm font-medium text-black transition-colors hover:bg-white/90"
                >
                  연간 구독 시작
                </a>
              )}
            </div>
          </div>

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
