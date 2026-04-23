import { DbConnection } from './types'

const KEY = 'sql-connections'

export function getConnections(): DbConnection[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveConnection(conn: DbConnection): void {
  const prev = getConnections().filter((c) => c.id !== conn.id)
  localStorage.setItem(KEY, JSON.stringify([conn, ...prev]))
}

export function deleteConnection(id: string): void {
  const prev = getConnections().filter((c) => c.id !== id)
  localStorage.setItem(KEY, JSON.stringify(prev))
}
