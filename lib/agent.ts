import Anthropic from '@anthropic-ai/sdk'
import { Table } from './types'

export const AGENT_SYSTEM_PROMPT = `You are a Business Health Agent for a PostgreSQL database.
Your job is to autonomously analyse the database and produce a clear business health report.

Steps:
1. Examine the schema to understand the business domain (e-commerce, SaaS, logistics, etc.)
2. Identify the key health metrics that matter — revenue, signups, orders, activity, churn, etc.
3. Run targeted SQL queries to measure those metrics (maximum 5 queries)
4. Where possible compare current vs historical periods (today vs yesterday, this week vs last week)
5. Flag any anomalies, drops, or concerns you detect
6. ALWAYS call deliver_report — you MUST end every analysis by calling deliver_report

Rules:
- Only write SELECT or WITH queries — never INSERT, UPDATE, DELETE, DROP, etc.
- Keep queries simple and efficient — avoid full table scans on large data
- Run at most 5 queries — after 5 queries you MUST call deliver_report immediately
- If a query fails, note it in the report and move on
- Be specific: include actual numbers in the report
- You MUST call deliver_report as your final action — never end without calling it
- Do NOT write a text response after running queries — use deliver_report instead`

export const agentTools: Anthropic.Tool[] = [
  {
    name: 'run_sql',
    description:
      'Execute a read-only SELECT query on the database. Use this to gather data for your analysis.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'The SELECT SQL query to execute',
        },
        description: {
          type: 'string',
          description: 'One-line summary of what this query checks (shown in the UI)',
        },
      },
      required: ['sql', 'description'],
    },
  },
  {
    name: 'deliver_report',
    description:
      'Submit the final business health report. Call this exactly once when your analysis is complete.',
    input_schema: {
      type: 'object',
      properties: {
        report: {
          type: 'string',
          description: 'Full business health report in markdown format',
        },
      },
      required: ['report'],
    },
  },
]

export function buildAgentFirstMessage(schema: Table[], question?: string): string {
  const schemaBlock = schema
    .map(
      (t) =>
        `Table: ${t.name}\nColumns: ${t.columns
          .map((c) => `${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`)
          .join(', ')}`
    )
    .join('\n\n')

  const task = question?.trim() ||
    'Analyse the business health of this database and deliver a report.'

  return `SCHEMA:\n${schemaBlock}\n\nCurrent date/time (UTC): ${new Date().toISOString()}\n\n${task}`
}
