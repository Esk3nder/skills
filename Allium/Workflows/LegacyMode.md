# Legacy Mode Workflow

> **Trigger:** MCP tools NOT available (no `mcp__allium__*` tools)
> **Input:** Natural language description or partial query
> **Output:** Production-ready SQL for manual execution (user copies to Allium Explorer)

**Note:** This workflow uses static schema documentation. For live schema search and query execution, configure the Allium MCP server and use MCPMode.md.

## Hooks & Events Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ UserPromptSubmit Event                                          │
│   → skill-entry.ts routes to Allium skill                       │
│   → CoDesign workflow triggered                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR (main conversation)                                │
│   Manages state, coordinates handoffs, presents to user         │
└─────────────────────────────────────────────────────────────────┘
          ↓                    ↓                    ↓
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │ Task 1  │    →     │ Task 2  │    →     │ Task 3  │
    │ Schema  │ handoff  │   SQL   │ handoff  │Validate │
    │ Expert  │          │Formatter│          │         │
    └─────────┘          └─────────┘          └─────────┘
          ↓                    ↓                    ↓
    ┌─────────┐          ┌─────────┐          ┌─────────┐
    │SubAgent │          │SubAgent │          │SubAgent │
    │ Stop    │          │ Stop    │          │ Stop    │
    │ Event   │          │ Event   │          │ Event   │
    └─────────┘          └─────────┘          └─────────┘
          ↓                    ↓                    ↓
    AgentOutputCapture.hook.ts persists each output to MEMORY/
```

### Event Lifecycle

1. **UserPromptSubmit** → `skill-entry.ts` detects "allium" trigger → loads Allium skill
2. **Task tool call** → spawns subagent with isolated context
3. **SubagentStop** → `AgentOutputCapture.hook.ts` saves output to `MEMORY/RESEARCH/`
4. **Orchestrator** → reads subagent output, passes to next stage
5. **Stop** → final query presented to user

## Subagent Architecture

```
User Request
     ↓
[ORCHESTRATOR] ─────────────────────────────────────────────────
     │
     ├──► Task(SchemaExpert, model: sonnet)
     │         ↓ SubagentStop event
     │         ↓ Output: tables, columns, joins
     │
     ├──► Task(SQLFormatter, model: sonnet)  ← receives schema output
     │         ↓ SubagentStop event
     │         ↓ Output: formatted SQL query
     │
     └──► Task(Validator, model: sonnet)     ← receives SQL output
               ↓ SubagentStop event
               ↓ Output: validation report
     │
     ↓
Present to User → iterate as needed
```

### Agent Configuration

| Agent | Model | Isolated Context |
|-------|-------|------------------|
| **SchemaExpert** | `sonnet` | Schema docs from SKILL.md + SchemaExplorer.md |
| **SQLFormatter** | `sonnet` | QueryLibrary.md + Snowflake patterns |
| **Validator** | `sonnet` | Common pitfalls + style guide |

**Why sonnet for all:** Balance of speed and quality for SQL generation. Each agent gets focused context (not the full conversation), enabling deeper expertise.

## Step 1: QueryArchitect (Understand Intent)

Ask clarifying questions:
- What metrics/data do you need?
- What time range?
- What granularity (daily, weekly, by chain)?
- Any specific filters (chains, tokens, addresses)?
- What will you do with this data? (affects output format)

## Step 2: SchemaExpert (Map to Tables)

Based on requirements, identify:

| Data Need | Primary Table | Join Tables |
|-----------|---------------|-------------|
| DEX volume | `crosschain.dex.trades` | - |
| Token transfers | `crosschain.assets.transfers` | `common.identity.entities` |
| Stablecoin flow | `crosschain.stablecoin.transfers` | `common.identity.entities` |
| NFT sales | `crosschain.nfts.trades` | - |
| Wallet balances | `<chain>.assets.balances` | `common.identity.entities` |
| Chain metrics | `crosschain.metrics.overview` | - |
| Address labels | `common.identity.entities` | (join table) |

**Key columns to consider:**
- Time: `block_timestamp`, `activity_date`
- Grouping: `chain`, `project`, `protocol`, `category`
- Metrics: `usd_amount`, `amount`, `usd_price`, `balance`
- Fees: `agg_fees:usd_platform`, `agg_fees:usd_creator`, `transaction_fees_usd`

## Step 3: SQLFormatter (Draft Query)

Apply these patterns:

### Snowflake SQL Best Practices

```sql
-- Use 1=1 for easy filter toggling
WHERE 1 = 1
  AND block_timestamp >= current_timestamp - interval '30 days'
  AND chain = 'ethereum'

