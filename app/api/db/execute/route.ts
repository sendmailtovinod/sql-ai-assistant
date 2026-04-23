import { Client } from 'pg'
import { QueryResult } from '@/lib/types'

const WRITE_PATTERN = /^\s*(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|REPLACE|MERGE)\b/i

export async function POST(req: Request) {
  const { url, sql, readOnly }: { url: string; sql: string; readOnly: boolean } = await req.json()

  if (!url?.trim()) return Response.json({ error: 'No connection URL' }, { status: 400 })
  if (!sql?.trim()) return Response.json({ error: 'No SQL provided' }, { status: 400 })

  if (readOnly && WRITE_PATTERN.test(sql)) {
    return Response.json(
      { error: 'Read-only mode is on. Only SELECT / WITH / EXPLAIN queries are allowed.' },
      { status: 403 }
    )
  }

  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 8000,
    ssl: url.includes('sslmode=require') || url.includes('neon.tech') || url.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  })

  try {
    await client.connect()

    if (readOnly) {
      await client.query('BEGIN READ ONLY')
    }

    const result = await client.query(sql)

    if (readOnly) {
      await client.query('ROLLBACK')
    }

    const columns = result.fields?.map((f) => f.name) ?? []
    const rows = (result.rows ?? []).slice(0, 500)  // cap at 500 rows for display

    const payload: QueryResult = {
      columns,
      rows,
      rowCount: result.rowCount ?? rows.length,
    }

    return Response.json(payload)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Query failed'
    return Response.json({ error: msg }, { status: 400 })
  } finally {
    await client.end().catch(() => {})
  }
}
