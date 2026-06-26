"use client"

import { useState } from "react"

interface CheckoutButtonProps {
  productId: string
  userEmail: string
  className?: string
  children?: React.ReactNode
}

export default function CheckoutButton({
  productId,
  userEmail,
  className,
  children,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCheckout() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/polar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, userEmail }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "결제 페이지를 열 수 없습니다. 잠시 후 다시 시도해주세요.")
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={
          className ??
          "w-full rounded-[6px] bg-white py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading ? "처리 중..." : (children ?? "Pro 시작하기")}
      </button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  )
}
