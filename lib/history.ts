import { QueryRecord } from './types'

const KEY = 'sql-query-history'

export function saveQuery(record: QueryRecord): void {
  const prev = getHistory()
  const updated = [record, ...prev].slice(0, 20)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export function getHistory(): QueryRecord[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function clearHistory(): void {
  localStorage.removeItem(KEY)
}
