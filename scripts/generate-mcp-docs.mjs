import puppeteer from 'puppeteer'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>SQL AI Assistant — Model Context Design</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;color:#1a1a2e;background:#fff;line-height:1.6}

  /* Cover */
  .cover{height:100vh;display:flex;flex-direction:column;justify-content:center;padding:80px;
    background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);color:#fff;page-break-after:always}
  .cover-tag{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a78bfa;margin-bottom:20px}
  .cover h1{font-size:48px;font-weight:700;line-height:1.1;margin-bottom:12px}
  .cover h1 span{color:#a78bfa}
  .cover-sub{font-size:17px;color:#c4b5fd;margin-bottom:40px}
  .cover-pills{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:48px}
  .pill{padding:5px 14px;border-radius:100px;font-size:11px;font-weight:500;
    border:1px solid rgba(167,139,250,0.4);color:#e9d5ff}
  .cover-meta{font-size:12px;color:#7c3aed;border-top:1px solid rgba(255,255,255,0.1);
    padding-top:20px;display:flex;gap:40px}

  /* Layout */
  .page{padding:52px 60px}
  .section{margin-bottom:44px}
  .page-break{page-break-before:always}
  h2{font-size:21px;font-weight:700;border-bottom:3px solid #7c3aed;padding-bottom:8px;margin-bottom:22px;color:#1a1a2e}
  h3{font-size:14px;font-weight:600;color:#312e81;margin:20px 0 10px}
  h4{font-size:12px;font-weight:600;color:#4c1d95;margin:14px 0 6px}
  p{margin-bottom:10px;color:#374151;font-size:13px}

  /* Table */
  table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px}
  th{background:#312e81;color:#fff;padding:9px 12px;text-align:left;font-size:11px;letter-spacing:.4px}
  td{padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;vertical-align:top}
  tr:nth-child(even) td{background:#f9fafb}

  /* Code */
  code{font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:11px;
    background:#f3f4f6;padding:2px 6px;border-radius:4px;color:#7c3aed}
  pre{background:#1e1b4b;color:#c4b5fd;padding:16px 20px;border-radius:8px;
    font-family:'Cascadia Code','Fira Code',monospace;font-size:11px;
    overflow:hidden;margin-bottom:16px;line-height:1.8;white-space:pre-wrap}
  pre .key{color:#818cf8}
  pre .str{color:#86efac}
  pre .num{color:#fbbf24}
  pre .cmt{color:#6366f1}

  /* Badges */
  .badge{display:inline-block;padding:2px 9px;border-radius:100px;font-size:10px;font-weight:600}
  .b-purple{background:#ede9fe;color:#5b21b6}
  .b-green{background:#dcfce7;color:#166534}
  .b-blue{background:#dbeafe;color:#1e40af}
  .b-orange{background:#ffedd5;color:#9a3412}
  .b-red{background:#fee2e2;color:#991b1b}

  /* Callout */
  .callout{border-left:4px solid #7c3aed;background:#f5f3ff;padding:12px 16px;
    border-radius:0 8px 8px 0;margin-bottom:16px;font-size:12px;color:#4c1d95}
  .callout.green{border-color:#16a34a;background:#f0fdf4;color:#14532d}
  .callout.orange{border-color:#ea580c;background:#fff7ed;color:#7c2d12}

  /* Context box */
  .ctx-box{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px}
  .ctx-header{background:#312e81;color:#e0e7ff;padding:8px 16px;font-size:11px;
    font-weight:600;letter-spacing:.5px;display:flex;justify-content:space-between;align-items:center}
  .ctx-body{padding:16px;background:#fafafa}
  .ctx-row{display:flex;gap:12px;margin-bottom:8px;align-items:flex-start}
  .ctx-label{min-width:90px;font-size:10px;font-weight:700;text-transform:uppercase;
    letter-spacing:.5px;color:#6b7280;padding-top:2px}
  .ctx-value{font-size:12px;color:#374151;font-family:'Cascadia Code',monospace;
    background:#f3f4f6;padding:4px 10px;border-radius:6px;flex:1}
  .ctx-value.cached{background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd}
  .ctx-value.tool{background:#dcfce7;color:#166534}

  /* Flow step */
  .steps{display:flex;flex-direction:column;gap:0}
  .step{display:flex;gap:16px;padding:12px 0;border-bottom:1px dashed #e5e7eb}
  .step:last-child{border-bottom:none}
  .step-num{width:28px;height:28px;border-radius:50%;background:#312e81;color:#fff;
    font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;shrink-flex:0;flex-shrink:0}
  .step-content{flex:1}
  .step-title{font-size:12px;font-weight:600;color:#1a1a2e;margin-bottom:4px}
  .step-desc{font-size:11px;color:#6b7280;line-height:1.5}

  /* Diagram */
  .diagram-wrap{background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;
    padding:24px;margin-bottom:20px;overflow:hidden}
  .diagram-wrap .mermaid{display:flex;justify-content:center}
  .diagram-wrap .mermaid svg{max-width:100%;height:auto}
  .diagram-title{font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;
    letter-spacing:1px;margin-bottom:16px}

  /* Token meter */
  .token-row{display:flex;gap:12px;margin-bottom:12px}
  .token-card{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;background:#fafafa}
  .token-card .label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .token-card .value{font-size:18px;font-weight:700;color:#312e81}
  .token-card .sub{font-size:10px;color:#9ca3af;margin-top:2px}
  .token-card.green .value{color:#16a34a}
  .token-card.orange .value{color:#ea580c}

  /* Grid */
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px}
  .card{border:1px solid #e5e7eb;border-radius:10px;padding:16px;background:#fafafa}
  .card h4{margin-top:0}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-tag">Model Context Design Documentation</div>
  <h1>Model <span>Context</span><br/>Protocol</h1>
  <div class="cover-sub">How context is structured, cached, and streamed to Claude across all three AI features</div>
  <div class="cover-pills">
    <span class="pill">Anthropic Messages API</span>
    <span class="pill">Prompt Caching</span>
    <span class="pill">Tool Use</span>
    <span class="pill">Streaming</span>
    <span class="pill">Multi-turn History</span>
    <span class="pill">NDJSON</span>
    <span class="pill">ReadableStream</span>
  </div>
  <div class="cover-meta">
    <span>Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
    <span>Model: claude-sonnet-4-6</span>
    <span>3 AI features · 5 API routes</span>
  </div>
</div>

<!-- PAGE 1: OVERVIEW -->
<div class="page">
  <div class="section">
    <h2>1 · What is Model Context?</h2>
    <p>
      Every call to Claude requires assembling a <strong>context payload</strong> — the structured set of
      messages, instructions, schema data, and tool definitions that tell Claude what to do and what
      information it has available. This document defines how that context is built, cached, and streamed
      for each feature in the SQL AI Assistant.
    </p>

    <div class="callout">
      The Anthropic Messages API is stateless — Claude remembers nothing between calls. All relevant
      context must be re-sent on every request. Our architecture is designed to minimise redundant
      tokens while maintaining full conversational coherence.
    </div>

    <h3>Three Context Patterns</h3>
    <div class="grid3">
      <div class="card">
        <h4>📝 Single-turn</h4>
        <p style="font-size:11px;color:#6b7280">Used by: NL → SQL</p>
        <p style="font-size:12px">One request → one response. Schema + question assembled into a single user message. Claude replies with SQL + explanation.</p>
      </div>
      <div class="card">
        <h4>💬 Multi-turn</h4>
        <p style="font-size:11px;color:#6b7280">Used by: Chat SQL</p>
        <p style="font-size:12px">Full conversation history re-sent each call. Schema injected once in Turn 1. Claude refines SQL in context of all prior turns.</p>
      </div>
      <div class="card">
        <h4>🤖 Tool Use</h4>
        <p style="font-size:11px;color:#6b7280">Used by: Health Agent</p>
        <p style="font-size:12px">Claude receives tool definitions and calls them autonomously. Tool results are appended as context for the next iteration.</p>
      </div>
    </div>

    <h3>Context Payload Structure (Anthropic Messages API)</h3>
    <table>
      <tr><th>Field</th><th>Type</th><th>Description</th><th>Cached?</th></tr>
      <tr><td><code>model</code></td><td>string</td><td>claude-sonnet-4-6 for all routes</td><td>—</td></tr>
      <tr><td><code>max_tokens</code></td><td>number</td><td>1024–4096 depending on route</td><td>—</td></tr>
      <tr><td><code>system</code></td><td>ContentBlock[]</td><td>Role instruction — SQL expert, chat agent, or health agent</td><td>✅ ephemeral</td></tr>
      <tr><td><code>messages</code></td><td>MessageParam[]</td><td>User + assistant turn history. Schema in first user message.</td><td>—</td></tr>
      <tr><td><code>tools</code></td><td>Tool[]</td><td>run_sql + deliver_report definitions (agent only)</td><td>—</td></tr>
      <tr><td><code>stream</code></td><td>boolean</td><td>true for NL→SQL and Chat SQL, false for agent loop</td><td>—</td></tr>
    </table>
  </div>

  <div class="section">
    <h2>2 · Prompt Caching Strategy</h2>
    <p>
      All three API routes apply <code>cache_control: { type: "ephemeral" }</code> to their system
      prompts. Anthropic caches these for <strong>5 minutes</strong> after first use.
      Cache hits are billed at ~10% of normal input token cost.
    </p>

    <div class="token-row">
      <div class="token-card">
        <div class="label">Normal Input Cost</div>
        <div class="value">$3.00</div>
        <div class="sub">per million tokens (Sonnet)</div>
      </div>
      <div class="token-card green">
        <div class="label">Cache Read Cost</div>
        <div class="value">$0.30</div>
        <div class="sub">per million tokens (10% of normal)</div>
      </div>
      <div class="token-card orange">
        <div class="label">Cache Write Cost</div>
        <div class="value">$3.75</div>
        <div class="sub">per million tokens (first call only)</div>
      </div>
    </div>

    <div class="callout green">
      After the first call within 5 minutes, every subsequent request to the same route gets
      <code>cache_read_input_tokens &gt; 0</code> in the response. This is logged to server stdout
      as part of the <code>claude_call</code> telemetry event.
    </div>

    <h3>What Gets Cached Per Route</h3>
    <table>
      <tr><th>Route</th><th>Cached Content</th><th>Tokens (approx)</th><th>Savings on repeat</th></tr>
      <tr><td><code>/api/nl-to-sql</code></td><td>SYSTEM_PROMPT (SQL expert instruction)</td><td>~60 tokens</td><td>~90%</td></tr>
      <tr><td><code>/api/chat-sql</code></td><td>CHAT_SYSTEM_PROMPT (conversation instruction)</td><td>~80 tokens</td><td>~90%</td></tr>
      <tr><td><code>/api/agent/run</code></td><td>AGENT_SYSTEM_PROMPT (agent instruction)</td><td>~150 tokens</td><td>~90%</td></tr>
    </table>

    <div class="callout orange">
      Schema is NOT cached — it varies per user connection and is injected into the user message,
      not the system prompt. Caching the system prompt alone still saves significant cost on the
      most repetitive part of each call.
    </div>
  </div>
</div>

<!-- PAGE 2: NL TO SQL CONTEXT -->
<div class="page page-break">
  <div class="section">
    <h2>3 · NL → SQL Context Design</h2>

    <h3>Context Assembly Flow</h3>
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-content">
          <div class="step-title">User submits question + current schema</div>
          <div class="step-desc">Frontend sends <code>{ schema: Table[], question: string }</code> to <code>/api/nl-to-sql</code></div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-content">
          <div class="step-title">buildNLtoSQLPrompt(schema, question)</div>
          <div class="step-desc">Assembles schema block (table names + column types) and wraps the question. Instructs Claude to respond with a SQL block + clause-by-clause explanation.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-content">
          <div class="step-title">messages.stream() called with full context</div>
          <div class="step-desc">System prompt cached. One user message containing schema + question. No prior history.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-content">
          <div class="step-title">Text deltas streamed to browser via ReadableStream</div>
          <div class="step-desc">Each <code>content_block_delta</code> chunk is encoded and enqueued. Browser appends to <code>streamBuffer</code>.</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">5</div>
        <div class="step-content">
          <div class="step-title">parseSQLBlock extracts SQL + explanation</div>
          <div class="step-desc">Regex matches <code>&#96;&#96;&#96;sql ... &#96;&#96;&#96;</code> fenced block. Remainder becomes explanation text.</div>
        </div>
      </div>
    </div>

    <h3>Context Payload</h3>
    <div class="ctx-box">
      <div class="ctx-header">
        <span>POST /api/nl-to-sql — messages.stream() payload</span>
        <span>max_tokens: 1024</span>
      </div>
      <div class="ctx-body">
        <div class="ctx-row">
          <div class="ctx-label">system</div>
          <div class="ctx-value cached">
            "You are a SQL expert assistant. Write correct, readable PostgreSQL…"
            <span style="float:right"><span class="badge b-purple">cached ♻</span></span>
          </div>
        </div>
        <div class="ctx-row">
          <div class="ctx-label">role: user</div>
          <div class="ctx-value">
            Given the schema below, write a correct PostgreSQL query…<br/>
            <br/>
            SCHEMA:<br/>
            Table: orders<br/>
            Columns: id UUID NOT NULL, user_id UUID NOT NULL, amount NUMERIC, created_at TIMESTAMP<br/>
            <br/>
            Table: users<br/>
            Columns: id UUID NOT NULL, email TEXT NOT NULL, name TEXT<br/>
            <br/>
            QUESTION: Show all orders from the last 30 days grouped by status
          </div>
        </div>
      </div>
    </div>

    <h3>Response Format Claude Must Follow</h3>
    <pre><span class="cmt">// Claude always responds in this structure:</span>
&#96;&#96;&#96;sql
SELECT status, COUNT(*) AS order_count, SUM(amount) AS total
FROM orders
WHERE created_at &gt;= NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY total DESC
&#96;&#96;&#96;

<span class="key">**Explanation:**</span>
- <span class="str">SELECT</span>: Retrieves status, count of orders, and total revenue per group
- <span class="str">WHERE</span>: Filters to orders created within the last 30 days
- <span class="str">GROUP BY</span>: Aggregates rows by order status
- <span class="str">ORDER BY</span>: Sorts by highest revenue first</pre>
  </div>
</div>

<!-- PAGE 3: CHAT SQL CONTEXT -->
<div class="page page-break">
  <div class="section">
    <h2>4 · Chat SQL Context Design</h2>

    <div class="callout">
      <strong>Key principle:</strong> Schema is injected ONCE in the first user message.
      All subsequent turns send plain refinement text. Claude retains the schema in its
      context window because the full message history is re-sent every call.
    </div>

    <h3>Message History Growth Per Turn</h3>
    <div class="diagram-wrap">
      <div class="diagram-title">Messages array sent to Claude — grows by 2 per turn</div>
      <div class="mermaid">
flowchart LR
    subgraph T1["Turn 1 — messages sent"]
        U1["user:\nSCHEMA: orders, users…\nQUESTION: Show orders\nfrom last 30 days"]
    end

    subgraph T2["Turn 2 — messages sent"]
        U1B["user:\nSCHEMA + question"]
        A1["assistant:\n\`\`\`sql SELECT…\`\`\`\nExplanation…"]
        U2["user:\nGroup by status\nand sum revenue"]
    end

    subgraph T3["Turn 3 — messages sent"]
        U1C["user:\nSCHEMA + question"]
        A1B["assistant:\nSQL v1"]
        U2B["user:\nGroup by status"]
        A2["assistant:\nSQL v2"]
        U3["user:\nOnly show completed\norders over $100"]
    end

    T1 -->|"+2 messages"| T2
    T2 -->|"+2 messages"| T3
      </div>
    </div>

    <h3>Turn 1 vs Turn N Context</h3>
    <div class="grid2">
      <div class="ctx-box">
        <div class="ctx-header"><span>Turn 1 — First message</span><span>schema injected here</span></div>
        <div class="ctx-body">
          <div class="ctx-row">
            <div class="ctx-label">system</div>
            <div class="ctx-value cached">CHAT_SYSTEM_PROMPT <span class="badge b-purple">cached ♻</span></div>
          </div>
          <div class="ctx-row">
            <div class="ctx-label">role: user</div>
            <div class="ctx-value">SCHEMA:<br/>Table: orders…<br/>Table: users…<br/><br/>QUESTION: Show all orders from last 30 days</div>
          </div>
        </div>
      </div>
      <div class="ctx-box">
        <div class="ctx-header"><span>Turn 2+ — Refinement</span><span>plain text only</span></div>
        <div class="ctx-body">
          <div class="ctx-row">
            <div class="ctx-label">system</div>
            <div class="ctx-value cached">CHAT_SYSTEM_PROMPT <span class="badge b-purple">cached ♻</span></div>
          </div>
          <div class="ctx-row">
            <div class="ctx-label">role: user</div>
            <div class="ctx-value">SCHEMA + original question</div>
          </div>
          <div class="ctx-row">
            <div class="ctx-label">role: assistant</div>
            <div class="ctx-value">Previous SQL + explanation</div>
          </div>
          <div class="ctx-row">
            <div class="ctx-label">role: user</div>
            <div class="ctx-value">Group by status and sum revenue</div>
          </div>
        </div>
      </div>
    </div>

    <h3>Context Window Budget (10 turns max)</h3>
    <table>
      <tr><th>Turn</th><th>New tokens added</th><th>Cumulative total (approx)</th><th>% of 200K limit</th></tr>
      <tr><td>Turn 1</td><td>Schema (~400) + question (~20) = ~420</td><td>~420</td><td>0.2%</td></tr>
      <tr><td>Turn 2</td><td>SQL response (~300) + refinement (~15) = ~315</td><td>~735</td><td>0.4%</td></tr>
      <tr><td>Turn 5</td><td>~315 per turn</td><td>~1,680</td><td>0.8%</td></tr>
      <tr><td>Turn 10 (max)</td><td>~315 per turn</td><td>~3,570</td><td>1.8%</td></tr>
    </table>
    <p style="font-size:11px;color:#6b7280">
      10-turn cap is a UX guardrail, not a token limit. Even at turn 10 we use less than 2% of Claude's context window.
    </p>
  </div>
</div>

<!-- PAGE 4: AGENT CONTEXT -->
<div class="page page-break">
  <div class="section">
    <h2>5 · Health Agent Context Design</h2>

    <div class="callout">
      The agent uses <strong>tool use</strong> — Claude receives tool definitions alongside the
      schema and autonomously decides which tools to call. Tool results are appended to the message
      history and re-sent in the next iteration. This is the most complex context pattern.
    </div>

    <h3>Tool Definitions Sent to Claude</h3>
    <div class="grid2">
      <div class="ctx-box">
        <div class="ctx-header"><span>Tool: run_sql</span><span class="badge b-green">READ ONLY</span></div>
        <div class="ctx-body">
          <pre style="margin:0;font-size:10px">{
  <span class="key">"name"</span>: <span class="str">"run_sql"</span>,
  <span class="key">"description"</span>: <span class="str">"Execute a read-only SELECT query
on the database to gather data."</span>,
  <span class="key">"input_schema"</span>: {
    <span class="key">"type"</span>: <span class="str">"object"</span>,
    <span class="key">"properties"</span>: {
      <span class="key">"sql"</span>: { <span class="key">"type"</span>: <span class="str">"string"</span> },
      <span class="key">"description"</span>: { <span class="key">"type"</span>: <span class="str">"string"</span> }
    },
    <span class="key">"required"</span>: [<span class="str">"sql"</span>, <span class="str">"description"</span>]
  }
}</pre>
        </div>
      </div>
      <div class="ctx-box">
        <div class="ctx-header"><span>Tool: deliver_report</span><span class="badge b-purple">TERMINATES LOOP</span></div>
        <div class="ctx-body">
          <pre style="margin:0;font-size:10px">{
  <span class="key">"name"</span>: <span class="str">"deliver_report"</span>,
  <span class="key">"description"</span>: <span class="str">"Submit the final business
health report. Call exactly once."</span>,
  <span class="key">"input_schema"</span>: {
    <span class="key">"type"</span>: <span class="str">"object"</span>,
    <span class="key">"properties"</span>: {
      <span class="key">"report"</span>: { <span class="key">"type"</span>: <span class="str">"string"</span> }
    },
    <span class="key">"required"</span>: [<span class="str">"report"</span>]
  }
}</pre>
        </div>
      </div>
    </div>

    <h3>Agent Iteration — Context per Loop</h3>
    <div class="diagram-wrap">
      <div class="diagram-title">Message history grows each iteration — tool results appended</div>
      <div class="mermaid">
flowchart TD
    I1["Iteration 1\n─────────────\nuser: SCHEMA + analyse health\n↓\nClaude → tool_use: run_sql\n{ sql: SELECT COUNT(*) FROM orders... }"]

    I2["Iteration 2\n─────────────\nuser: SCHEMA + analyse\nassistant: tool_use run_sql\nuser: tool_result { rows:[{count:142}] }\n↓\nClaude → tool_use: run_sql\n{ sql: SELECT SUM(amount)... }"]

    I3["Iteration 3+\n─────────────\nFull prior history re-sent\n+ new tool_result appended\n↓\nClaude → tool_use: deliver_report\n{ report: markdown... }"]

    END["Loop exits\nNDJSON: report event sent to UI"]

    I1 -->|"append tool_result"| I2
    I2 -->|"append tool_result"| I3
    I3 --> END
      </div>
    </div>

    <h3>Full Context Payload — Iteration 2 Example</h3>
    <div class="ctx-box">
      <div class="ctx-header">
        <span>messages.create() — Iteration 2</span>
        <span>stop_reason: tool_use expected</span>
      </div>
      <div class="ctx-body">
        <div class="ctx-row">
          <div class="ctx-label">system</div>
          <div class="ctx-value cached">AGENT_SYSTEM_PROMPT (business health agent instruction) <span class="badge b-purple">cached ♻</span></div>
        </div>
        <div class="ctx-row">
          <div class="ctx-label">tools</div>
          <div class="ctx-value tool">[ run_sql, deliver_report ]</div>
        </div>
        <div class="ctx-row">
          <div class="ctx-label">msg[0] user</div>
          <div class="ctx-value">SCHEMA: Table: orders… Table: users…<br/>Current date/time (UTC): 2026-04-17T…<br/>Analyse the business health of this database.</div>
        </div>
        <div class="ctx-row">
          <div class="ctx-label">msg[1] assistant</div>
          <div class="ctx-value">[ { type: "tool_use", id: "tu_01…", name: "run_sql", input: { sql: "SELECT COUNT(*)…", description: "Total orders today" } } ]</div>
        </div>
        <div class="ctx-row">
          <div class="ctx-label">msg[2] user</div>
          <div class="ctx-value tool">[ { type: "tool_result", tool_use_id: "tu_01…", content: "{\"rows\":[{\"count\":\"23\"}],\"rowCount\":1}" } ]</div>
        </div>
      </div>
    </div>

    <h3>Safety Layer on Tool Execution</h3>
    <table>
      <tr><th>Check</th><th>Where</th><th>Blocks</th></tr>
      <tr><td>WRITE_PATTERN regex</td><td>Before pg query</td><td>INSERT UPDATE DELETE DROP CREATE ALTER TRUNCATE GRANT REVOKE</td></tr>
      <tr><td>BEGIN READ ONLY</td><td>PostgreSQL transaction</td><td>Any write that bypasses regex (e.g. stored procedure calls)</td></tr>
      <tr><td>Row cap (20 rows)</td><td>After pg query</td><td>Large result sets flooding Claude's context with redundant data</td></tr>
      <tr><td>Iteration cap (12)</td><td>Loop counter</td><td>Runaway agent burning tokens without delivering a report</td></tr>
    </table>
  </div>
</div>

<!-- PAGE 5: STREAMING -->
<div class="page page-break">
  <div class="section">
    <h2>6 · Streaming Design</h2>

    <h3>NL → SQL and Chat SQL — Text Delta Streaming</h3>
    <div class="callout">
      Both routes use <code>client.messages.stream()</code> which returns an AsyncIterator of
      SSE events. Text deltas are extracted and forwarded to the browser via a
      <code>ReadableStream</code> with <code>Content-Type: text/plain</code>.
    </div>

    <div class="diagram-wrap">
      <div class="diagram-title">Text streaming pipeline — NL→SQL and Chat SQL</div>
      <div class="mermaid">
sequenceDiagram
    participant FE as Browser
    participant Route as API Route
    participant SDK as Anthropic SDK
    participant Claude as Claude API

    FE->>Route: POST { schema, question }
    Route->>SDK: client.messages.stream(payload)
    SDK->>Claude: HTTP SSE connection

    loop for each token
        Claude-->>SDK: data: content_block_delta
        SDK-->>Route: chunk.delta.text
        Route-->>FE: TextEncoder.encode(text)
        FE->>FE: streamBuffer += chunk
    end

    Claude-->>SDK: data: message_stop
    SDK->>SDK: finalMessage() → usage stats
    Route->>Route: log token + cache metrics
    Route-->>FE: ReadableStream.close()
    FE->>FE: parseSQLBlock(streamBuffer)
      </div>
    </div>

    <h3>Health Agent — NDJSON Event Streaming</h3>
    <div class="callout">
      The agent uses <code>client.messages.create()</code> (not stream) for each iteration —
      it needs the full response to extract tool calls. The route streams
      <strong>structured JSON events</strong> to the browser as each step completes.
    </div>

    <div class="diagram-wrap">
      <div class="diagram-title">NDJSON event streaming — Health Agent</div>
      <div class="mermaid">
sequenceDiagram
    participant FE as Browser
    participant Route as API Route
    participant Claude as Claude API
    participant PG as PostgreSQL

    FE->>Route: POST { url, schema }
    Route-->>FE: {"type":"status","text":"Connected…"}

    loop agent iterations
        Route->>Claude: messages.create() — full history
        Claude-->>Route: { stop_reason: "tool_use", content: [...] }
        Route-->>FE: {"type":"tool_call","sql":"SELECT…","description":"…"}
        Route->>PG: BEGIN READ ONLY → Execute → ROLLBACK
        PG-->>Route: rows
        Route-->>FE: {"type":"tool_result","rows":[…],"rowCount":1}
        Route->>Route: append tool_result to messages
    end

    Route-->>FE: {"type":"report","text":"## Business Health…"}
    Route-->>FE: {"type":"done","queryCount":5,"duration":4210}
    Route->>Route: ReadableStream.close()
      </div>
    </div>

    <h3>NDJSON Event Schema</h3>
    <table>
      <tr><th>Event type</th><th>When emitted</th><th>Payload fields</th><th>UI action</th></tr>
      <tr><td><span class="badge b-blue">status</span></td><td>On DB connect</td><td><code>text: string</code></td><td>Add to activity feed</td></tr>
      <tr><td><span class="badge b-orange">tool_call</span></td><td>Before SQL executes</td><td><code>description, sql</code></td><td>Show SQL block in feed</td></tr>
      <tr><td><span class="badge b-green">tool_result</span></td><td>After SQL executes</td><td><code>rows, rowCount, error?</code></td><td>Show row count + preview</td></tr>
      <tr><td><span class="badge b-purple">report</span></td><td>deliver_report called</td><td><code>text: string</code></td><td>Render ReportBlock</td></tr>
      <tr><td><span class="badge b-green">done</span></td><td>Loop exits</td><td><code>queryCount, duration</code></td><td>Show stats bar</td></tr>
      <tr><td><span class="badge b-red">error</span></td><td>Any failure</td><td><code>message: string</code></td><td>Show error in feed</td></tr>
    </table>
  </div>
</div>

<!-- PAGE 6: FULL FLOW DIAGRAM -->
<div class="page page-break">
  <div class="section">
    <h2>7 · Complete Model Context Flow</h2>
    <div class="callout">
      End-to-end view of how context is assembled, sent to Claude, and handled for all three features simultaneously.
    </div>
    <div class="diagram-wrap">
      <div class="mermaid">
flowchart TD
    User(["👤 User"])

    subgraph CONTEXT_BUILD["Context Assembly Layer"]
        direction LR
        NLP["buildNLtoSQLPrompt\nschema + question\n→ single user message"]
        CHATP["buildChatFirstMessage\nschema injected Turn 1 only\nplain text Turn 2+"]
        AGTP["buildAgentFirstMessage\nschema + datetime\n→ tools: run_sql + deliver_report"]
    end

    subgraph CACHE["Cached System Prompts"]
        direction LR
        SP1["SYSTEM_PROMPT\ncache_control: ephemeral\n~60 tokens"]
        SP2["CHAT_SYSTEM_PROMPT\ncache_control: ephemeral\n~80 tokens"]
        SP3["AGENT_SYSTEM_PROMPT\ncache_control: ephemeral\n~150 tokens"]
    end

    subgraph CLAUDE["Claude API — claude-sonnet-4-6"]
        direction LR
        CS["messages.stream()\ntext deltas"]
        CC["messages.stream()\ntext deltas + history"]
        CA["messages.create()\ntool_use loop"]
    end

    subgraph RESPONSE["Response Handling"]
        direction LR
        RS["ReadableStream\ntext/plain\ntext deltas"]
        RC["ReadableStream\ntext/plain\ntext deltas"]
        RA["ReadableStream\napplication/x-ndjson\nstructured events"]
    end

    User -->|"question + schema"| NLP
    User -->|"question + schema\n+ turn history"| CHATP
    User -->|"schema"| AGTP

    NLP -->|"user message"| CS
    CHATP -->|"messages[]"| CC
    AGTP -->|"messages[] + tools"| CA

    SP1 -.->|"cached system"| CS
    SP2 -.->|"cached system"| CC
    SP3 -.->|"cached system"| CA

    CS --> RS
    CC --> RC
    CA --> RA

    RS -->|"streamBuffer\nparseSQLBlock"| UI1["NLToSQL\nSQL + explanation"]
    RC -->|"streamBuffer\nparseSQLBlock\nConversationTurn"| UI2["Chat SQL\nTurn cards"]
    RA -->|"NDJSON events\nActivityFeed\nReportBlock"| UI3["Health Agent\nLive feed + report"]
      </div>
    </div>

    <h3>Design Principles</h3>
    <table>
      <tr><th>Principle</th><th>Implementation</th><th>Benefit</th></tr>
      <tr><td>Cache what's static</td><td>System prompts marked <code>cache_control: ephemeral</code></td><td>~90% token cost reduction on repeated calls</td></tr>
      <tr><td>Inject schema once</td><td>Chat SQL injects schema in Turn 1 user message only</td><td>No redundant schema tokens on turns 2–10</td></tr>
      <tr><td>Stream everything</td><td>ReadableStream for text, NDJSON for agent events</td><td>Perceived latency &lt; 200ms, live feedback</td></tr>
      <tr><td>Cap rows returned to Claude</td><td>20 rows max per agent tool result</td><td>Tight context, no wasted tokens on large tables</td></tr>
      <tr><td>Log usage always</td><td><code>finalMessage().usage</code> after every stream</td><td>Track cache hit rate + cost per request</td></tr>
      <tr><td>Stateless API design</td><td>Full message history re-sent every call</td><td>No server-side session state, horizontally scalable</td></tr>
    </table>
  </div>
</div>

<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    sequence: { actorMargin: 40, messageMargin: 35 },
    flowchart: { curve: 'basis' },
    themeVariables: {
      primaryColor: '#ede9fe',
      primaryTextColor: '#1a1a2e',
      primaryBorderColor: '#7c3aed',
      lineColor: '#6366f1',
      secondaryColor: '#f5f3ff',
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

    const tmpPath = join(ROOT, 'scripts', '_tmp_mcp.html')
    writeFileSync(tmpPath, HTML, 'utf8')

    console.log('🌐  Loading document…')
    await page.goto(`file:///${tmpPath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    })

    console.log('⏳  Waiting for Mermaid diagrams…')
    await page.waitForFunction(
      () => {
        const divs = document.querySelectorAll('.mermaid')
        return divs.length > 0 && Array.from(divs).every(d => d.querySelector('svg'))
      },
      { timeout: 30000 }
    )

    mkdirSync(join(ROOT, 'docs'), { recursive: true })
    const outPath = join(ROOT, 'docs', 'model-context-design.pdf')

    console.log('🖨️   Printing to PDF…')
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: 60000,
    })

    unlinkSync(tmpPath)
    console.log('✅  PDF saved → docs/model-context-design.pdf')
  } finally {
    await browser.close()
  }
}

generate().catch(e => {
  console.error('❌  Failed:', e.message)
  process.exit(1)
})
