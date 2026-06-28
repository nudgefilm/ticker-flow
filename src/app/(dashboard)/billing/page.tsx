import DashboardHeader from "@/components/dashboard/dashboard-header"
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer"
import BillingPlansClient from "@/components/dashboard/billing-plans-client"
import { IconCircleCheck } from "@tabler/icons-react"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

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
      <div className="mt-6 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#1a1a1a]">
        <div className="border-b border-white/[0.06] bg-[#242424] px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-widest text-[#a6a6a6]">현재 플랜</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-white">{isPro ? "Pro" : "Free"}</p>
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
      </div>

      {/* 플랜 비교 */}
      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[#a6a6a6]">플랜 비교</p>
        <div className="mt-4">
          <BillingPlansClient isPro={isPro} />
        </div>
      </div>

      {/* 구독 해지 — Pro 유저 전용, 페이지 최하단 */}
      {isPro && (
        <div className="mt-8 rounded-[6px] border border-white/[0.08] bg-[#1a1a1a] px-6 py-5">
          <div className="mb-4 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="TickerFlow" width={20} height={20} className="rounded-sm" />
            <span className="text-base font-semibold tracking-tight text-white">TickerFlow</span>
          </div>
          <a
            href="https://polar.sh/tickerflow/portal"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-red-400 transition-colors hover:text-red-300"
          >
            구독 해지 또는 플랜 변경
          </a>
          <p className="mt-1.5 text-xs text-[#a6a6a6]">
            구독 해지 후에도 현재 결제 기간 종료일까지 Pro 기능을 이용할 수 있습니다.
          </p>
        </div>
      )}

      <DashboardDisclaimer />
    </div>
  )
}
