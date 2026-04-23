export const maxDuration = 60 // seconds — requires Vercel Pro

import Anthropic from '@anthropic-ai/sdk'
import { Client } from 'pg'
import { Table, AgentEvent } from '@/lib/types'
import { AGENT_SYSTEM_PROMPT, agentTools, buildAgentFirstMessage } from '@/lib/agent'

const anthropic = new Anthropic()
const MAX_ITERATIONS = 12
const MAX_ROWS = 20  // rows returned to Claude per query (keep context tight)

const WRITE_PATTERN =
  /^\s*(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|REPLACE|MERGE)\b/i

export async function POST(req: Request) {
  const { url, schema }: { url: string; schema: Table[] } = await req.json()

  if (!url?.trim()) {
    return new Response(JSON.stringify({ type: 'error', message: 'No connection URL' }), {
      status: 400,
    })
  }

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      function send(event: AgentEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      const pgClient = new Client({
        connectionString: url,
        connectionTimeoutMillis: 8000,
        ssl:
          url.includes('sslmode=require') ||
          url.includes('neon.tech') ||
          url.includes('supabase')
            ? { rejectUnauthorized: false }
            : undefined,
      })

      try {
        await pgClient.connect()
        send({ type: 'status', text: 'Connected. Analysing schema…' })

        const messages: Anthropic.Messages.MessageParam[] = [
          { role: 'user', content: buildAgentFirstMessage(schema) },
        ]

        let queryCount = 0
        const startTime = Date.now()
        let reportDelivered = false

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: AGENT_SYSTEM_PROMPT,
            tools: agentTools,
            messages,
          })

          // Append full assistant response (may contain text + tool_use blocks)
          messages.push({ role: 'assistant', content: response.content })

          if (response.stop_reason === 'end_turn') break
          if (response.stop_reason !== 'tool_use') break

          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

          for (const block of response.content) {
            if (block.type !== 'tool_use') continue

            if (block.name === 'run_sql') {
              const { sql, description } = block.input as { sql: string; description: string }

              // Safety: block write statements even from the agent
              if (WRITE_PATTERN.test(sql)) {
                send({
                  type: 'tool_call',
                  description,
                  sql,
                })
                send({
                  type: 'tool_result',
                  rows: [],
                  rowCount: 0,
                  error: 'Write statements are not allowed.',
                })
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({ error: 'Write statements are not allowed.' }),
                })
                continue
              }

              send({ type: 'tool_call', description, sql })

              try {
                await pgClient.query('BEGIN READ ONLY')
                const result = await pgClient.query(sql)
                await pgClient.query('ROLLBACK')

                const rows = (result.rows ?? []).slice(0, MAX_ROWS)
                queryCount++

                send({ type: 'tool_result', rows, rowCount: result.rowCount ?? rows.length })
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({ rows, rowCount: result.rowCount ?? rows.length }),
                })
              } catch (e) {
                const error = e instanceof Error ? e.message : 'Query failed'
                try { await pgClient.query('ROLLBACK') } catch { /* ignore */ }
                send({ type: 'tool_result', rows: [], rowCount: 0, error })
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({ error }),
                })
              }
            } else if (block.name === 'deliver_report') {
              const { report } = block.input as { report: string }
              reportDelivered = true
              send({ type: 'report', text: report })
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'Report delivered.',
              })
            }
          }

          messages.push({ role: 'user', content: toolResults })

          if (reportDelivered) break
        }

        if (!reportDelivered) {
          send({
            type: 'error',
            message: 'Agent did not deliver a report within the iteration limit.',
          })
        }

        send({ type: 'done', queryCount, duration: Date.now() - startTime })
      } catch (e) {
        send({
          type: 'error',
          message: e instanceof Error ? e.message : 'Agent failed unexpectedly',
        })
      } finally {
        await pgClient.end().catch(() => {})
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
