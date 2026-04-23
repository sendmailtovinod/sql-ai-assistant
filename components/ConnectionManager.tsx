'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DbConnection, Table } from '@/lib/types'
import { getConnections, saveConnection, deleteConnection } from '@/lib/connections'

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.password) u.password = '••••••'
    return u.toString()
  } catch {
    return url.replace(/:([^@/]+)@/, ':••••••@')
  }
}

interface Props {
  activeConnection: DbConnection | null
  onConnect: (conn: DbConnection, tables: Table[]) => void
  onDisconnect: () => void
}

export default function ConnectionManager({ activeConnection, onConnect, onDisconnect }: Props) {
  const [saved, setSaved] = useState<DbConnection[]>([])
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [readOnly, setReadOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setSaved(getConnections())
  }, [])

  async function connect(conn?: DbConnection) {
    const targetUrl = conn?.url ?? url.trim()
    if (!targetUrl) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/db/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Connection failed')

      const newConn: DbConnection = conn ?? {
        id: makeId(),
        name: name.trim() || new URL(targetUrl).pathname.replace('/', '') || 'Database',
        url: targetUrl,
        readOnly,
      }

      if (!conn) {
        // Save new connection
        saveConnection(newConn)
        setSaved(getConnections())
        setUrl('')
        setName('')
        setExpanded(false)
      }

      onConnect(newConn, data.tables)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  function remove(id: string) {
    deleteConnection(id)
    setSaved(getConnections())
    if (activeConnection?.id === id) onDisconnect()
  }

  function toggleReadOnly(conn: DbConnection) {
    const updated = { ...conn, readOnly: !conn.readOnly }
    saveConnection(updated)
    setSaved(getConnections())
    if (activeConnection?.id === conn.id) {
      onConnect(updated, []) // signal parent to update readOnly without re-importing schema
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Database
        </span>
        {activeConnection ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => toggleReadOnly(activeConnection)} className="shrink-0">
              <Badge
                variant={activeConnection.readOnly ? 'secondary' : 'outline'}
                className="text-[10px] px-1.5 py-0 cursor-pointer select-none"
                title={activeConnection.readOnly ? 'Read-only — click to allow writes' : 'Writes allowed — click for read-only'}
              >
                {activeConnection.readOnly ? 'Read-only' : 'Read-write'}
              </Badge>
            </button>
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="text-xs text-green-600 font-medium truncate max-w-[80px]">
              {activeConnection.name}
            </span>
            <button
              onClick={onDisconnect}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Cancel' : '+ Connect'}
          </Button>
        )}
      </div>

      {/* New connection form */}
      {expanded && !activeConnection && (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
          <Input
            className="h-7 text-xs font-mono"
            placeholder="postgres://user:pass@host:5432/db"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Input
            className="h-7 text-xs"
            placeholder="Friendly name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setReadOnly((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                  readOnly ? 'bg-primary border-primary' : 'border-muted-foreground'
                }`}
              >
                {readOnly && <span className="text-[9px] text-primary-foreground">✓</span>}
              </span>
              Read-only
            </button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!url.trim() || loading}
              onClick={() => connect()}
            >
              {loading ? 'Connecting…' : 'Connect'}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {/* Saved connections */}
      {saved.length > 0 && !activeConnection && (
        <div className="flex flex-col gap-1.5">
          {saved.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5"
            >
              <button
                className="flex-1 text-left"
                onClick={() => connect(conn)}
                disabled={loading}
              >
                <p className="text-xs font-medium truncate">{conn.name}</p>
                <p className="text-[10px] text-muted-foreground break-all font-mono">
                  {maskUrl(conn.url)}
                </p>
              </button>
              <button
                title={conn.readOnly ? 'Read-only (click to allow writes)' : 'Writes allowed (click for read-only)'}
                onClick={() => toggleReadOnly(conn)}
                className="shrink-0"
              >
                <Badge
                  variant={conn.readOnly ? 'secondary' : 'outline'}
                  className="text-[10px] px-1 py-0 cursor-pointer select-none"
                >
                  {conn.readOnly ? 'RO' : 'RW'}
                </Badge>
              </button>
              <button
                onClick={() => remove(conn.id)}
                className="text-muted-foreground hover:text-destructive text-xs shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
