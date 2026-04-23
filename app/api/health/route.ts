export async function GET() {
  const checks = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    resend: !!process.env.RESEND_API_KEY,
    langsmith: !!process.env.LANGSMITH_API_KEY,
    cron_secret: !!process.env.CRON_SECRET,
  }

  const allRequired = checks.anthropic
  const status = allRequired ? 'ok' : 'misconfigured'

  return Response.json(
    { status, checks, ts: new Date().toISOString() },
    { status: allRequired ? 200 : 503 }
  )
}