-- Use explicit GROUP BY (GROUP BY ALL may not work in all environments)
GROUP BY date, chain

-- Use HAVING for post-aggregation filters
HAVING sum(usd_amount) > 1e4

-- Use QUALIFY for window function filtering
QUALIFY row_number() OVER (PARTITION BY address, date ORDER BY block_timestamp DESC) = 1

-- Use COALESCE for null handling
COALESCE(l.category, 'other') AS category

-- JSON field extraction with :
sum(agg_fees:usd_platform) AS platform_fees_usd

-- Scientific notation for large numbers
HAVING sum(usd_amount) > 1e6  -- $1M threshold
```

### Formatting Standards

```sql
SELECT
  date_trunc('day', block_timestamp) AS date,
  chain,
  SUM(usd_amount) AS volume_usd
FROM crosschain.dex.trades
WHERE 1 = 1
  AND block_timestamp >= current_timestamp - interval '30 days'
GROUP BY ALL
ORDER BY 1 DESC;
```

Rules:
- Keywords uppercase
- Column aliases use `AS`
- One condition per line in WHERE
- Indent subqueries
- End with semicolon

## Step 4: Validator (Check Query)

Verify:
- [ ] Time filter present (required for performance)
- [ ] Column names match schema
- [ ] Table names correct
- [ ] JSON field syntax correct (`:` not `.`)
- [ ] Aggregations match GROUP BY
- [ ] HAVING used (not WHERE) for aggregate filters
- [ ] No common pitfalls (see below)

### Common Pitfalls

| Issue | Wrong | Correct |
|-------|-------|---------|
| JSON field access | `agg_fees.usd_platform` | `agg_fees:usd_platform` |
| Missing time filter | no WHERE clause | `block_timestamp >= ...` |
| Filter on aggregate | `WHERE sum(...) > 100` | `HAVING sum(...) > 100` |
| Window function filter | `WHERE row_number() = 1` | `QUALIFY row_number() = 1` |
| Case sensitivity | `WHERE chain = 'Ethereum'` | `WHERE chain = 'ethereum'` |

## Step 5: Present & Iterate

### Output Format (CRITICAL)

Present each query with this structure:

```
## [TITLE]

**Definition:** [What this metric measures]

**KPI:** [The specific metric being calculated]

**Output:** [Table or Chart]

### Table Schema
| Column | Type | Description |
|--------|------|-------------|
| ... | ... | ... |

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

[SINGLE SQL CODE BLOCK - ONE QUERY ONLY]
```

### Formatting Rules

1. **ONE query per code block** - NEVER combine multiple queries in one block
2. **Separate queries completely** - If providing DAU and MAU, use TWO separate sections with full headers
3. **No text inside code blocks** - Labels like "MAU Query:" are NOT valid SQL
4. **Clear section breaks** - Use `---` between different queries
5. **Visual Title** - Only include if different from the query title
6. **Visual Subtitle** - Only include if adds context not in title

### Example Output

```
## Stablecoin DAU by Chain

**Definition:** Count of unique wallet addresses that sent stablecoin transfers per day

**KPI:** Daily Active Users (DAU)

**Output:** Chart + Table

**Tags:** `stablecoin` `dau` `daily` `crosschain` `kpi` `wallet`

### Table Schema
| Column | Type | Description |
|--------|------|-------------|
| date | DATE | Activity date |
| chain | STRING | Blockchain network |
| wallet_tier | STRING | Wallet size category |
| dau | INTEGER | Unique active wallets |

### Visualization Spec
| Property | Value |
|----------|-------|
| **Chart Type** | Line |
| **X-Axis** | date - day |
| **Y-Axis** | dau - sum |
| **Series (Group By)** | chain, wallet_tier |
| **Visual Subtitle** | Last 90 days, USD stablecoins only |

