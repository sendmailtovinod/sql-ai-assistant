// Vercel Cron hits this endpoint on the schedule in vercel.json.
// It reads report configs stored server-side in /tmp (written by the UI via POST /api/reports/sync).
// On Vercel, localStorage is unavailable — configs must be POSTed here first.

import { ScheduledReport } from '@/lib/types'
import * as fs from 'fs'
import * as path from 'path'

const STORE_PATH = '/tmp/sql-scheduled-reports.json'

function readServerReports(): ScheduledReport[] {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'))
  } catch {
    return []
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const reports = readServerReports().filter(
    (r) => r.schedule === 'daily' || r.schedule === 'weekly'
  )

  const results: { id: string; name: string; status: string; error?: string }[] = []

  for (const report of reports) {
    try {
      // Fetch the connection URL from the environment (keyed by connectionId)
      const urlEnvKey = `DB_URL_${report.connectionId.toUpperCase().replace(/-/g, '_')}`
      const dbUrl = process.env[urlEnvKey] || process.env.DATABASE_URL

      if (!dbUrl) {
        results.push({ id: report.id, name: report.name, status: 'error', error: 'No DB URL in env' })
        continue
      }

      // Run the agent
      const runRes = await fetch(new URL('/api/reports/run', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dbUrl, schema: [], question: report.question }),
      })

      if (!runRes.ok || !runRes.body) {
        results.push({ id: report.id, name: report.name, status: 'error', error: 'Run failed' })
        continue
      }

      // Drain NDJSON stream and extract the __meta__ line
      const reader = runRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let reportText = ''
      let queryCount = 0
      let duration = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const ev = JSON.parse(line)
            if (ev.type === '__meta__') {
              reportText = ev.reportText
              queryCount = ev.queryCount
              duration = ev.duration
            }
          } catch { /* skip */ }
        }
      }

      if (!reportText) {
        results.push({ id: report.id, name: report.name, status: 'error', error: 'No report generated' })
        continue
      }

      // Deliver via email
      const deliverRes = await fetch(new URL('/api/reports/deliver', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: report.recipientEmail,
          reportName: report.name,
          reportText,
          queryCount,
          duration,
        }),
      })

      if (!deliverRes.ok) {
        const err = await deliverRes.text()
        results.push({ id: report.id, name: report.name, status: 'error', error: err })
      } else {
        results.push({ id: report.id, name: report.name, status: 'ok' })
      }
    } catch (e) {
      results.push({
        id: report.id,
        name: report.name,
        status: 'error',
        error: e instanceof Error ? e.message : 'Unknown',
      })
    }
  }

  return Response.json({ ran: results.length, results })
}

// UI calls this to sync report configs to the server (needed for cron)
export async function POST(req: Request) {
  const { reports }: { reports: ScheduledReport[] } = await req.json()
  fs.writeFileSync(STORE_PATH, JSON.stringify(reports, null, 2))
  return Response.json({ ok: true })
}
