'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AgentEvent, DbConnection, Table } from '@/lib/types'

interface ActivityItem {
  kind: 'status' | 'tool_call' | 'tool_result' | 'error'
  description?: string
  sql?: string
  rows?: Record<string, unknown>[]
  rowCount?: number
  error?: string
  text?: string
}

interface Props {
  schema: Table[]
  connection: DbConnection | null
}

function ReportBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-3">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-base font-semibold text-foreground mt-2 first:mt-0">
              {line.slice(3)}
            </h2>
          )
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-sm font-semibold text-foreground">
              {line.slice(4)}
            </h3>
          )
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 text-sm text-foreground/80">
              <span className="text-muted-foreground shrink-0">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          )
        }
        if (line.trim() === '') return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-foreground/80 leading-relaxed">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}

// Render **bold** inline
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  )
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        if (item.kind === 'status') {
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              {item.text}
            </div>
          )
        }

        if (item.kind === 'error') {
          return (
            <div key={i} className="text-xs text-destructive flex gap-2">
              <span>✕</span>
              {item.text}
            </div>
          )
        }

        if (item.kind === 'tool_call') {
          return (
            <div key={i} className="flex flex-col gap-1.5 pl-3 border-l-2 border-blue-500/40">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-400 border-blue-400/40">
                  run_sql
                </Badge>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
              <pre className="text-[11px] font-mono text-green-400 bg-zinc-950 rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                {item.sql}
              </pre>
            </div>
          )
        }

        if (item.kind === 'tool_result') {
          if (item.error) {
            return (
              <div key={i} className="pl-3 border-l-2 border-red-500/40 text-xs text-destructive">
                ✕ {item.error}
              </div>
            )
          }
          return (
            <div key={i} className="pl-3 border-l-2 border-green-500/40 text-xs text-muted-foreground">
              ↳ {item.rowCount} row{item.rowCount !== 1 ? 's' : ''}
              {item.rows && item.rows.length > 0 && (
                <span className="ml-1 font-mono text-[10px]">
                  — {JSON.stringify(item.rows[0]).slice(0, 80)}
                  {JSON.stringify(item.rows[0]).length > 80 ? '…' : ''}
                </span>
              )}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

export default function AgentReport({ schema, connection }: Props) {
  const [running, setRunning] = useState(false)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [report, setReport] = useState<string | null>(null)
  const [stats, setStats] = useState<{ queryCount: number; duration: number } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  function appendActivity(item: ActivityItem) {
    setActivity((prev) => [...prev, item])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  async function runAgent() {
    if (!connection || running) return
    setRunning(true)
    setActivity([])
    setReport(null)
    setStats(null)

    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: connection.url, schema }),
      })

      if (!res.ok) {
        const msg = await res.text()
        appendActivity({ kind: 'error', text: msg || `HTTP ${res.status}` })
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as AgentEvent
            handleEvent(event)
          } catch {
            // malformed line — ignore
          }
        }
      }
    } catch (e) {
      appendActivity({
        kind: 'error',
        text: e instanceof Error ? e.message : 'Request failed',
      })
    } finally {
      setRunning(false)
    }
  }

  function handleEvent(event: AgentEvent) {
    switch (event.type) {
      case 'status':
        appendActivity({ kind: 'status', text: event.text })
        break
      case 'tool_call':
        appendActivity({ kind: 'tool_call', description: event.description, sql: event.sql })
        break
      case 'tool_result':
        appendActivity({
          kind: 'tool_result',
          rows: event.rows,
          rowCount: event.rowCount,
          error: event.error,
        })
        break
      case 'report':
        setReport(event.text)
        break
      case 'done':
        setStats({ queryCount: event.queryCount, duration: event.duration })
        break
      case 'error':
        appendActivity({ kind: 'error', text: event.message })
        break
    }
  }

  const isEmpty = activity.length === 0 && !report && !running

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground max-w-lg">
            Autonomously connects to your database, runs targeted queries, and generates a
            business health report — no prompting required.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {stats && (
            <span className="text-xs text-muted-foreground">
              {stats.queryCount} queries · {(stats.duration / 1000).toFixed(1)}s
            </span>
          )}
          {(activity.length > 0 || report) && !running && (
            <Button variant="outline" size="sm" onClick={() => {
              setActivity([])
              setReport(null)
              setStats(null)
            }}>
              Clear
            </Button>
          )}
          <Button
            onClick={runAgent}
            disabled={!connection || running}
            size="sm"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Running…
              </span>
            ) : (
              '▶ Run Health Check'
            )}
          </Button>
        </div>
      </div>

      {!connection && (
        <p className="text-xs text-destructive">
          Connect a database in the sidebar to run the agent.
        </p>
      )}

      {isEmpty && connection && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="text-sm text-muted-foreground max-w-sm">
            The agent will examine your schema, decide what health metrics matter, run the queries,
            and write a report — all autonomously.
          </p>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground/60">
            <span>Checks revenue, signups, order trends</span>
            <span>Compares today vs yesterday, this week vs last</span>
            <span>Flags anomalies and concerns</span>
          </div>
        </div>
      )}

      {/* Activity feed */}
      {activity.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Activity
          </span>
          <ActivityFeed items={activity} />
          {running && (
            <div className="flex gap-1 pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </div>
          )}
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {activity.length > 0 && <Separator />}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Report
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(report)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Copy
              </button>
            </div>
            <ReportBlock text={report} />
          </div>
        </>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
