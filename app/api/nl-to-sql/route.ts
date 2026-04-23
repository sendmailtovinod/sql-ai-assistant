export const maxDuration = 30

import { buildNLtoSQLPrompt, SYSTEM_PROMPT } from '@/lib/prompts'
import { Table } from '@/lib/types'
import { anthropic } from '@/lib/langsmith'

export async function POST(req: Request) {
  try {
    const { schema, question }: { schema: Table[]; question: string } = await req.json()

    if (!question?.trim()) {
      return new Response('Question is required', { status: 400 })
    }

    const startTime = Date.now()

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildNLtoSQLPrompt(schema ?? [], question) }],
    })

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text))
          }
        }
        controller.close()

        const final = await stream.finalMessage()
        const u = final.usage
        console.log(JSON.stringify({
          ts: new Date().toISOString(),
          event: 'claude_call',
          route: 'nl-to-sql',
          model: final.model,
          input_tokens: u.input_tokens,
          output_tokens: u.output_tokens,
          cache_read_tokens: u.cache_read_input_tokens ?? 0,
          cache_write_tokens: u.cache_creation_input_tokens ?? 0,
          latency_ms: Date.now() - startTime,
        }))
      },
      cancel() { stream.abort() },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return new Response(msg, { status: 500 })
  }
}
