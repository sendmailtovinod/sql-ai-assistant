import Anthropic from '@anthropic-ai/sdk'
import { buildSQLExplainPrompt, SYSTEM_PROMPT } from '@/lib/prompts'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { sql }: { sql: string } = await req.json()

    if (!sql?.trim()) {
      return new Response('SQL is required', { status: 400 })
    }

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: buildSQLExplainPrompt(sql),
        },
      ],
    })

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text))
          }
        }
        controller.close()
      },
      cancel() {
        stream.abort()
      },
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
