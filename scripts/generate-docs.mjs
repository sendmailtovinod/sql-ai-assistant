import puppeteer from 'puppeteer'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SQL AI Assistant — Project Design</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    color: #1a1a2e;
    background: #fff;
    line-height: 1.6;
  }

  /* ── Cover ── */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
    color: #fff;
    page-break-after: always;
  }
  .cover-tag {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #a78bfa;
    margin-bottom: 24px;
  }
  .cover h1 {
    font-size: 52px;
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  .cover h1 span { color: #a78bfa; }
  .cover-sub {
    font-size: 18px;
    color: #c4b5fd;
    margin-bottom: 48px;
  }
  .cover-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 60px;
  }
  .pill {
    padding: 6px 16px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid rgba(167,139,250,0.4);
    color: #e9d5ff;
  }
  .cover-meta {
    font-size: 12px;
    color: #7c3aed;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 24px;
    display: flex;
    gap: 40px;
  }

  /* ── Layout ── */
  .page { padding: 56px 64px; }
  .section { margin-bottom: 48px; }
  .page-break { page-break-before: always; }

  h2 {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
    border-bottom: 3px solid #7c3aed;
    padding-bottom: 8px;
    margin-bottom: 24px;
  }
  h3 {
    font-size: 15px;
    font-weight: 600;
    color: #312e81;
    margin: 20px 0 10px;
  }
  p { margin-bottom: 12px; color: #374151; }

  /* ── Feature Grid ── */
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  .feature-card {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 16px;
    background: #fafafa;
  }
  .feature-card .icon { font-size: 22px; margin-bottom: 8px; }
  .feature-card h4 { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 4px; }
  .feature-card p { font-size: 12px; color: #6b7280; margin: 0; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
  th {
    background: #312e81;
    color: #fff;
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  td { padding: 9px 14px; border-bottom: 1px solid #e5e7eb; color: #374151; }
  tr:nth-child(even) td { background: #f9fafb; }
  tr:hover td { background: #f3f4f6; }

  /* ── Code ── */
  code {
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    color: #7c3aed;
  }
  pre {
    background: #1e1b4b;
    color: #c4b5fd;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    font-size: 11px;
    overflow: hidden;
    margin-bottom: 16px;
    line-height: 1.7;
  }

  /* ── Badge ── */
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 500;
  }
  .badge-purple { background: #ede9fe; color: #5b21b6; }
  .badge-green  { background: #dcfce7; color: #166534; }
  .badge-blue   { background: #dbeafe; color: #1e40af; }
  .badge-orange { background: #ffedd5; color: #9a3412; }

  /* ── Mermaid ── */
  .diagram-wrap {
    background: #fafafa;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 24px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  .diagram-wrap .mermaid {
    display: flex;
    justify-content: center;
  }
  .diagram-wrap .mermaid svg { max-width: 100%; height: auto; }
  .diagram-title {
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }

  /* ── Callout ── */
  .callout {
    border-left: 4px solid #7c3aed;
    background: #f5f3ff;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin-bottom: 16px;
    font-size: 12px;
    color: #4c1d95;
  }

  /* ── File tree ── */
  .tree {
    font-family: 'Cascadia Code', monospace;
    font-size: 11.5px;
    background: #1e1b4b;
    color: #c4b5fd;
    padding: 20px 24px;
    border-radius: 8px;
    line-height: 1.9;
    margin-bottom: 16px;
  }
  .tree .dir { color: #818cf8; font-weight: 600; }
  .tree .file { color: #e0e7ff; }
  .tree .comment { color: #6366f1; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════ COVER -->
<div class="cover">
  <div class="cover-tag">Architecture &amp; Design Documentation</div>
  <h1>SQL AI <span>Assistant</span></h1>
  <div class="cover-sub">Natural Language → SQL · Conversational Refinement · Autonomous Health Agent</div>
  <div class="cover-pills">
    <span class="pill">Next.js 16</span>
    <span class="pill">Claude claude-sonnet-4-6</span>
    <span class="pill">PostgreSQL</span>
    <span class="pill">TypeScript</span>
    <span class="pill">Tailwind CSS</span>
    <span class="pill">Anthropic SDK</span>
    <span class="pill">shadcn/ui</span>
    <span class="pill">Streaming</span>
    <span class="pill">Tool Use</span>
  </div>
  <div class="cover-meta">
    <span>Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
    <span>Model: claude-sonnet-4-6</span>
    <span>Patterns: Single-turn · Multi-turn · Agentic</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ OVERVIEW -->
<div class="page">
  <div class="section">
    <h2>1 · Project Overview</h2>
    <p>
      SQL AI Assistant is a full-stack web application that allows developers and analysts to interact
      with PostgreSQL databases using natural language. It demonstrates three increasingly powerful
      agentic patterns built on the Anthropic Claude API.
    </p>

    <div class="feature-grid">
      <div class="feature-card">
        <div class="icon">✍️</div>
        <h4>NL → SQL</h4>
        <p>Single-turn generation — describe your query in plain English, get production-ready SQL with clause-by-clause explanation.</p>
      </div>
      <div class="feature-card">
        <div class="icon">💬</div>
        <h4>Chat SQL</h4>
        <p>Multi-turn refinement — iteratively build complex queries through conversation without rewriting from scratch.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🤖</div>
        <h4>Health Agent</h4>
        <p>Autonomous agent — connects to your DB, decides what to measure, runs queries, and delivers a business health report.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🔌</div>
        <h4>Connection Manager</h4>
        <p>Save multiple PostgreSQL connections. Toggle read-only mode to prevent accidental writes.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🌲</div>
        <h4>Schema Browser</h4>
        <p>Live collapsible tree of all tables and columns, colour-coded by data type. Auto-expands on connect.</p>
      </div>
      <div class="feature-card">
        <div class="icon">📊</div>
        <h4>Query History</h4>
        <p>Last 20 queries stored in localStorage. One-click restore sends any past question back to the generator.</p>
      </div>
    </div>

    <h3>Agentic Patterns Used</h3>
    <table>
      <tr><th>Pattern</th><th>Feature</th><th>Description</th></tr>
      <tr><td><span class="badge badge-blue">Single-turn</span></td><td>NL → SQL</td><td>One prompt → one response, streamed back to the UI</td></tr>
      <tr><td><span class="badge badge-purple">Multi-turn</span></td><td>Chat SQL</td><td>Full message history re-sent each turn so Claude can refine in context</td></tr>
      <tr><td><span class="badge badge-orange">Tool Use</span></td><td>Health Agent</td><td>Claude calls <code>run_sql</code> and <code>deliver_report</code> tools autonomously</td></tr>
      <tr><td><span class="badge badge-green">Prompt Caching</span></td><td>Both APIs</td><td><code>cache_control: ephemeral</code> on system prompts — cache_read_tokens rises on repeated calls</td></tr>
    </table>
  </div>

  <!-- ── Tech Stack ── -->
  <div class="section">
    <h2>2 · Technology Stack</h2>
    <table>
      <tr><th>Layer</th><th>Technology</th><th>Purpose</th></tr>
      <tr><td>Frontend</td><td>Next.js 16 · React 19 · TypeScript</td><td>App Router, Server Components, API Routes</td></tr>
      <tr><td>Styling</td><td>Tailwind CSS v4 · shadcn/ui</td><td>Utility-first CSS, accessible component primitives</td></tr>
      <tr><td>AI</td><td>Anthropic claude-sonnet-4-6</td><td>SQL generation, chat refinement, tool-use agent</td></tr>
      <tr><td>Streaming</td><td>Anthropic SDK <code>messages.stream()</code> + <code>ReadableStream</code></td><td>Token-by-token streaming from Claude to browser</td></tr>
      <tr><td>Database</td><td>PostgreSQL · <code>pg</code> Node.js client</td><td>Connect, schema introspection, execute queries</td></tr>
      <tr><td>Persistence</td><td>localStorage</td><td>Connections, query history, schema cache</td></tr>
      <tr><td>Telemetry</td><td><code>useReportWebVitals</code> · server console logs</td><td>Web Vitals (browser) + Claude token usage (server)</td></tr>
    </table>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ FILE STRUCTURE -->
<div class="page page-break">
  <div class="section">
    <h2>3 · File Structure</h2>
    <div class="tree">
<span class="dir">app/</span>
  <span class="file">  layout.tsx</span>          <span class="comment">← WebVitals telemetry injected here</span>
  <span class="file">  page.tsx</span>            <span class="comment">← Main page: tabs, connection state, history</span>
  <span class="dir">  _components/</span>
    <span class="file">    web-vitals.tsx</span>    <span class="comment">← useReportWebVitals → console JSON</span>
  <span class="dir">  api/</span>
    <span class="dir">    nl-to-sql/route.ts</span>  <span class="comment">← POST: schema+question → streaming SQL</span>
    <span class="dir">    chat-sql/route.ts</span>   <span class="comment">← POST: messages[] → streaming refinement</span>
    <span class="dir">    db/connect/route.ts</span> <span class="comment">← POST: url → Table[] via information_schema</span>
    <span class="dir">    db/execute/route.ts</span> <span class="comment">← POST: url+sql → QueryResult (read-only safe)</span>
    <span class="dir">    agent/run/route.ts</span>  <span class="comment">← POST: url+schema → NDJSON agent stream</span>

<span class="dir">components/</span>
  <span class="file">  NLToSQL.tsx</span>         <span class="comment">← Single-turn generation + run on DB</span>
  <span class="file">  ConversationalSQL.tsx</span><span class="comment">← Multi-turn chat, turn cards, run per turn</span>
  <span class="file">  AgentReport.tsx</span>     <span class="comment">← Agent activity feed + rendered report</span>
  <span class="file">  ConnectionManager.tsx</span><span class="comment">← DB connect form, saved list, RO toggle</span>
  <span class="file">  SchemaBuilder.tsx</span>   <span class="comment">← Collapsible tree, expand/collapse all</span>
  <span class="file">  ResultsTable.tsx</span>    <span class="comment">← Scrollable grid, row count, 500-row cap</span>
  <span class="file">  QueryHistory.tsx</span>    <span class="comment">← Sheet drawer, restore to NL→SQL</span>

<span class="dir">lib/</span>
  <span class="file">  types.ts</span>            <span class="comment">← DataType Column Table DbConnection QueryResult</span>
  <span class="file">  prompts.ts</span>          <span class="comment">← SYSTEM_PROMPT buildNLtoSQLPrompt CHAT_SYSTEM_PROMPT</span>
  <span class="file">  agent.ts</span>            <span class="comment">← AGENT_SYSTEM_PROMPT agentTools buildAgentFirstMessage</span>
  <span class="file">  connections.ts</span>      <span class="comment">← getConnections saveConnection deleteConnection</span>
  <span class="file">  history.ts</span>          <span class="comment">← saveQuery getHistory clearHistory</span>
  <span class="file">  pgTypeMap.ts</span>        <span class="comment">← pg data_type string → DataType enum</span>

<span class="dir">scripts/</span>
  <span class="file">  seed.sql</span>            <span class="comment">← users (5) + orders (20) for local dev</span>
  <span class="file">  generate-docs.mjs</span>   <span class="comment">← this script → docs/project-design.pdf</span>
    </div>
  </div>

  <!-- ── API Reference ── -->
  <div class="section">
    <h2>4 · API Reference</h2>
    <table>
      <tr><th>Endpoint</th><th>Method</th><th>Input</th><th>Output</th></tr>
      <tr>
        <td><code>/api/nl-to-sql</code></td><td>POST</td>
        <td><code>{ schema: Table[], question: string }</code></td>
        <td>Streamed text (SQL + explanation)</td>
      </tr>
      <tr>
        <td><code>/api/chat-sql</code></td><td>POST</td>
        <td><code>{ messages: ChatMessage[] }</code></td>
        <td>Streamed text (refined SQL + explanation)</td>
      </tr>
      <tr>
        <td><code>/api/db/connect</code></td><td>POST</td>
        <td><code>{ url: string }</code></td>
        <td><code>{ tables: Table[], tableCount: number }</code></td>
      </tr>
      <tr>
        <td><code>/api/db/execute</code></td><td>POST</td>
        <td><code>{ url, sql, readOnly: boolean }</code></td>
        <td><code>QueryResult</code> (columns, rows, rowCount)</td>
      </tr>
      <tr>
        <td><code>/api/agent/run</code></td><td>POST</td>
        <td><code>{ url, schema: Table[] }</code></td>
        <td>NDJSON stream of <code>AgentEvent</code></td>
      </tr>
    </table>

    <h3>AgentEvent Types (NDJSON stream)</h3>
    <pre>{ type: "status",      text: string }
{ type: "tool_call",   description: string, sql: string }
{ type: "tool_result", rows: object[], rowCount: number, error?: string }
{ type: "report",      text: string }
{ type: "done",        queryCount: number, duration: number }
{ type: "error",       message: string }</pre>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ FLOW DIAGRAM -->
<div class="page page-break">
  <div class="section">
    <h2>5 · System Flow Diagram</h2>
    <div class="callout">
      Shows how all components connect. Each tab communicates with its own API route.
      The Health Agent is the only flow where Claude drives the execution loop autonomously.
    </div>
    <div class="diagram-wrap">
      <div class="diagram-title">System Architecture — Component &amp; Data Flow</div>
      <div class="mermaid">
flowchart TD
    User(["👤 User"])
    App["app/page.tsx\nSQL AI Assistant"]

    User --> App

    App --> Sidebar
    subgraph Sidebar["Left Sidebar"]
        CM["ConnectionManager\nsaved connections · RO toggle"]
        SB["SchemaBuilder\ncollapsible tree · type colours"]
        CM -->|"tables on connect"| SB
        CM -->|"clear on disconnect"| SB
    end

    App --> Tabs
    subgraph Tabs["Main Panel — 3 Tabs"]
        NL["NL → SQL"]
        Chat["Chat SQL"]
        Agent["Health Agent"]
    end

    CM -->|"POST /api/db/connect"| ConnAPI["db/connect\ninformation_schema query"]
    ConnAPI --> PG[("PostgreSQL")]

    NL -->|"POST /api/nl-to-sql\nschema + question"| NLAPI["nl-to-sql\nstreaming SQL"]
    NLAPI -->|"stream"| Claude{{"Claude API\nclaude-sonnet-4-6"}}
    NL -->|"POST /api/db/execute"| ExecAPI["db/execute\nWRITE_PATTERN check\nBEGIN READ ONLY"]
    ExecAPI --> PG

    Chat -->|"POST /api/chat-sql\nfull messages history"| ChatAPI["chat-sql\nmulti-turn streaming"]
    ChatAPI -->|"stream"| Claude
    Chat -->|"POST /api/db/execute"| ExecAPI

    Agent -->|"POST /api/agent/run"| AgentAPI["agent/run\nagentic loop\nNDJSON stream"]
    AgentAPI -->|"tool use"| Claude
    AgentAPI -->|"run_sql tool"| PG

    NLAPI -->|"token log"| Log["Server stdout\nclaude_call events"]
    ChatAPI -->|"token log"| Log

    App --> LS[("localStorage\nconnections · history")]
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ SEQ: CONNECT -->
<div class="page page-break">
  <div class="section">
    <h2>6 · Sequence Diagrams</h2>

    <h3>6.1 · Database Connection &amp; Schema Import</h3>
    <div class="diagram-wrap">
      <div class="mermaid">
sequenceDiagram
    actor User
    participant CM as ConnectionManager
    participant API as /api/db/connect
    participant PG as PostgreSQL
    participant SB as SchemaBuilder
    participant LS as localStorage

    User->>CM: Enter connection URL, click Connect
    CM->>API: POST { url }
    API->>PG: pg.Client.connect()
    PG-->>API: connected
    API->>PG: SELECT table_name, column_name,<br/>data_type, is_nullable<br/>FROM information_schema.columns<br/>WHERE table_schema = 'public'
    PG-->>API: column rows
    API->>API: Group into Table[] + map pg types
    API-->>CM: { tables: Table[] }
    CM->>LS: saveConnection(conn)
    CM->>SB: externalTables = tables
    SB->>SB: setExpanded(all IDs) — expand all tables
    Note over SB: Schema tree rendered and expanded

    User->>CM: Click ✕ Disconnect
    CM->>SB: externalTables = []
    SB->>SB: setExpanded(empty set)
    SB->>LS: removeItem('sql-schema')
    Note over SB: Schema tree shows empty state
      </div>
    </div>

    <h3>6.2 · NL → SQL Generation + Execute</h3>
    <div class="diagram-wrap">
      <div class="mermaid">
sequenceDiagram
    actor User
    participant NL as NLToSQL
    participant API as /api/nl-to-sql
    participant Claude as Claude API
    participant Exec as /api/db/execute
    participant PG as PostgreSQL
    participant LS as localStorage

    User->>NL: Type question, click Generate
    NL->>API: POST { schema: Table[], question: string }
    API->>Claude: messages.stream()<br/>system: SYSTEM_PROMPT (cache_control: ephemeral)<br/>user: buildNLtoSQLPrompt(schema, question)
    loop Streaming
        Claude-->>API: content_block_delta (text)
        API-->>NL: chunk
        NL->>NL: append to streamBuffer
    end
    API->>API: finalMessage() — log tokens + cache hits
    NL->>NL: parseSQLBlock → { sql, explanation }
    NL->>LS: saveQuery(record)

    User->>NL: Click "Run on DB"
    NL->>Exec: POST { url, sql, readOnly: true }
    Exec->>Exec: WRITE_PATTERN.test(sql) → blocked if write
    Exec->>PG: BEGIN READ ONLY
    Exec->>PG: Execute SQL
    PG-->>Exec: result rows (capped 500)
    Exec->>PG: ROLLBACK
    Exec-->>NL: QueryResult { columns, rows, rowCount }
    NL->>NL: render ResultsTable
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ SEQ: CHAT -->
<div class="page page-break">
  <div class="section">
    <h3>6.3 · Chat SQL — Multi-turn Refinement</h3>
    <div class="callout">
      Schema is injected only in Turn 1. Subsequent turns send plain refinement text.
      Claude retains the full context because all prior messages are re-sent each call.
    </div>
    <div class="diagram-wrap">
      <div class="mermaid">
sequenceDiagram
    actor User
    participant Chat as ConversationalSQL
    participant API as /api/chat-sql
    participant Claude as Claude API
    participant Exec as /api/db/execute
    participant PG as PostgreSQL

    Note over Chat: messages[] = []

    User->>Chat: "Show orders from last 30 days" (Turn 1)
    Chat->>Chat: buildChatFirstMessage(schema, text)<br/>Injects SCHEMA block once
    Chat->>API: POST { messages: [{ role: user, content: SCHEMA+question }] }
    API->>Claude: stream() with CHAT_SYSTEM_PROMPT (cached)
    Claude-->>API: stream SQL + explanation
    API-->>Chat: text chunks
    Chat->>Chat: parseSQLBlock → ConversationTurn 1
    Chat->>Chat: append assistant message to messages[]

    User->>Chat: "Group by status and sum revenue" (Turn 2)
    Note right of Chat: Schema NOT re-sent — Claude has it in context
    Chat->>API: POST { messages: [turn1-user, turn1-assistant, turn2-user] }
    API->>Claude: Full history — Claude refines SQL
    Claude-->>API: updated SQL stream
    API-->>Chat: text chunks
    API->>API: finalMessage() — log tokens + cache_read_tokens
    Chat->>Chat: ConversationTurn 2 appended

    User->>Chat: Click "Run on DB" on Turn 2
    Chat->>Exec: POST { url, sql: turn2.sql, readOnly }
    Exec->>PG: BEGIN READ ONLY → Execute → ROLLBACK
    PG-->>Exec: rows
    Exec-->>Chat: QueryResult
    Chat->>Chat: update turn2.result → render ResultsTable

    User->>Chat: Click "New Chat"
    Chat->>Chat: reset turns[] messages[] input streamBuffer
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ SEQ: AGENT -->
<div class="page page-break">
  <div class="section">
    <h3>6.4 · Business Health Agent — Agentic Loop</h3>
    <div class="callout">
      Claude autonomously decides which queries to run, executes them via the
      <code>run_sql</code> tool, interprets results, and calls <code>deliver_report</code>
      when analysis is complete. The UI updates live via NDJSON streaming.
    </div>
    <div class="diagram-wrap">
      <div class="mermaid">
sequenceDiagram
    actor User
    participant UI as AgentReport
    participant API as /api/agent/run
    participant Claude as Claude API
    participant PG as PostgreSQL

    User->>UI: Click "Run Health Check"
    UI->>API: POST { url, schema: Table[] }
    API->>PG: pg.Client.connect()
    API-->>UI: NDJSON: { type: status, text: "Connected. Analysing schema…" }

    loop Agentic Loop — up to 12 iterations
        API->>Claude: messages.create()<br/>tools: [run_sql, deliver_report]<br/>full message history
        Claude-->>API: stop_reason: tool_use

        alt tool_use = run_sql
            Claude-->>API: { name: run_sql,<br/>input: { sql, description } }
            API->>API: WRITE_PATTERN safety check
            API-->>UI: NDJSON: { type: tool_call, description, sql }
            API->>PG: BEGIN READ ONLY
            API->>PG: Execute SQL
            PG-->>API: rows (capped 20 for context)
            API->>PG: ROLLBACK
            API-->>UI: NDJSON: { type: tool_result, rows, rowCount }
            API->>Claude: tool_result appended to messages
        else tool_use = deliver_report
            Claude-->>API: { name: deliver_report,<br/>input: { report: markdown } }
            API-->>UI: NDJSON: { type: report, text }
            Note right of API: Loop exits
        end
    end

    API-->>UI: NDJSON: { type: done, queryCount, duration }
    API->>PG: pg.Client.end()
    UI->>UI: Render ActivityFeed + ReportBlock
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════ DESIGN DECISIONS -->
<div class="page page-break">
  <div class="section">
    <h2>7 · Design Decisions</h2>
    <table>
      <tr><th>Decision</th><th>Choice</th><th>Rationale</th></tr>
      <tr>
        <td>Schema injection</td>
        <td>Turn 1 only in Chat SQL</td>
        <td>Schema doesn't change mid-conversation. Re-sending costs tokens every turn. Claude retains it in context.</td>
      </tr>
      <tr>
        <td>Prompt caching</td>
        <td><code>cache_control: ephemeral</code> on system prompts</td>
        <td>System prompts are identical across calls. Caching reduces input token cost by up to 90% on repeated calls.</td>
      </tr>
      <tr>
        <td>Chat SQL history limit</td>
        <td>10 turns (warn at 8)</td>
        <td>UX guardrail — long chains drift. At 10 turns ≈ 5K tokens total, well within 200K context. Users start fresh for new topics.</td>
      </tr>
      <tr>
        <td>Read-only safety</td>
        <td>WRITE_PATTERN regex + BEGIN READ ONLY</td>
        <td>Two independent layers. Regex catches obvious mistakes early. Transaction-level enforcement catches everything else.</td>
      </tr>
      <tr>
        <td>Agent row cap</td>
        <td>20 rows returned to Claude</td>
        <td>Claude needs enough data to understand the result, not all 500 rows. Keeps context tight across multi-iteration loops.</td>
      </tr>
      <tr>
        <td>Full history per Claude call</td>
        <td>Re-send all messages every turn</td>
        <td>Claude is stateless. Simpler than server-side session state and avoids stale context bugs.</td>
      </tr>
      <tr>
        <td>NDJSON streaming for agent</td>
        <td>Newline-delimited JSON per event</td>
        <td>UI updates live per tool call. Users see the agent thinking, not just a final answer. Better than polling or waiting.</td>
      </tr>
      <tr>
        <td>Schema cleared on disconnect</td>
        <td>Reset both state and localStorage</td>
        <td>Schema is only valid for an active connection. Stale schema would cause Claude to hallucinate column names.</td>
      </tr>
      <tr>
        <td>Schema auto-expand on connect</td>
        <td>setExpanded(all IDs) on externalTables arrival</td>
        <td>First-time UX — user connected to see their schema, not hunt for an expand button.</td>
      </tr>
      <tr>
        <td>Token telemetry</td>
        <td>Log after stream.finalMessage()</td>
        <td>finalMessage() resolves after the stream ends with full usage stats including cache_read_input_tokens — the key ROI metric for prompt caching.</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>8 · Interview Talking Points</h2>
    <table>
      <tr><th>Question</th><th>Answer</th></tr>
      <tr><td>Why send full history each Chat SQL turn?</td><td>Claude is stateless — no server-side session. Re-sending is simpler, more reliable, and within the 200K context limit for typical conversations.</td></tr>
      <tr><td>How is the Health Agent "agentic"?</td><td>Claude decides which queries to run, interprets results, and chooses when it has enough data — making judgment calls, not filling a template.</td></tr>
      <tr><td>What prevents the agent from running DELETE?</td><td>WRITE_PATTERN regex on every SQL string before it reaches pg, plus BEGIN READ ONLY transaction wrapping every execution.</td></tr>
      <tr><td>How does prompt caching reduce cost?</td><td>cache_control: ephemeral caches the system prompt for 5 minutes. cache_read_input_tokens are billed at ~10% of normal input token cost.</td></tr>
      <tr><td>What could go wrong in long Chat SQL sessions?</td><td>Context drift — Claude may forget earlier constraints. Fix: show SQL diff between turns so the user can catch regressions early.</td></tr>
    </table>
  </div>
</div>

<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    sequence: { actorMargin: 50, messageMargin: 40 },
    flowchart: { curve: 'basis' },
    themeVariables: {
      primaryColor: '#ede9fe',
      primaryTextColor: '#1a1a2e',
      primaryBorderColor: '#7c3aed',
      lineColor: '#6366f1',
      secondaryColor: '#f5f3ff',
      tertiaryColor: '#faf5ff',
    }
  })
</script>
</body>
</html>`

async function generate() {
  console.log('📄  Launching browser…')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    // Write HTML to a temp file so mermaid CDN scripts can load
    const tmpPath = join(ROOT, 'scripts', '_tmp_docs.html')
    writeFileSync(tmpPath, HTML, 'utf8')

    console.log('🌐  Loading document…')
    await page.goto(`file:///${tmpPath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    })

    // Wait for all mermaid diagrams to render into SVG
    console.log('⏳  Waiting for Mermaid diagrams to render…')
    await page.waitForFunction(
      () => {
        const divs = document.querySelectorAll('.mermaid')
        return divs.length > 0 && Array.from(divs).every((d) => d.querySelector('svg'))
      },
      { timeout: 30000 }
    )

    // Ensure output directory exists
    mkdirSync(join(ROOT, 'docs'), { recursive: true })
    const outPath = join(ROOT, 'docs', 'project-design.pdf')

    console.log('🖨️   Printing to PDF…')
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: 60000,
    })

    // Clean up temp file
    unlinkSync(tmpPath)

    console.log(`✅  PDF saved → docs/project-design.pdf`)
  } finally {
    await browser.close()
  }
}

generate().catch((e) => {
  console.error('❌  Failed:', e.message)
  process.exit(1)
})
