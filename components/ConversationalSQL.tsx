'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  DbConnection,
  ChatMessage,
  ConversationTurn,
  QueryResult,
} from '@/lib/types'
import { buildChatFirstMessage } from '@/lib/prompts'
import { saveQuery } from '@/lib/history'
import ResultsTable from './ResultsTable'

const MAX_TURNS = 10
const WARN_AT = 8

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

function parseSQLBlock(text: string): { sql: string; explanation: string } {
  const match = text.match(/```sql\s*([\s\S]*?)```/)
  if (match) {
    const sql = match[1].trim()
    const after = text.slice(text.indexOf('```sql') + match[0].length).trim()
    return { sql, explanation: after }
  }
  return { sql: '', explanation: text }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

interface TurnCardProps {
  turn: ConversationTurn
  index: number
  connection: DbConnection | null
  onRun: (turn: ConversationTurn) => void
  runningId: string | null
}

function TurnCard({ turn, index, connection, onRun, runningId }: TurnCardProps) {
  const isRunning = runningId === turn.id

  return (
    <div className="flex flex-col gap-3">
      {/* User message */}
      <div className="flex items-start gap-2">
        <Badge variant="outline" className="text-[10px] px-1.5 shrink-0 mt-0.5">
          Turn {index + 1}
        </Badge>
        <p className="text-sm text-foreground">{turn.userMessage}</p>
      </div>

      {/* SQL block */}
      {turn.sql && (
        <div className="rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
            <span className="text-xs font-mono text-zinc-400">SQL</span>
            <CopyButton text={turn.sql} />
          </div>
          <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
            {turn.sql}
          </pre>
        </div>
      )}

      {/* Explanation */}
      {turn.explanation && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {turn.explanation}
        </p>
      )}

      {/* Run button — on every turn */}
      {turn.sql && (
        <div className="flex items-center gap-2">
          {connection ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRun(turn)}
                disabled={runningId !== null}
              >
                {isRunning ? 'Running…' : `▶ Run on ${connection.name}`}
              </Button>
              {connection.readOnly && (
                <span className="text-xs text-muted-foreground">Read-only</span>
              )}
            </>
          ) : (
            <p className="text-xs text-destructive">
              Connect a database in the sidebar to run this query.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {(turn.result || turn.runError) && (
        <ResultsTable
          result={turn.result!}
          error={turn.runError}
          loading={isRunning}
        />
      )}
    </div>
  )
}

interface Props {
  schema: Table[]
  connection: DbConnection | null
  onSaved?: () => void
  initialQuestion?: string
}

export default function ConversationalSQL({ schema, connection, onSaved, initialQuestion }: Props) {
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState(initialQuestion ?? '')
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [runningId, setRunningId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new turn or stream update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, streamBuffer])

  async function handleSubmit() {
    const text = input.trim()
    if (!text || streaming || turns.length >= MAX_TURNS) return

    const isFirst = messages.length === 0
    const userContent = isFirst ? buildChatFirstMessage(schema, text) : text
    const newUserMessage: ChatMessage = { role: 'user', content: userContent }
    const nextMessages = [...messages, newUserMessage]

    setInput('')
    setStreaming(true)
    setStreamBuffer('')

    let fullOutput = ''
    try {
      const res = await fetch('/api/chat-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullOutput += chunk
        setStreamBuffer((prev) => prev + chunk)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      // Add error turn
      const errorTurn: ConversationTurn = {
        id: makeId(),
        userMessage: text,
        sql: '',
        explanation: `Error: ${msg}`,
      }
      setTurns((prev) => [...prev, errorTurn])
      setStreamBuffer('')
      setStreaming(false)
      return
    }

    const { sql, explanation } = parseSQLBlock(fullOutput)
    const newTurn: ConversationTurn = {
      id: makeId(),
      userMessage: text,
      sql,
      explanation,
    }

    const assistantMessage: ChatMessage = { role: 'assistant', content: fullOutput }

    setTurns((prev) => [...prev, newTurn])
    setMessages([...nextMessages, assistantMessage])
    setStreamBuffer('')
    setStreaming(false)

    if (sql) {
      saveQuery({
        id: makeId(),
        mode: 'chat-sql',
        input: text,
        output: sql,
        schema,
        createdAt: Date.now(),
      })
      onSaved?.()
    }
  }

  async function handleRun(turn: ConversationTurn) {
    if (!connection || !turn.sql || runningId) return
    setRunningId(turn.id)
    try {
      const res = await fetch('/api/db/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: connection.url,
          sql: turn.sql,
          readOnly: connection.readOnly,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Query failed')
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turn.id ? { ...t, result: data as QueryResult, runError: undefined } : t
        )
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Query failed'
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turn.id ? { ...t, runError: msg, result: undefined } : t
        )
      )
    } finally {
      setRunningId(null)
    }
  }

  function handleReset() {
    setTurns([])
    setMessages([])
    setInput('')
    setStreamBuffer('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  const atLimit = turns.length >= MAX_TURNS
  const nearLimit = turns.length >= WARN_AT && !atLimit
  const isEmpty = turns.length === 0 && !streaming

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Refine your query through conversation. Each message builds on the last.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {turns.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Turn {turns.length}/{MAX_TURNS}
            </span>
          )}
          {turns.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-1">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask a question to start. Then keep refining — add filters, joins,
              groupings — without rewriting from scratch.
            </p>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground/70">
              <span>Try: "Show me all orders from the last 30 days"</span>
              <span>Then: "Group by status and sum the total"</span>
              <span>Then: "Only show completed orders over $50"</span>
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={turn.id}>
            <TurnCard
              turn={turn}
              index={i}
              connection={connection}
              onRun={handleRun}
              runningId={runningId}
            />
            {i < turns.length - 1 && <Separator className="mt-6" />}
          </div>
        ))}

        {/* In-progress streaming turn */}
        {streaming && (
          <div className="flex flex-col gap-3">
            {turns.length > 0 && <Separator />}
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 shrink-0 mt-0.5">
                Turn {turns.length + 1}
              </Badge>
              <p className="text-sm text-foreground">{input || '…'}</p>
            </div>
            {streamBuffer ? (
              (() => {
                const { sql, explanation } = parseSQLBlock(streamBuffer)
                return (
                  <div className="flex flex-col gap-3">
                    {sql && (
                      <div className="rounded-lg bg-zinc-950 border border-zinc-800">
                        <div className="flex items-center px-4 py-2 border-b border-zinc-800">
                          <span className="text-xs font-mono text-zinc-400">SQL</span>
                        </div>
                        <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
                          {sql}
                          <span className="inline-block w-1.5 h-4 bg-green-400 animate-pulse ml-0.5 align-middle" />
                        </pre>
                      </div>
                    )}
                    {explanation && (
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {explanation}
                        {!sql && (
                          <span className="inline-block w-1.5 h-3.5 bg-muted-foreground animate-pulse ml-0.5 align-middle" />
                        )}
                      </p>
                    )}
                    {!sql && !explanation && (
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 pt-4 border-t mt-4">
        {nearLimit && (
          <p className="text-xs text-amber-500 mb-2">
            {MAX_TURNS - turns.length} turns remaining. Start a new chat for a fresh topic.
          </p>
        )}
        {atLimit && (
          <p className="text-xs text-destructive mb-2">
            Turn limit reached. Click "New Chat" to start over.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Textarea
            rows={2}
            placeholder={
              turns.length === 0
                ? 'Ask a question to get started…'
                : 'Refine the query… (e.g. "add a JOIN to users", "filter by last 7 days")'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming || atLimit}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {schema.length === 0
                ? 'Tip: add tables in the schema panel for accurate results'
                : `Schema: ${schema.length} table${schema.length !== 1 ? 's' : ''}`}
            </span>
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || streaming || atLimit}
            >
              {streaming
                ? 'Generating…'
                : turns.length === 0
                ? 'Generate SQL'
                : 'Refine'}
              {!streaming && (
                <span className="ml-1.5 text-xs text-muted-foreground/70">⌘↵</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
