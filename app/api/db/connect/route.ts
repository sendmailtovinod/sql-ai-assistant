import { Client } from 'pg'
import { Table, Column } from '@/lib/types'
import { pgTypeToDataType } from '@/lib/pgTypeMap'

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export async function POST(req: Request) {
  const { url }: { url: string } = await req.json()

  if (!url?.trim()) {
    return Response.json({ error: 'Connection URL is required' }, { status: 400 })
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

    const { rows } = await client.query<{
      table_name: string
      column_name: string
      data_type: string
      is_nullable: string
    }>(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)

    // Group into Table[] structure
    const tableMap = new Map<string, Column[]>()
    for (const row of rows) {
      if (!tableMap.has(row.table_name)) tableMap.set(row.table_name, [])
      tableMap.get(row.table_name)!.push({
        id: makeId(),
        name: row.column_name,
        type: pgTypeToDataType(row.data_type),
        nullable: row.is_nullable === 'YES',
      })
    }

    const tables: Table[] = Array.from(tableMap.entries()).map(([name, columns]) => ({
      id: makeId(),
      name,
      columns,
    }))

    return Response.json({ tables, tableCount: tables.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Connection failed'
    return Response.json({ error: msg }, { status: 400 })
  } finally {
    await client.end().catch(() => {})
  }
}
