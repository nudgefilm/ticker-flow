import { IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import CheckoutButton from "@/components/dashboard/checkout-button"

interface BillingPlanCardProps {
  name: string
  price: string
  annual?: string
  features: string[]
  featured?: boolean
  isPro?: boolean
  userEmail?: string
  productId?: string
}

export default function BillingPlanCard({
  name,
  price,
  annual,
  features,
  featured = false,
  isPro = false,
  userEmail = "",
  productId = "",
}: BillingPlanCardProps) {
  const isCurrentPlan = featured ? isPro : !isPro

  return (
    <div
      className={cn(
        "flex flex-col rounded-[6px] bg-[#111111] p-5",
        featured ? "border-2 border-white/[0.2]" : "border border-white/[0.08]"
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-white">{name}</span>
        {featured && (
          <span className="rounded-[4px] bg-white px-2 py-0.5 text-xs font-medium text-black">
            인기
          </span>
        )}
      </div>

      {/* 가격 */}
      <div className="mt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tabular-nums text-white">{price}</span>
          <span className="text-sm text-[#a6a6a6]">/월</span>
        </div>
        {annual && <p className="mt-1 text-xs text-[#a6a6a6]">{annual}</p>}
      </div>

      {/* 기능 리스트 */}
      <ul className="mt-5 flex flex-col gap-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <IconCheck
              size={16}
              stroke={2}
              className={featured ? "shrink-0 text-white" : "shrink-0 text-[#a6a6a6]"}
            />
            <span className={cn("text-sm", featured ? "text-white" : "text-[#cccccc]")}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-2">
        {featured ? (
          isCurrentPlan ? (
            <button
              disabled
              className="w-full cursor-not-allowed rounded-[6px] border border-white/[0.08] py-2.5 text-sm text-[#a6a6a6]"
            >
              현재 Pro 플랜 이용 중
            </button>
          ) : (
            <>
              <CheckoutButton productId={productId} userEmail={userEmail}>
                Pro 시작하기
              </CheckoutButton>
              <p className="text-center text-xs text-[#a6a6a6]">언제든 해지 가능 · 연간 할인 제공</p>
            </>
          )
        ) : (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-[6px] border border-white/[0.08] py-2.5 text-sm text-[#a6a6a6]"
          >
            현재 플랜
          </button>
        )}
      </div>
    </div>
  )
}
