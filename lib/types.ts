export type DataType = 'TEXT' | 'INTEGER' | 'BOOLEAN' | 'TIMESTAMP' | 'NUMERIC' | 'UUID'

export interface Column {
  id: string
  name: string
  type: DataType
  nullable: boolean
}

export interface Table {
  id: string
  name: string
  columns: Column[]
}

export interface DbConnection {
  id: string
  name: string
  url: string        // stored in localStorage (masked in UI)
  readOnly: boolean
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationTurn {
  id: string
  userMessage: string
  sql: string
  explanation: string
  result?: QueryResult
  runError?: string
}

export interface QueryRecord {
  id: string
  mode: 'nl-to-sql' | 'sql-explain' | 'chat-sql'
  input: string
  output: string
  schema?: Table[]
  createdAt: number
}

export type AgentEvent =
  | { type: 'status'; text: string }
  | { type: 'tool_call'; description: string; sql: string }
  | { type: 'tool_result'; rows: Record<string, unknown>[]; rowCount: number; error?: string }
  | { type: 'report'; text: string }
  | { type: 'done'; queryCount: number; duration: number }
  | { type: 'error'; message: string }

export interface ScheduledReport {
  id: string
  name: string
  question: string          // natural-language prompt for the agent
  connectionId: string      // DbConnection.id
  recipientEmail: string
  schedule: 'daily' | 'weekly' | 'manual'
  createdAt: number
  lastRunAt?: number
  lastStatus?: 'ok' | 'error'
}

export interface ReportRun {
  id: string
  reportId: string
  startedAt: number
  finishedAt?: number
  status: 'running' | 'ok' | 'error'
  reportText?: string
  errorMessage?: string
  queryCount?: number
  emailMessageId?: string
}
