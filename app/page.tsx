'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import SchemaBuilder from '@/components/SchemaBuilder'
import NLToSQL from '@/components/NLToSQL'
import ConversationalSQL from '@/components/ConversationalSQL'
import QueryHistory from '@/components/QueryHistory'
import ConnectionManager from '@/components/ConnectionManager'
import AgentReport from '@/components/AgentReport'
import ScheduledReports from '@/components/ScheduledReports'
import { Table, QueryRecord, DbConnection } from '@/lib/types'
import { saveConnection } from '@/lib/connections'

export default function Home() {
  const [schema, setSchema] = useState<Table[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const [activeTab, setActiveTab] = useState('nl-to-sql')
  const [restoredNL, setRestoredNL] = useState<string | undefined>(undefined)
  const [restoredChat, setRestoredChat] = useState<string | undefined>(undefined)
  const [activeConnection, setActiveConnection] = useState<DbConnection | null>(null)
  const [missingKeys, setMissingKeys] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        const missing: string[] = []
        if (!data.checks?.anthropic) missing.push('ANTHROPIC_API_KEY')
        if (!data.checks?.resend) missing.push('RESEND_API_KEY')
        setMissingKeys(missing)
      })
      .catch(() => {})
  }, [])

  function onSaved() {
    setHistoryKey((k) => k + 1)
  }

  function onRestore(record: QueryRecord) {
    if (record.mode === 'chat-sql') {
      setActiveTab('chat-sql')
      setRestoredChat(record.input)
    } else {
      setActiveTab('nl-to-sql')
      setRestoredNL(record.input)
    }
  }

  function onConnect(conn: DbConnection, tables: Table[]) {
    setActiveConnection(conn)
    saveConnection(conn)
    if (tables.length > 0) {
      setSchema(tables)
    }
  }

  function onDisconnect() {
    setActiveConnection(null)
    setSchema([])
    localStorage.removeItem('sql-schema')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">SQL AI Assistant</h1>
          <p className="text-xs text-muted-foreground">
            Natural language → SQL &nbsp;·&nbsp; Chat SQL
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
          History
        </Button>
      </header>

      {missingKeys.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/40 border-b border-yellow-200 dark:border-yellow-800 px-6 py-2 text-xs text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
          <span className="font-medium">Missing env vars:</span>
          {missingKeys.map((k) => (
            <code key={k} className="bg-yellow-100 dark:bg-yellow-900 px-1.5 py-0.5 rounded font-mono">{k}</code>
          ))}
          <span className="text-yellow-600 dark:text-yellow-400">— set them in Vercel → Project → Settings → Environment Variables</span>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Connection + Schema Panel */}
        <aside className="w-64 shrink-0 border-r overflow-y-auto p-4 bg-muted/20 flex flex-col gap-5">
          <ConnectionManager
            activeConnection={activeConnection}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
          <Separator />
          <SchemaBuilder onChange={setSchema} externalTables={schema} />
        </aside>

        <Separator orientation="vertical" />

        {/* Right: Main Panel */}
        <main className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="nl-to-sql">NL → SQL</TabsTrigger>
              <TabsTrigger value="chat-sql">Chat SQL</TabsTrigger>
              <TabsTrigger value="agent">Health Agent</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="nl-to-sql">
              <NLToSQL
                schema={schema}
                onSaved={onSaved}
                key={restoredNL ?? 'default'}
                initialQuestion={restoredNL}
                connection={activeConnection}
              />
            </TabsContent>

            <TabsContent value="chat-sql" className="h-full">
              <ConversationalSQL
                schema={schema}
                connection={activeConnection}
                onSaved={onSaved}
                key={restoredChat ?? 'chat-default'}
                initialQuestion={restoredChat}
              />
            </TabsContent>

            <TabsContent value="agent">
              <AgentReport
                schema={schema}
                connection={activeConnection}
              />
            </TabsContent>

            <TabsContent value="reports">
              <ScheduledReports
                schema={schema}
                connection={activeConnection}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <QueryHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        refreshKey={historyKey}
        onRestore={onRestore}
      />
    </div>
  )
}
