'use client'

import { useEffect, useState } from 'react'
import { Table } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

const STORAGE_KEY = 'sql-schema'

const TYPE_COLOURS: Record<string, string> = {
  UUID:      'text-violet-400',
  TEXT:      'text-sky-400',
  INTEGER:   'text-orange-400',
  NUMERIC:   'text-orange-400',
  BOOLEAN:   'text-green-400',
  TIMESTAMP: 'text-yellow-400',
}

interface Props {
  onChange: (tables: Table[]) => void
  externalTables?: Table[]
}

export default function SchemaBuilder({ externalTables }: Props) {
  const tables = externalTables ?? []
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Clear stale schema on mount — schema is only valid during an active connection
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Expand all when tables arrive; collapse all + clear storage on disconnect
  useEffect(() => {
    if (!externalTables) return
    if (externalTables.length === 0) {
      setExpanded(new Set())
      localStorage.removeItem(STORAGE_KEY)
    } else {
      setExpanded(new Set(externalTables.map((t) => t.id)))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(externalTables))
    }
  }, [externalTables])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Schema
        </span>
        {tables.length > 0 && (
          <button
            onClick={() => {
              const allExpanded = tables.every((t) => expanded.has(t.id))
              setExpanded(allExpanded ? new Set() : new Set(tables.map((t) => t.id)))
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {tables.every((t) => expanded.has(t.id)) ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>

      {tables.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Connect a database to see its schema here.
        </p>
      )}

      <div className="flex flex-col gap-0.5">
        {tables.map((table) => {
          const open = expanded.has(table.id)
          return (
            <div key={table.id}>
              {/* Table row */}
              <button
                onClick={() => toggle(table.id)}
                className="w-full flex items-center gap-1.5 px-1 py-1 rounded hover:bg-muted/50 transition-colors text-left group"
              >
                <span className="text-muted-foreground text-[10px] w-3 shrink-0 select-none">
                  {open ? '▾' : '▸'}
                </span>
                <span className="text-xs font-medium text-foreground truncate">
                  {table.name}
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">
                  {table.columns.length}
                </span>
              </button>

              {/* Columns */}
              {open && (
                <div className="ml-3 border-l border-border/50 pl-2 mb-1">
                  {table.columns.map((col, i) => {
                    const isLast = i === table.columns.length - 1
                    const typeColour = TYPE_COLOURS[col.type] ?? 'text-muted-foreground'
                    return (
                      <div
                        key={col.id}
                        className="flex items-center gap-1.5 py-0.5 text-[11px] group/col"
                      >
                        <span className="text-muted-foreground/40 shrink-0 select-none">
                          {isLast ? '└' : '├'}
                        </span>
                        <span className="text-foreground/80 truncate font-mono">
                          {col.name}
                        </span>
                        <span className={`shrink-0 font-mono text-[10px] ${typeColour}`}>
                          {col.type}
                        </span>
                        {!col.nullable && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 h-3.5 shrink-0 text-muted-foreground/60"
                          >
                            NN
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
