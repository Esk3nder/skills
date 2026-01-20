# CoDesign Workflow (Router)

> **Trigger:** Interactive query building with Allium
> **Input:** Natural language description or KPI specification
> **Output:** Routes to MCP Mode or Legacy Mode based on tool availability

## Mode Detection

At workflow start, detect which mode to use:

```
┌─────────────────────────────────────────────────────────────┐
│                    MODE DETECTION                            │
│                                                              │
│  Check: Are mcp__allium__* tools available?                 │
│                                                              │
│  Tools to check:                                            │
│  • mcp__allium__explorer_search_schemas                     │
│  • mcp__allium__explorer_fetch_schema                       │
│  • mcp__allium__explorer_run_sql                            │
│  • mcp__allium__explorer_run_query                          │
└─────────────────────────────────────────────────────────────┘
          │                              │
     Available                      Not Available
          ▼                              ▼
   ┌─────────────┐                ┌─────────────┐
   │  MCP MODE   │                │ LEGACY MODE │
   │  MCPMode.md │                │LegacyMode.md│
   └─────────────┘                └─────────────┘
```

## Step 1: Announce Mode

**If MCP tools available:**
```
Running **Allium** in **MCP Mode** - live schema search and query execution enabled...
```

Send voice notification:
```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Allium in MCP mode with live query execution"}' \
  > /dev/null 2>&1 &
```

**If MCP tools NOT available:**
```
Running **Allium** in **Legacy Mode** - generating SQL for manual execution...
```

Send voice notification:
```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Allium in Legacy mode, MCP not configured"}' \
  > /dev/null 2>&1 &
```

## Step 2: Route to Workflow

### MCP Mode → `MCPMode.md`

Full capabilities:
- **Live schema search** via `explorer_search_schemas`
- **Exact column metadata** via `explorer_fetch_schema`
- **Query execution** via `explorer_run_sql`
- **Returns actual data** (up to 250k rows)

### Legacy Mode → `LegacyMode.md`

Limited capabilities:
- **Static schema docs** from SKILL.md
- **SQL generation only** (no execution)
- **User copies SQL** to Allium Explorer manually

## MCP Configuration

To enable MCP Mode, ensure:

1. **API Key in `.env`:**
   ```
   ALLIUM_API_KEY="your-key-here"
   ```

2. **MCP config in `~/.claude/.mcp.json`:**
   ```json
   {
     "mcpServers": {
       "allium": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "https://mcp.allium.so",
           "--header",
           "X-API-KEY:${ALLIUM_API_KEY}"
         ],
         "env": {
           "ALLIUM_API_KEY": "your-key-here"
         }
       }
     }
   }
   ```

3. **Restart Claude Code** to load MCP server

## Shared Components

Both modes use:

### Query Output Format

```
## [Title]

**Definition:** [What this metric measures]

**KPI:** [Specific metric being calculated]

**Output:** [Table / Chart / Both]

**Tags:** `domain` `metric` `time-grain` `chain` `analysis-type`

### Table Schema
| Column | Type | Description |
|--------|------|-------------|

### Visualization Spec (if chart)
| Property | Value |
|----------|-------|
| **Chart Type** | Line / Bar / Stacked Bar / 100% Bar / Area / 100% Area / Pie / Tree Map |
| **X-Axis** | [column] |
| **X-Axis Title** | [human-readable label] |
| **Time Bucket** | Minute / Hour / Day / Week / Month / Year |
| **Y-Axis** | [column] |
| **Y-Axis Title** | [human-readable label] |
| **Aggregation** | Sum / Mean / Median / Min / Max / First / Last |
| **Series (Group By)** | [column] |
| **Series Title** | [human-readable label] |
| **Sort By** | X-Axis / Y-Axis |
| **Sort Descending** | Yes / No |
| **Log Scale** | Yes / No |
| **Visual Title** | [chart title] |
| **Visual Subtitle** | [optional context] |

---

[SQL CODE BLOCK - ONE QUERY ONLY]
```

### Formatting Rules

1. **ONE query per code block** - NEVER combine
2. **NO text inside code blocks** - Not valid SQL
3. **Separate sections** for multiple queries
4. **Visual Title** only if different from query title
5. **Visual Subtitle** only if adds context

### SQL Best Practices

- Keywords uppercase
- Explicit GROUP BY (not ALL)
- JSON fields use `:` not `.`
- Always include time filter
- Use QUALIFY for window functions
- Use HAVING for aggregate filters

## Workflow Comparison

| Feature | MCP Mode | Legacy Mode |
|---------|----------|-------------|
| Schema search | Live API | Static docs |
| Column validation | Exact from API | Best effort |
| Query execution | Yes (250k rows) | No (manual) |
| Data return | Actual results | SQL text only |
| Speed | Slower (API calls) | Faster |
| Accuracy | Higher | Lower |

## Error Handling

### MCP Connection Fails

If MCP tools exist but fail:
```
MCP connection failed. Falling back to Legacy Mode...

Error: [error message]

Continuing with static schema documentation.
```

Then route to `LegacyMode.md`.

### API Key Invalid

```
Allium API key invalid or expired.

To fix:
1. Generate new key at https://app.allium.so/settings/api-keys
2. Update ~/.claude/.env
3. Restart Claude Code
```

## Quick Reference

| Scenario | Mode | Workflow |
|----------|------|----------|
| MCP configured, tools available | MCP | `MCPMode.md` |
| MCP not configured | Legacy | `LegacyMode.md` |
| MCP configured but fails | Legacy (fallback) | `LegacyMode.md` |

## Related Workflows

- `MCPMode.md` - Full MCP workflow with live execution
- `LegacyMode.md` - SQL generation without execution
- `SchemaExplorer.md` - Explore available tables
- `QueryBuilder.md` - Quick query generation