---
```

Then the SQL code block follows.

If user needs multiple queries (e.g., DAU AND MAU), present them as completely separate sections - never adjacent code blocks.

Ask: "Does this capture what you need, or should we adjust?"

## Subagent Invocation Pattern

### Stage 1: SchemaExpert
```
Task(
  description: "Find Allium tables",
  subagent_type: "Explore",
  model: "sonnet",
  prompt: """
    You are SchemaExpert for Allium queries.

    User wants: ${requirements}

    Find the right tables and columns from:
    - crosschain.dex.trades
    - crosschain.nfts.trades (agg_fees:usd_platform for JSON)
    - crosschain.stablecoin.transfers (base_asset column)
    - crosschain.metrics.overview
    - common.identity.entities (for address labels)
    - <chain>.assets.balances

    Return:
    1. Primary table
    2. Key columns needed
    3. Any joins required (e.g., identity.entities)
    4. Suggested filters

    End your response with:
    🗣️ Explore: [Brief summary of tables and columns found]
  """
)
```
**Event:** SubagentStop → output captured → passed to SQLFormatter

### Stage 2: SQLFormatter
```
Task(
  description: "Format Allium SQL",
  subagent_type: "Engineer",
  model: "sonnet",
  prompt: """
    You are SQLFormatter for Allium (Snowflake).

    Schema from previous stage:
    ${schemaExpertOutput}

    User requirements: ${requirements}

    Write query using these patterns:
    - GROUP BY ALL (not listing columns)
    - WHERE 1 = 1 AND ... (filter toggle)
    - QUALIFY row_number() OVER (...) = 1 (dedup)
    - agg_fees:usd_platform (JSON extraction with colon)
    - HAVING sum(x) > 1e4 (post-aggregation)
    - COALESCE(x, 'default') (null handling)

    Return: Complete, formatted SQL query

    End your response with:
    🗣️ Engineer: [Brief summary of query created]
  """
)
```
**Event:** SubagentStop → output captured → passed to Validator

### Stage 3: Validator
```
Task(
  description: "Validate Allium SQL",
  subagent_type: "Engineer",
  model: "sonnet",
  prompt: """
    You are Validator for Allium SQL.

    Query to validate:
    ${sqlFormatterOutput}

    Check for:
    - [ ] Time filter present (block_timestamp or activity_date)
    - [ ] JSON uses colon not dot (agg_fees:usd_platform)
    - [ ] QUALIFY for window filters (not WHERE)
    - [ ] HAVING for aggregate filters (not WHERE)
    - [ ] Chain names lowercase ('ethereum' not 'Ethereum')
    - [ ] GROUP BY ALL or explicit columns

    Return:
    1. VALID or list of issues
    2. Corrected query if issues found
    3. Performance suggestions

    End your response with:
    🗣️ Engineer: [Brief summary - VALID or issues found]
  """
)
```
**Event:** SubagentStop → final output returned to orchestrator

## Hook Integration

### Relevant PAI Hooks

| Hook | Event | Role in CoDesign |
|------|-------|------------------|
| `skill-entry.ts` | UserPromptSubmit | Routes "allium" triggers to this skill |
| `AgentOutputCapture.hook.ts` | SubagentStop | Persists each subagent's output to MEMORY/RESEARCH/ |
| `FormatEnforcer.hook.ts` | Stop | Ensures final response follows PAI format |

### Event Sequence
```
1. UserPromptSubmit
   └─► skill-entry.ts matches "allium", "query", "blockchain"
   └─► Loads Allium/SKILL.md into context
   └─► Routes to CoDesign workflow

2. Task (SchemaExpert)
   └─► Spawns subagent with isolated context
   └─► SubagentStop event fires
   └─► AgentOutputCapture.hook.ts saves to MEMORY/RESEARCH/allium-schema-{id}.md

3. Task (SQLFormatter)
   └─► Receives SchemaExpert output via orchestrator
   └─► SubagentStop event fires
   └─► Output saved to MEMORY/RESEARCH/allium-sql-{id}.md

4. Task (Validator)
   └─► Receives SQL from SQLFormatter
   └─► SubagentStop event fires
   └─► Output saved to MEMORY/RESEARCH/allium-validate-{id}.md

5. Stop
   └─► Orchestrator presents final query to user
   └─► FormatEnforcer ensures 🗣️ voice line present
```

### Why Sequential (Not Parallel)

- **SchemaExpert output is required by SQLFormatter** - can't format SQL without knowing tables
- **SQLFormatter output is required by Validator** - can't validate what doesn't exist
- **Each stage refines the previous** - handoff carries accumulated context

Parallel would be used if stages were independent (e.g., researching multiple chains simultaneously).

## Completion

Query is complete when:
- User confirms it captures their needs
- Validator finds no issues
- Query runs successfully (if user tests it)

## Skills Invoked

| Step | Skill |
|------|-------|
| Schema lookup | SchemaExplorer (this skill) |
| Complex analysis | DeepResearch |
| Address labeling | Nansen |
