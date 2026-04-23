'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, DbConnection, ScheduledReport, AgentEvent } from '@/lib/types'
import { getReports, saveReport, deleteReport, getRuns, saveRun } from '@/lib/reports'
import { Plus, Trash2, Play, Mail, Clock, CheckCircle2, XCircle, Loader2, Pencil } from 'lucide-react'

interface Props {
  schema: Table[]
  connection: DbConnection | null
}

interface RunState {
  reportId: string
  status: 'running' | 'done' | 'error'
  events: AgentEvent[]
  reportText: string
  emailStatus?: 'sending' | 'sent' | 'error'
  emailError?: string
}

export default function ScheduledReports({ schema, connection }: Props) {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [runStates, setRunStates] = useState<Record<string, RunState>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formQuestion, setFormQuestion] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSchedule, setFormSchedule] = useState<'daily' | 'weekly' | 'manual'>('manual')

  useEffect(() => {
    setReports(getReports())
  }, [])

  function openCreate() {
    setEditingId(null)
    setFormName('')
    setFormQuestion('')
    setFormEmail('')
    setFormSchedule('manual')
    setShowForm(true)
  }

  function openEdit(report: ScheduledReport) {
    setEditingId(report.id)
    setFormName(report.name)
    setFormQuestion(report.question)
    setFormEmail(report.recipientEmail)
    setFormSchedule(report.schedule)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  function handleSave() {
    if (!formName.trim() || !formQuestion.trim() || !formEmail.trim()) return

    const existing = editingId ? reports.find((r) => r.id === editingId) : undefined
    const report: ScheduledReport = {
      id: existing?.id ?? crypto.randomUUID(),
      name: formName.trim(),
      question: formQuestion.trim(),
      connectionId: existing?.connectionId ?? connection?.id ?? '',
      recipientEmail: formEmail.trim(),
      schedule: formSchedule,
      createdAt: existing?.createdAt ?? Date.now(),
      lastRunAt: existing?.lastRunAt,
      lastStatus: existing?.lastStatus,
    }
    saveReport(report)
    setReports(getReports())
    closeForm()
  }

  function handleDelete(id: string) {
    deleteReport(id)
    setReports(getReports())
  }

  const handleRun = useCallback(
    async (report: ScheduledReport) => {
      if (!connection?.url) return

      setRunStates((prev) => ({
        ...prev,
        [report.id]: { reportId: report.id, status: 'running', events: [], reportText: '' },
      }))

      try {
        const res = await fetch('/api/reports/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: connection.url, schema, question: report.question }),
        })

        if (!res.ok || !res.body) {
          setRunStates((prev) => ({
            ...prev,
            [report.id]: { ...prev[report.id], status: 'error' },
          }))
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let finalReportText = ''
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
                finalReportText = ev.reportText
                queryCount = ev.queryCount
                duration = ev.duration
                continue
              }
              setRunStates((prev) => ({
                ...prev,
                [report.id]: {
                  ...prev[report.id],
                  events: [...(prev[report.id]?.events ?? []), ev as AgentEvent],
                  reportText: ev.type === 'report' ? (ev as { type: 'report'; text: string }).text : prev[report.id]?.reportText ?? '',
                },
              }))
            } catch { /* skip */ }
          }
        }

        setRunStates((prev) => ({
          ...prev,
          [report.id]: { ...prev[report.id], status: 'done', reportText: finalReportText || prev[report.id]?.reportText },
        }))

        // Save run record
        saveRun({
          id: crypto.randomUUID(),
          reportId: report.id,
          startedAt: Date.now() - duration,
          finishedAt: Date.now(),
          status: 'ok',
          reportText: finalReportText,
          queryCount,
        })

        // Send email
        setRunStates((prev) => ({
          ...prev,
          [report.id]: { ...prev[report.id], emailStatus: 'sending' },
        }))

        const deliverRes = await fetch('/api/reports/deliver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: report.recipientEmail,
            reportName: report.name,
            reportText: finalReportText,
            queryCount,
            duration,
          }),
        })

        if (deliverRes.ok) {
          setRunStates((prev) => ({
            ...prev,
            [report.id]: { ...prev[report.id], emailStatus: 'sent' },
          }))
        } else {
          const errText = await deliverRes.text()
          setRunStates((prev) => ({
            ...prev,
            [report.id]: { ...prev[report.id], emailStatus: 'error', emailError: errText },
          }))
        }
      } catch (e) {
        setRunStates((prev) => ({
          ...prev,
          [report.id]: {
            ...prev[report.id],
            status: 'error',
            emailError: e instanceof Error ? e.message : 'Unknown error',
          },
        }))
      }
    },
    [connection, schema]
  )

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Scheduled Reports</h2>
          <p className="text-xs text-muted-foreground">
            Run AI-generated database reports and deliver them via email
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> New Report
        </Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="p-4 space-y-3 border-dashed">
          <p className="text-sm font-medium">{editingId ? 'Edit report' : 'New scheduled report'}</p>
          <Input
            placeholder="Report name (e.g. Daily Sales Summary)"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Textarea
            placeholder="What should the agent analyse? (e.g. Summarise orders from the last 24 hours by status, flag anomalies)"
            rows={3}
            value={formQuestion}
            onChange={(e) => setFormQuestion(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Recipient email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
          <Select value={formSchedule} onValueChange={(v) => setFormSchedule(v as typeof formSchedule)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual only</SelectItem>
              <SelectItem value="daily">Daily (8 AM)</SelectItem>
              <SelectItem value="weekly">Weekly (Mon 8 AM)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={closeForm}>Cancel</Button>
            <Button
              size="sm"
              disabled={!formName.trim() || !formQuestion.trim() || !formEmail.trim()}
              onClick={handleSave}
            >
              {editingId ? 'Update Report' : 'Save Report'}
            </Button>
          </div>
        </Card>
      )}

      {/* Report list */}
      {reports.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No reports yet. Click <strong>New Report</strong> to create one.
        </p>
      )}

      {reports.map((report) => {
        const run = runStates[report.id]
        const isRunning = run?.status === 'running'

        return (
          <Card key={report.id} className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{report.name}</span>
                  <ScheduleBadge schedule={report.schedule} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-words">{report.question}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3" /> {report.recipientEmail}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!connection || isRunning}
                  onClick={() => handleRun(report)}
                >
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1">{isRunning ? 'Running…' : 'Run Now'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isRunning}
                  onClick={() => openEdit(report)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(report.id)}
                  disabled={isRunning}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Live activity feed */}
            {run && (
              <div className="space-y-2">
                <div className="bg-muted/40 rounded-md p-3 text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
                  {run.events.map((ev, i) => (
                    <EventLine key={i} event={ev} />
                  ))}
                  {isRunning && (
                    <p className="text-muted-foreground animate-pulse">Agent working…</p>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Report text */}
                {run.reportText && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3 text-xs whitespace-pre-wrap leading-relaxed">
                    {run.reportText}
                  </div>
                )}

                {/* Email status */}
                {run.emailStatus && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    {run.emailStatus === 'sending' && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Sending email to {report.recipientEmail}…
                      </span>
                    )}
                    {run.emailStatus === 'sent' && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Email sent to {report.recipientEmail}
                      </span>
                    )}
                    {run.emailStatus === 'error' && (
                      <span className="text-destructive flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Email failed: {run.emailError}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function ScheduleBadge({ schedule }: { schedule: ScheduledReport['schedule'] }) {
  if (schedule === 'daily')
    return <Badge variant="secondary" className="text-xs gap-1"><Clock className="w-2.5 h-2.5" />Daily</Badge>
  if (schedule === 'weekly')
    return <Badge variant="secondary" className="text-xs gap-1"><Clock className="w-2.5 h-2.5" />Weekly</Badge>
  return <Badge variant="outline" className="text-xs">Manual</Badge>
}

function EventLine({ event }: { event: AgentEvent }) {
  if (event.type === 'status') return <p className="text-muted-foreground">⏳ {event.text}</p>
  if (event.type === 'tool_call')
    return (
      <div>
        <p className="text-blue-600 dark:text-blue-400">🔍 {event.description}</p>
        <p className="text-muted-foreground pl-3 truncate">{event.sql}</p>
      </div>
    )
  if (event.type === 'tool_result') {
    if (event.error) return <p className="text-destructive">✗ {event.error}</p>
    return <p className="text-green-600 dark:text-green-400">✓ {event.rowCount} rows</p>
  }
  if (event.type === 'report') return <p className="text-green-600 dark:text-green-400 font-medium">📋 Report ready</p>
  if (event.type === 'done')
    return (
      <p className="text-muted-foreground">
        ✓ Done — {event.queryCount} queries in {(event.duration / 1000).toFixed(1)}s
      </p>
    )
  if (event.type === 'error') return <p className="text-destructive">✗ {event.message}</p>
  return null
}
