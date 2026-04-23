'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { QueryRecord } from '@/lib/types'
import { useStream } from '@/lib/useStream'
import { saveQuery } from '@/lib/history'

interface Props {
  onSaved: () => void
  initialSQL?: string
}

export default function SQLExplain({ onSaved, initialSQL = '' }: Props) {
  const [sql, setSQL] = useState(initialSQL)
  const { output, loading, error, stream, reset } = useStream()

  async function handleSubmit() {
    if (!sql.trim() || loading) return
    reset()
    const result = await stream('/api/sql-explain', { sql })
    if (result) {
      const record: QueryRecord = {
        id: Math.random().toString(36).slice(2),
        mode: 'sql-explain',
        input: sql,
        output: result,
        createdAt: Date.now(),
      }
      saveQuery(record)
      onSaved()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Paste any SQL query and get a plain-English breakdown of each clause.
        </p>
        <Textarea
          rows={6}
          placeholder={`SELECT u.email, COUNT(o.id) AS order_count\nFROM users u\nJOIN orders o ON o.user_id = u.id\nWHERE o.created_at > NOW() - INTERVAL '30 days'\nGROUP BY u.id\nHAVING COUNT(o.id) > 3\nORDER BY order_count DESC;`}
          value={sql}
          onChange={(e) => setSQL(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="resize-none font-mono text-sm"
        />
        <div className="flex justify-end mt-2">
          <Button onClick={handleSubmit} disabled={!sql.trim() || loading}>
            {loading ? 'Explaining…' : 'Explain SQL'}
            {!loading && <span className="ml-1.5 text-xs text-muted-foreground">⌘↵</span>}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {(output || loading) && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Explanation
          </p>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {output}
            {loading && (
              <span className="inline-block w-1.5 h-3.5 bg-muted-foreground animate-pulse ml-0.5 align-middle" />
            )}
          </div>
          {loading && !output && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
              Analysing…
            </div>
          )}
        </div>
      )}
    </div>
  )
}
