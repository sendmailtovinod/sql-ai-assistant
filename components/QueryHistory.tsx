'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { QueryRecord } from '@/lib/types'
import { getHistory, clearHistory } from '@/lib/history'

interface Props {
  open: boolean
  onClose: () => void
  refreshKey: number
  onRestore: (record: QueryRecord) => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function QueryHistory({ open, onClose, refreshKey, onRestore }: Props) {
  const [records, setRecords] = useState<QueryRecord[]>([])

  useEffect(() => {
    if (open) setRecords(getHistory())
  }, [open, refreshKey])

  function handleClear() {
    clearHistory()
    setRecords([])
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>Query History</SheetTitle>
            {records.length > 0 && (
              <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={handleClear}>
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 px-6">
              No queries yet. Generate your first SQL query to see it here.
            </p>
          ) : (
            <div className="divide-y">
              {records.map((r) => (
                <button
                  key={r.id}
                  className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors"
                  onClick={() => { onRestore(r); onClose() }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={r.mode === 'nl-to-sql' ? 'default' : r.mode === 'chat-sql' ? 'outline' : 'secondary'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {r.mode === 'nl-to-sql' ? 'NL → SQL' : r.mode === 'chat-sql' ? 'Chat SQL' : 'Explain'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="text-sm truncate text-foreground">{r.input}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
