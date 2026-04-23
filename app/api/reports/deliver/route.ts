import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const {
    to,
    reportName,
    reportText,
    queryCount,
    duration,
  }: {
    to: string
    reportName: string
    reportText: string
    queryCount: number
    duration: number
  } = await req.json()

  if (!to || !reportText) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const html = buildEmailHTML(reportName, reportText, queryCount, duration)

  const { data, error } = await resend.emails.send({
    from: 'SQL AI Assistant <reports@resend.dev>',
    to: [to],
    subject: `📊 ${reportName} — ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    html,
  })

  if (error) {
    console.error('Resend error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ messageId: data?.id })
}

function buildEmailHTML(name: string, text: string, queries: number, ms: number): string {
  const rows = text
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) return `<h2 style="margin:16px 0 4px">${esc(line.slice(3))}</h2>`
      if (line.startsWith('# '))  return `<h1 style="margin:16px 0 4px">${esc(line.slice(2))}</h1>`
      if (line.startsWith('- ') || line.startsWith('* '))
        return `<li style="margin:2px 0">${esc(line.slice(2))}</li>`
      if (line.trim() === '') return '<br>'
      return `<p style="margin:4px 0">${esc(line)}</p>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;max-width:680px;margin:auto;padding:24px;color:#111">
  <h1 style="font-size:1.4rem;margin-bottom:4px">${esc(name)}</h1>
  <p style="color:#666;font-size:0.85rem;margin-top:0">
    Generated ${new Date().toLocaleString()} &nbsp;·&nbsp; ${queries} queries &nbsp;·&nbsp; ${(ms / 1000).toFixed(1)}s
  </p>
  <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
  <div style="line-height:1.6">${rows}</div>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px">
  <p style="color:#aaa;font-size:0.75rem">Sent by SQL AI Assistant</p>
</body>
</html>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
