export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET ?? ""

  return Response.json({
    hasCronSecret: !!process.env.CRON_SECRET,
    cronSecretLength: cronSecret.length,
    authHeaderReceived: authHeader,
    authHeaderLength: authHeader?.length ?? 0,
    match: authHeader === `Bearer ${cronSecret}`,
  })
}
