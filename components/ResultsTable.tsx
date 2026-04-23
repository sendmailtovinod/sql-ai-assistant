'use client'

import { QueryResult } from '@/lib/types'

interface Props {
  result: QueryResult
  error?: string
  loading?: boolean
}

export default function ResultsTable({ result, error, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <span className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </span>
        Running query…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive font-mono">
        {error}
      </div>
    )
  }

  if (!result?.columns?.length) return null

  const { columns, rows, rowCount } = result
  const capped = rows.length < rowCount

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Results
        </span>
        <span className="text-xs text-muted-foreground">
          {rowCount.toLocaleString()} row{rowCount !== 1 ? 's' : ''}
          {capped && ` (showing first ${rows.length})`}
        </span>
      </div>

      <div className="overflow-auto rounded-lg border max-h-72">
        <table className="w-full text-xs border-collapse">
          <thead className="bg-muted sticky top-0">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-muted-foreground border-b whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                {columns.map((col) => {
                  const val = row[col]
                  const display =
                    val === null
                      ? 'NULL'
                      : val instanceof Date
                      ? val.toISOString()
                      : typeof val === 'object'
                      ? JSON.stringify(val)
                      : String(val)
                  return (
                    <td
                      key={col}
                      className={`px-3 py-1.5 max-w-[240px] truncate whitespace-nowrap ${
                        val === null ? 'text-muted-foreground/50 italic' : ''
                      }`}
                      title={display}
                    >
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
