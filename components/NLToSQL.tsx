'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Table, QueryRecord, DbConnection, QueryResult } from '@/lib/types'
import { useStream } from '@/lib/useStream'
import { saveQuery } from '@/lib/history'
import SQLDisplay from './SQLDisplay'
import ResultsTable from './ResultsTable'

interface Props {
  schema: Table[]
  onSaved: () => void
  initialQuestion?: string
  connection: DbConnection | null
}

function extractSQL(text: string): string {
  const match = text.match(/```sql\s*([\s\S]*?)```/)
  return match ? match[1].trim() : ''
}

export default function NLToSQL({ schema, onSaved, initialQuestion = '', connection }: Props) {
  const [question, setQuestion] = useState(initialQuestion)
  const { output, loading, error, stream, reset } = useStream()
  const [runLoading, setRunLoading] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [result, setResult] = useState<QueryResult | null>(null)

  async function handleGenerate() {
    if (!question.trim() || loading) return
    reset()
    setResult(null)
    setRunError(null)
    const out = await stream('/api/nl-to-sql', { schema, question })
    if (out) {
      const record: QueryRecord = {
        id: Math.random().toString(36).slice(2),
        mode: 'nl-to-sql',
        input: question,
        output: out,
        schema,
        createdAt: Date.now(),
      }
      saveQuery(record)
      onSaved()
    }
  }

  async function handleRun() {
    if (!connection || !output) return
    const sql = extractSQL(output)
    if (!sql) return
    setRunLoading(true)
    setRunError(null)
    setResult(null)
    try {
      const res = await fetch('/api/db/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: connection.url, sql, readOnly: connection.readOnly }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Query failed')
      setResult(data)
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setRunLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate()
  }

  const generatedSQL = extractSQL(output)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Describe what data you want in plain English. The AI will generate a
          PostgreSQL query based on your schema.
        </p>
        <Textarea
          rows={3}
          placeholder={`e.g. "Show me users who placed more than 3 orders in the last 30 days"`}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {schema.length === 0
              ? 'Tip: add tables in the schema panel for accurate results'
              : `Using ${schema.length} table${schema.length !== 1 ? 's' : ''}`}
          </span>
          <Button onClick={handleGenerate} disabled={!question.trim() || loading}>
            {loading ? 'Generating…' : 'Generate SQL'}
            {!loading && <span className="ml-1.5 text-xs text-muted-foreground">⌘↵</span>}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <SQLDisplay content={output} loading={loading} />

      {/* Run against DB */}
      {generatedSQL && connection && !loading && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRun}
            disabled={runLoading}
          >
            {runLoading ? 'Running…' : `▶ Run on ${connection.name}`}
          </Button>
          {connection.readOnly && (
            <span className="text-xs text-muted-foreground">Read-only</span>
          )}
        </div>
      )}

      {generatedSQL && !connection && !loading && (
        <p className="text-xs text-muted-foreground">
          Connect a database in the sidebar to run this query directly.
        </p>
      )}

      <ResultsTable result={result!} error={runError ?? undefined} loading={runLoading} />
    </div>
  )
}
