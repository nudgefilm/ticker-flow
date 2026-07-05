"use client"

import { useState } from "react"
import { IconCheck } from "@tabler/icons-react"
import {
  PRO_MONTHLY_PRICE_KRW,
  PRO_ANNUAL_PRICE_KRW,
  PRO_ANNUAL_MONTHLY_EQUIVALENT_KRW,
  PRO_ANNUAL_FREE_MONTHS,
  TAX_NOTICE_KO,
  formatKrw,
} from "@/lib/pricing"

// 정적 buy.polar.sh 체크아웃 링크는 만료/비활성화 시 polar.sh 메인으로 리다이렉트되므로,
// /api/polar/checkout에서 매번 새 체크아웃 세션을 생성하는 방식을 사용한다.
const MONTHLY_PRODUCT_ID = "b4362962-9365-4bfb-be40-1f5ad65b45af"
const ANNUAL_PRODUCT_ID = "046ffe47-7b01-4427-b69b-63202cf5ae85"

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

function ComingSoonModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm rounded-[8px] border border-white/[0.08] bg-[#1a1a1a] p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-white">결제 준비 중</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#a6a6a6]">
          현재 결제 연동을 준비하고 있습니다. Pro 버전이 필요하신 경우 마이페이지에서 문의를 통해 요청해 주시기 바랍니다.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-[6px] bg-white py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
        >
          확인
        </button>
      </div>
    </div>
  )
}

export default function BillingPlansClient({ isPro, userEmail }: { isPro: boolean; userEmail: string }) {
  const [tab, setTab] = useState<"monthly" | "annual">("monthly")
  const [showComingSoon, setShowComingSoon] = useState(false)

  // Polar 결제 연동 거부로 결제사 교체 검토 중 — 재활성화 전까지 체크아웃 버튼은 안내 모달만 표시한다.
  // async function handleCheckout() {
  //   setLoading(true)
  //   setError("")
  //   // 팝업 차단 방지: fetch 완료 후 window.open을 호출하면 사용자 제스처가 소실되어
  //   // 브라우저(특히 Safari)가 새 탭을 차단할 수 있으므로, 클릭 즉시 빈 탭을 먼저 연다.
  //   const newTab = window.open("", "_blank")
  //   try {
  //     const res = await fetch("/api/polar/checkout", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         productId: tab === "monthly" ? MONTHLY_PRODUCT_ID : ANNUAL_PRODUCT_ID,
  //         userEmail,
  //       }),
  //     })
  //     const data = await res.json()
  //     if (!res.ok || !data.checkoutUrl) {
  //       newTab?.close()
  //       setError(data.error ?? "결제 페이지를 열 수 없습니다. 잠시 후 다시 시도해주세요.")
  //       return
  //     }
  //     if (newTab) {
  //       newTab.location.href = data.checkoutUrl
  //     } else {
  //       window.open(data.checkoutUrl, "_blank")
  //     }
  //   } catch {
  //     newTab?.close()
  //     setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
  //   } finally {
  //     setLoading(false)
  //   }
  // }

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
              onClick={() => setShowComingSoon(true)}
              className="block w-full rounded-[6px] bg-white py-2.5 text-center text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              {tab === "monthly" ? "월간 구독 시작" : "연간 구독 시작"}
            </button>
          )}
        </div>
        </div>
      </div>

      {showComingSoon && <ComingSoonModal onClose={() => setShowComingSoon(false)} />}
    </div>
    <p className="mt-4 text-center text-xs text-[#a6a6a6]">{TAX_NOTICE_KO}</p>
    </div>
  )
}
