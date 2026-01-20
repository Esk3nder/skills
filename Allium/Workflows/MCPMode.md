# MCP Mode Workflow

> **Trigger:** MCP tools available (`mcp__allium__*`)
> **Input:** Natural language query request
> **Output:** Executed query with live data results

## Prerequisites

MCP tools must be available:
- `mcp__allium__explorer_search_schemas`
- `mcp__allium__explorer_fetch_schema`
- `mcp__allium__explorer_run_sql`
- `mcp__allium__explorer_run_query`

## Workflow Architecture

```
User Request
     ↓
[ORCHESTRATOR] ─────────────────────────────────────────────────
     │
     ├──► Step 1: QueryArchitect (Understand Intent)
     │         Ask clarifying questions if needed
     │
     ├──► Step 2: SchemaExpert (Live Schema Discovery)
     │         → mcp__allium__explorer_search_schemas
     │         → mcp__allium__explorer_fetch_schema
     │         Returns: exact tables, columns, types
     │
     ├──► Step 3: SQLFormatter (Draft Query)
     │         Use live schema to write accurate SQL
     │
     ├──► Step 4: Validator (Check Query)
     │         Validate against fetched schema
     │
     ├──► Step 5: Executor (Run Query)
     │         → mcp__allium__explorer_run_sql
     │         Returns: actual data + metadata
     │
     └──► Step 6: Presenter (Format Results)
               Show data with visualization spec
```

## Step 1: QueryArchitect (Understand Intent)

Ask clarifying questions:
- What metrics/data do you need?
- What time range?
- What granularity (daily, weekly, by chain)?
- Any specific filters (chains, tokens, addresses)?
- What will you do with this data? (affects output format)

## Step 2: SchemaExpert (Live Schema Discovery)

### Search for Tables

Use semantic search to find relevant tables:

```
mcp__allium__explorer_search_schemas({
  "query": "stablecoin transfers by chain"
})
```

Returns table identifiers matching the query.

### Fetch Schema Details

For each relevant table, get exact columns:

```
mcp__allium__explorer_fetch_schema({
  "table_id": "crosschain.stablecoin.transfers"
})
```

Returns YAML metadata with:
- Column names
- Column types
- Descriptions
- Primary keys

### Schema Expert Output Format

```
## Schema Discovery Results

**Query:** "stablecoin transfers by chain"

### Matching Tables
1. `crosschain.stablecoin.transfers` - Primary match
2. `crosschain.metrics.stablecoin_volume` - Aggregated metrics

### Selected Table: crosschain.stablecoin.transfers

| Column | Type | Description |
|--------|------|-------------|
| chain | STRING | Blockchain network |
| base_asset | STRING | Stablecoin type (usdc, usdt, etc.) |
| from_address | STRING | Sender address |
| to_address | STRING | Recipient address |
| amount | FLOAT | Transfer amount |
| usd_amount | FLOAT | USD value |
| block_timestamp | TIMESTAMP | Transfer time |

### Recommended Filters
- `base_asset IN ('usdc', 'usdt', 'dai')` - USD stablecoins
- `block_timestamp >= current_timestamp - interval '90 days'` - Time range
```

## Step 3: SQLFormatter (Draft Query)

Using the live schema, draft the query:

### SQL Formatting Rules
- Keywords uppercase
- Use explicit GROUP BY (not ALL)
- JSON fields use `:` not `.`
- Always include time filter
- Use QUALIFY for window functions
- Use HAVING for aggregate filters

### Example Query

```sql
SELECT
  date_trunc('day', block_timestamp) AS date,
  chain,
  COUNT(DISTINCT from_address) AS dau
FROM crosschain.stablecoin.transfers
WHERE 1 = 1
  AND base_asset IN ('usdc', 'usdt', 'dai')
  AND block_timestamp >= current_timestamp - interval '90 days'
GROUP BY 1, 2
ORDER BY date DESC, chain;
```

## Step 4: Validator (Check Query)

Validate against the fetched schema:

