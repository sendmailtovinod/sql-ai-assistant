'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  content: string
  loading?: boolean
}

function parseSQLBlock(text: string): { sql: string; explanation: string } {
  const match = text.match(/```sql\s*([\s\S]*?)```/)
  if (match) {
    const sql = match[1].trim()
    const explanation = text.slice(text.indexOf('```sql') + match[0].length).trim()
    return { sql, explanation }
  }
  return { sql: '', explanation: text }
}

export default function SQLDisplay({ content, loading }: Props) {
  const [copied, setCopied] = useState(false)
  const { sql, explanation } = parseSQLBlock(content)

  function copy() {
    navigator.clipboard.writeText(sql || content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!content && !loading) return null

  return (
    <div className="flex flex-col gap-3 mt-4">
      {sql && (
        <div className="relative rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <span className="text-xs font-mono text-zinc-400">SQL</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-zinc-400 hover:text-zinc-100"
              onClick={copy}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
            {sql}
            {loading && !explanation && (
              <span className="inline-block w-1.5 h-4 bg-green-400 animate-pulse ml-0.5 align-middle" />
            )}
          </pre>
        </div>
      )}

      {explanation && (
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {explanation}
          {loading && (
            <span className="inline-block w-1.5 h-3.5 bg-muted-foreground animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      )}

      {loading && !sql && !explanation && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
          </span>
          Generating…
        </div>
      )}
    </div>
  )
}
