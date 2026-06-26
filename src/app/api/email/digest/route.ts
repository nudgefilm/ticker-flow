import { NextRequest, NextResponse } from "next/server"
import { requireCollectAuth } from "@/lib/collect/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { resend, FROM } from "@/lib/email/resend"
import { dailyDigestEmail } from "@/lib/email/templates"

export async function GET(req: NextRequest) {
  return handler(req)
}

export async function POST(req: NextRequest) {
  return handler(req)
}

async function handler(req: NextRequest) {
  const authError = await requireCollectAuth(req)
  if (authError) return authError

  const adminClient = createAdminClient()

  // Pro 유저 이메일 목록 조회
  const { data: profiles, error: profileErr } = await adminClient
    .from("profiles")
    .select("email")
    .eq("plan", "pro")

  if (profileErr) {
    return NextResponse.json({ ok: false, error: profileErr.message }, { status: 500 })
  }

  const proEmails = (profiles ?? [])
    .map((p) => p.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0)

  if (proEmails.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "Pro 유저 없음" })
  }

  // 오늘 filings 5건
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: filingsRaw } = await adminClient
    .from("filings")
    .select("ticker, form_type, summary_kr")
    .not("summary_kr", "is", null)
    .gte("filed_at", todayStart.toISOString())
    .order("filed_at", { ascending: false })
    .limit(5)

  // 오늘 news 5건
  const { data: newsRaw } = await adminClient
    .from("news")
    .select("ticker, headline, summary_kr")
    .gte("datetime", Math.floor(todayStart.getTime() / 1000))
    .order("datetime", { ascending: false })
    .limit(5)

  type FilingRow = { ticker: string; form_type: string; summary_kr: string }
  type NewsRow = { ticker: string; headline: string; summary_kr: string }

  const filings: FilingRow[] = (filingsRaw ?? []).map((f) => ({
    ticker: (f as unknown as FilingRow).ticker ?? "",
    form_type: (f as unknown as FilingRow).form_type ?? "",
    summary_kr: (f as unknown as FilingRow).summary_kr ?? "",
  }))

  const news: NewsRow[] = (newsRaw ?? []).map((n) => ({
    ticker: (n as unknown as NewsRow).ticker ?? "",
    headline: (n as unknown as NewsRow).headline ?? "",
    summary_kr: (n as unknown as NewsRow).summary_kr ?? "",
  }))

  const html = dailyDigestEmail(filings, news)
  let sent = 0
  let errors = 0

  for (const email of proEmails) {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "오늘의 주요 변화 요약 | TickerFlow",
      html,
    })
    if (error) {
      errors++
    } else {
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent, errors, total: proEmails.length })
}
