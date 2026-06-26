import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  // 로그인 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const productId: string = body.productId ?? process.env.POLAR_PRODUCT_ID_MONTHLY ?? ""
  const userEmail: string = body.userEmail ?? user.email ?? ""

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 })
  }

  const accessToken = process.env.POLAR_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tickerflow.net"

  const res = await fetch("https://api.polar.sh/v1/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      product_id: productId,
      customer_email: userEmail,
      success_url: `${baseUrl}/billing?success=true`,
      metadata: { email: userEmail },
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => "")
    return NextResponse.json({ error: `Polar error: ${res.status}`, detail: err }, { status: 500 })
  }

  const data = await res.json()
  const checkoutUrl: string = data.url ?? data.checkout_url ?? ""

  if (!checkoutUrl) {
    return NextResponse.json({ error: "No checkout URL returned" }, { status: 500 })
  }

  return NextResponse.json({ checkoutUrl })
}
