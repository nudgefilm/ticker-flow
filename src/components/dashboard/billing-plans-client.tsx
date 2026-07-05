"use client"

import { useEffect, useState } from "react"
import { initializePaddle, type Paddle } from "@paddle/paddle-js"
import { IconCheck } from "@tabler/icons-react"
import {
  PRO_MONTHLY_PRICE_KRW,
  PRO_ANNUAL_PRICE_KRW,
  PRO_ANNUAL_MONTHLY_EQUIVALENT_KRW,
  PRO_ANNUAL_FREE_MONTHS,
  TAX_NOTICE_KO,
  formatKrw,
} from "@/lib/pricing"

const MONTHLY_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY ?? ""
const ANNUAL_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_ANNUAL ?? ""

const FREE_FEATURES = [
  "와치리스트 (최대 5종목)",
  "공시 피드",
  "뉴스 피드",
  "실적 캘린더",
  "종목 스냅샷",
  "경제지표",
]

type ProFeature = { label: string; desc?: string }

const PRO_FEATURES: ProFeature[] = [
  { label: "Free 기능 전체 포함" },
  { label: "와치리스트 종목 수 무제한" },
  { label: "공시 인사이트" },
  { label: "어닝콜 요약" },
  { label: "내부자 거래" },
  { label: "섹터 히트맵" },
  { label: "알림 설정" },
  { label: "데일리 다이제스트", desc: "매일 아침 주요 기업동향과 시장 변화를 이메일로 받아보세요." },
]

export default function BillingPlansClient({ isPro, userEmail }: { isPro: boolean; userEmail: string }) {
  const [tab, setTab] = useState<"monthly" | "annual">("monthly")
  const [paddle, setPaddle] = useState<Paddle>()
  const [error, setError] = useState("")

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return
    initializePaddle({ environment: "production", token }).then(setPaddle)
  }, [])

  function handleCheckout() {
    setError("")
    if (!paddle) {
      setError("결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.")
      return
    }
    const priceId = tab === "monthly" ? MONTHLY_PRICE_ID : ANNUAL_PRICE_ID
    if (!priceId) {
      setError("결제 상품 설정을 확인해주세요.")
      return
    }
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: userEmail ? { email: userEmail } : undefined,
      settings: {
        successUrl: `${window.location.origin}/billing?success=true`,
        theme: "dark",
        locale: "ko",
      },
    })
  }

  return (
    <div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

      {/* Free 카드 */}
      <div
        className={`flex flex-col overflow-hidden rounded-[6px] bg-[#1a1a1a] ${
          !isPro
            ? "border-2 border-blue-400/60"
            : "border border-white/[0.08]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#242424] px-5 py-4">
          <p className="text-base font-semibold text-white">Free</p>
          {!isPro && (
            <span className="rounded-[4px] bg-blue-400/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              현재 플랜
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-white">무료</span>
          </div>
          <ul className="mt-5 flex flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#cccccc]">
                <IconCheck size={14} stroke={2} className="shrink-0 text-[#a6a6a6]" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[#a6a6a6]">
            가입 후 7일간 무료 체험
          </p>
          <div className="mt-auto pt-6">
            <button
              disabled
              className="w-full cursor-not-allowed rounded-[6px] border border-white/[0.08] bg-blue-500/[0.15] py-2.5 text-sm text-[#a6a6a6]"
            >
              현재 플랜
            </button>
          </div>
        </div>
      </div>

      {/* Pro 카드 (탭) */}
      <div
        className={`flex flex-col overflow-hidden rounded-[6px] bg-[#1a1a1a] ${
          isPro
            ? "border-2 border-blue-400/60"
            : "border border-white/[0.08]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#242424] px-5 py-4">
          <p className="text-base font-semibold text-white">Pro</p>
          {isPro && (
            <span className="rounded-[4px] bg-blue-400/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              현재 플랜
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">

        {/* 탭 스위처 */}
        <div className="flex rounded-lg bg-[#111111] p-1">
          <button
            onClick={() => setTab("monthly")}
            className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-colors ${
              tab === "monthly"
                ? "bg-blue-500/[0.15] text-white font-medium"
                : "bg-transparent text-[#a6a6a6] hover:text-white"
            }`}
          >
            월간
          </button>
          <button
            onClick={() => setTab("annual")}
            className={`flex-1 rounded-[4px] py-1.5 text-xs font-medium transition-colors ${
              tab === "annual"
                ? "bg-blue-500/[0.15] text-white font-medium"
                : "bg-transparent text-[#a6a6a6] hover:text-white"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              연간
              <span className="rounded-[3px] bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                {PRO_ANNUAL_FREE_MONTHS}개월 무료
              </span>
            </span>
          </button>
        </div>

        {/* 가격 */}
        <div className="mt-4 min-h-[52px]">
          {tab === "monthly" ? (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums text-white">{formatKrw(PRO_MONTHLY_PRICE_KRW)}</span>
              <span className="text-sm text-[#a6a6a6]">/ 월 (VAT 포함)</span>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tabular-nums text-white">{formatKrw(PRO_ANNUAL_PRICE_KRW)}</span>
                <span className="text-sm text-[#a6a6a6]">/ 년 (VAT 포함)</span>
              </div>
              <p className="mt-1 text-xs text-[#a6a6a6]">월 {formatKrw(PRO_ANNUAL_MONTHLY_EQUIVALENT_KRW)} 상당</p>
            </>
          )}
        </div>

        {/* 기능 목록 */}
        <ul className="mt-5 flex flex-col gap-2">
          {PRO_FEATURES.map((f) => (
            <li key={f.label} className="flex items-start gap-2 text-sm text-[#cccccc]">
              <IconCheck size={14} stroke={2} className="mt-0.5 shrink-0 text-white" />
              <div>
                <p>{f.label}</p>
                {f.desc && <p className="mt-0.5 text-xs text-[#a6a6a6]">{f.desc}</p>}
              </div>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto pt-6">
          {isPro ? (
            <button
              disabled
              className="w-full cursor-not-allowed rounded-[6px] border border-white/[0.08] bg-blue-500/[0.15] py-2.5 text-sm text-[#a6a6a6]"
            >
              현재 플랜
            </button>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={!paddle}
              className="block w-full rounded-[6px] bg-white py-2.5 text-center text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paddle ? (tab === "monthly" ? "월간 구독 시작" : "연간 구독 시작") : "결제 모듈 로딩 중..."}
            </button>
          )}
          {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
        </div>
        </div>
      </div>
    </div>
    <p className="mt-4 text-center text-xs text-[#a6a6a6]">{TAX_NOTICE_KO}</p>
    </div>
  )
}
