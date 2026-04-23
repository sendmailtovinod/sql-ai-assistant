export const maxDuration = 60 // requires Vercel Pro; free tier caps at 10s

import { Client } from 'pg'
import { Table, AgentEvent } from '@/lib/types'
import { AGENT_SYSTEM_PROMPT, agentTools, buildAgentFirstMessage } from '@/lib/agent'
import { anthropic } from '@/lib/langsmith'
import Anthropic from '@anthropic-ai/sdk'

const MAX_ITERATIONS = 12
const MAX_ROWS = 20
const WRITE_PATTERN =
  /^\s*(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|REPLACE|MERGE)\b/i

export async function POST(req: Request) {
  const {
    url,
    schema,
    question,
  }: { url: string; schema: Table[]; question: string } = await req.json()

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
        send({ type: 'status', text: 'Connected. Running scheduled report…' })

        const firstMessage = question
          ? buildAgentFirstMessage(schema, question)
          : buildAgentFirstMessage(schema)

        const messages: Anthropic.Messages.MessageParam[] = [
          { role: 'user', content: firstMessage },
        ]

        let queryCount = 0
        const startTime = Date.now()
        let reportDelivered = false
        let reportText = ''
        let totalInputTokens = 0
        let totalOutputTokens = 0

        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: AGENT_SYSTEM_PROMPT,
            tools: agentTools,
            messages,
          })

          totalInputTokens += response.usage.input_tokens
          totalOutputTokens += response.usage.output_tokens

          messages.push({ role: 'assistant', content: response.content })

          if (response.stop_reason === 'end_turn') {
            if (!reportDelivered) {
              const textContent = response.content
                .filter((b) => b.type === 'text')
                .map((b) => (b as { type: 'text'; text: string }).text)
                .join('\n')
              if (textContent.trim()) {
                reportDelivered = true
                reportText = textContent
                send({ type: 'report', text: textContent })
              }
            }
            break
          }
          if (response.stop_reason !== 'tool_use') break

          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

          for (const block of response.content) {
            if (block.type !== 'tool_use') continue

            if (block.name === 'run_sql') {
              const { sql, description } = block.input as { sql: string; description: string }

              if (WRITE_PATTERN.test(sql)) {
                send({ type: 'tool_call', description, sql })
                send({ type: 'tool_result', rows: [], rowCount: 0, error: 'Write statements are not allowed.' })
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
              reportText = report
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
          const lastMsg = messages.at(-1)
          if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.content)) {
            const text = (lastMsg.content as Anthropic.Messages.ContentBlock[])
              .filter((b) => b.type === 'text')
              .map((b) => (b as { type: 'text'; text: string }).text)
              .join('\n')
            if (text.trim()) {
              reportText = text
              send({ type: 'report', text })
            } else {
              send({ type: 'error', message: 'Agent did not deliver a report within the iteration limit.' })
            }
          } else {
            send({ type: 'error', message: 'Agent did not deliver a report within the iteration limit.' })
          }
        }

        const duration = Date.now() - startTime
        send({ type: 'done', queryCount, duration })

        // Include reportText in a trailing metadata line for the caller
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: '__meta__', reportText, queryCount, duration }) + '\n')
        )

        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          event: 'claude_call',
          route: 'reports/run',
          total_input_tokens: totalInputTokens,
          total_output_tokens: totalOutputTokens,
          query_count: queryCount,
          duration_ms: duration,
        }))
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : 'Agent failed unexpectedly' })
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
