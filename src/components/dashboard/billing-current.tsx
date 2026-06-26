import CheckoutButton from "@/components/dashboard/checkout-button"

interface BillingCurrentProps {
  plan: string
  email: string
  productId: string
}

export default function BillingCurrent({ plan, email, productId }: BillingCurrentProps) {
  const isPro = plan === "pro"

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[#111111] px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#a6a6a6]">현재 플랜</p>
          <p className="mt-1.5 text-2xl font-semibold text-white">{isPro ? "Pro" : "Free"}</p>
          <p className="mt-1 text-sm text-[#a6a6a6]">
            {isPro
              ? "모든 Pro 기능을 이용 중입니다."
              : "기본 기능을 무료로 이용 중입니다."}
          </p>
        </div>
        {!isPro && (
          <div className="shrink-0">
            <CheckoutButton
              productId={productId}
              userEmail={email}
              className="rounded-[6px] bg-white px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Pro로 업그레이드
            </CheckoutButton>
          </div>
        )}
      </div>
    </div>
  )
}