- [ ] All column names exist in schema
- [ ] Column types match usage (no string math, etc.)
- [ ] Time filter present
- [ ] GROUP BY matches SELECT
- [ ] No common pitfalls (JSON syntax, QUALIFY, etc.)

## Step 5: Executor (Run Query)

Execute the query using MCP:

```
mcp__allium__explorer_run_sql({
  "sql": "SELECT ... FROM crosschain.stablecoin.transfers ..."
})
```

### Response Format

```json
{
  "sql": "SELECT ...",
  "data": [
    {"date": "2024-01-15", "chain": "ethereum", "dau": 45000},
    {"date": "2024-01-15", "chain": "arbitrum", "dau": 32000},
    ...
  ],
  "meta": {
    "columns": ["date", "chain", "dau"],
    "types": ["DATE", "STRING", "INTEGER"]
  },
  "queried_at": "2024-01-16T10:30:00Z"
}
```

### Row Limit

Queries return up to **250,000 rows**. For larger datasets:
- Add more restrictive filters
- Use aggregations to reduce rows
- Consider time-based pagination

## Step 6: Presenter (Format Results)

Present results with full context:

```
## [Title]

**Definition:** [What this metric measures]

**KPI:** [Specific metric being calculated]

**Output:** Chart + Table

**Tags:** `domain` `metric` `time-grain` `chain` `analysis-type`

### Table Schema
| Column | Type | Description |
|--------|------|-------------|

### Visualization Spec
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

[SQL CODE BLOCK]

---

### Query Results

**Rows returned:** [count]
**Executed at:** [timestamp]

| date | chain | dau |
|------|-------|-----|
| 2024-01-15 | ethereum | 45,000 |
| 2024-01-15 | arbitrum | 32,000 |
| ... | ... | ... |

[First 20 rows shown, full data available]
```

## Error Handling

### Schema Search Returns No Results

```
No tables found for "[query]". Try:
1. Broader search terms
2. Check supported schemas: crosschain.*, common.*, <chain>.*
3. Fall back to Legacy Mode with static docs
```

### Query Execution Fails

```
Query failed: [error message]

Possible fixes:
1. Check column names against schema
2. Verify time filter syntax
3. Check for GROUP BY / aggregate mismatches

Attempting auto-fix...
```

### Row Limit Exceeded

```
Query returned 250,000+ rows (limit reached).

Suggestions:
1. Add more filters to reduce scope
2. Increase time granularity (day → week → month)
3. Add HAVING clause to filter small values
```

## Subagent Invocation (Optional)

For complex queries, use subagents:

### SchemaExpert Subagent
```
Task(
  description: "Find Allium tables via MCP",
  subagent_type: "Explore",
  model: "sonnet",
  prompt: """
    Use mcp__allium__explorer_search_schemas to find tables for:
    ${requirements}

    Then use mcp__allium__explorer_fetch_schema for each match.

    Return: table names, columns, types, recommended filters.

    End your response with:
    🗣️ Explore: [Brief summary of tables and columns found]
  """
)
```

### Executor Subagent
```
Task(
  description: "Execute Allium SQL via MCP",
  subagent_type: "Engineer",
  model: "sonnet",
  prompt: """
    Execute this query using mcp__allium__explorer_run_sql:
    ${sql}

    Return: row count, sample data (first 20 rows), any errors.

    End your response with:
    🗣️ Engineer: [Brief summary - row count and status]
  """
)
```

## Saved Queries

For frequently used queries, use `explorer_run_query`:

```
mcp__allium__explorer_run_query({
  "query_id": "stablecoin_dau_by_chain",
  "params": {
    "start_date": "2024-01-01",
    "chains": ["ethereum", "arbitrum", "base"]
  }
})
```

Build a library of saved query IDs in `SavedQueries.md`.

## Completion Criteria

Query is complete when:
- User confirms results capture their needs
- Data has been returned and displayed
- Visualization spec provided for charting
- No execution errors

Ask: "Does this data capture what you need, or should we adjust the query?"
