import { Table } from './types'

export const SYSTEM_PROMPT = `You are a SQL expert assistant.
You write correct, readable PostgreSQL and explain queries clearly.
Never hallucinate column or table names — only use what is provided in the schema.
If the question is ambiguous, state your assumption before answering.`

export function buildNLtoSQLPrompt(schema: Table[], question: string): string {
  const schemaBlock = schema.length
    ? schema
        .map(
          (t) =>
            `Table: ${t.name}\nColumns: ${t.columns
              .map((c) => `${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`)
              .join(', ')}`
        )
        .join('\n\n')
    : '(no schema provided — write a generic example query)'

  return `Given the schema below, write a correct PostgreSQL query for the user's question.

SCHEMA:
${schemaBlock}

QUESTION: ${question}

Respond with:
1. The SQL query in a fenced \`\`\`sql block
2. A brief explanation of each clause (1–2 sentences each), starting with **Explanation:**`
}

export const CHAT_SYSTEM_PROMPT = `You are a SQL expert helping a user iteratively build a PostgreSQL query through conversation.
Each user message may refine, extend, or change the previous query — apply the requested change to your last SQL.
Always respond with the FULL updated SQL (never partial diffs).
Never hallucinate table or column names — only use what was provided in the schema.
Format every response as:
1. The complete SQL in a \`\`\`sql block
2. **Explanation:** followed by a brief clause-by-clause breakdown of what changed.`

export function buildChatFirstMessage(schema: Table[], question: string): string {
  const schemaBlock = schema.length
    ? schema
        .map(
          (t) =>
            `Table: ${t.name}\nColumns: ${t.columns
              .map((c) => `${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`)
              .join(', ')}`
        )
        .join('\n\n')
    : '(no schema provided — write a generic example query)'

  return `SCHEMA:\n${schemaBlock}\n\nQUESTION: ${question}`
}

export function buildSQLExplainPrompt(sql: string): string {
  return `Explain the following SQL query in plain English.
Break it down clause by clause (SELECT, FROM, JOIN, WHERE, GROUP BY, HAVING, ORDER BY, etc.).
Be concise but precise. Assume the reader understands databases but not this specific query.

SQL:
\`\`\`sql
${sql}
\`\`\``
}
