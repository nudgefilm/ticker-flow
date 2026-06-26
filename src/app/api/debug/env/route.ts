export const dynamic = "force-dynamic"

export async function GET() {
  return Response.json({
    hasCronSecret: !!process.env.CRON_SECRET,
    cronSecretLength: process.env.CRON_SECRET?.length ?? 0,
    hasAdminEmail: !!process.env.ADMIN_EMAIL,
  })
}
