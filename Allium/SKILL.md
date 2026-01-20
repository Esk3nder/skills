---
name: Allium
description: Enterprise blockchain data platform for SQL queries across 80+ chains. USE WHEN blockchain analytics OR DEX trades OR token transfers OR wallet balances OR NFT data OR stablecoin metrics OR lending protocol data OR crosschain queries.
---

# Allium

Query blockchain data across 80+ chains with SQL. Build perfect queries for DEX trades, token transfers, wallet balances, NFT activity, lending protocols, and stablecoins.

## MCP Integration (Primary Mode)

**Allium MCP Server provides 4 tools:**

| Tool | Purpose |
|------|---------|
| `mcp__allium__explorer_search_schemas` | Semantic search across all tables |
| `mcp__allium__explorer_fetch_schema` | Get exact columns/types for a table |
| `mcp__allium__explorer_run_sql` | Execute SQL, return data (250k rows max) |
| `mcp__allium__explorer_run_query` | Run saved queries by ID |

**MCP Configuration:** `~/.claude/.mcp.json`

## Mode Detection

```
┌─────────────────────────────────────────────────────────────┐
│                    SKILL ENTRY                               │
│  Check: Are mcp__allium__* tools available?                 │
└─────────────────────────────────────────────────────────────┘
          │                              │
     Available                      Not Available
          ▼                              ▼
   ┌─────────────┐                ┌─────────────┐
   │  MCP MODE   │                │ LEGACY MODE │
   │  (Full)     │                │ (SQL Only)  │
   │             │                │             │
   │ • Live schema│               │ • Static docs│
   │ • Execute SQL│               │ • Generate SQL│
   │ • Return data│               │ • User copies │
   └─────────────┘                └─────────────┘
```

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running Allium in MCP mode"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running **Allium** in **MCP Mode** - live schema search and query execution enabled...
   ```
   Or for legacy:
   ```
   Running **Allium** in **Legacy Mode** - generating SQL for manual execution...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CoDesign** | Interactive query building | `Workflows/CoDesign.md` (routes to MCP or Legacy) |
| **MCPMode** | MCP tools available | `Workflows/MCPMode.md` |
| **LegacyMode** | No MCP, SQL generation only | `Workflows/LegacyMode.md` |
| **SchemaExplorer** | "what tables", "schema" | `Workflows/SchemaExplorer.md` |

## Query Output Format

**ALWAYS present queries with this structure:**

```
## [Title]

**Definition:** [What this metric measures]

**KPI:** [Specific metric being calculated]

**Output:** [Table / Chart / Both]

**Tags:** `tag1` `tag2` `tag3` ...

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
| **Log Scale** | Yes / No (note: not supported for stacked charts) |
| **Visual Title** | [chart title] |
| **Visual Subtitle** | [optional context, e.g., "Last 90 days"] |

**Chart Type Guide:**
- **Line** - Time series trends
- **Bar** - Categorical comparisons
- **Stacked Bar** - Part-to-whole over time (absolute values)
- **100% Bar** - Part-to-whole over time (percentages)
- **Area** - Volume/magnitude trends
- **100% Area** - Composition trends (percentages)
- **Pie** - Part-to-whole snapshot
- **Tree Map** - Hierarchical part-to-whole

**When to use Log Scale:**
- High variance data (whale vs retail activity)
- Data spanning multiple orders of magnitude
- Comparing small and large values on same chart
- NOT supported for stacked charts

---

[SQL CODE BLOCK - ONE QUERY ONLY]
```

### Tag Taxonomy

Suggest 3-7 tags per query from these categories:

| Category | Example Tags |
|----------|--------------|
| **Domain** | `stablecoin` `dex` `nft` `lending` `bridge` `balances` `transfers` |
| **Metric** | `volume` `dau` `mau` `tvl` `fees` `count` `flow` `price` |
| **Chain** | `ethereum` `arbitrum` `base` `solana` `crosschain` `evm` |
| **Time Grain** | `daily` `weekly` `monthly` `hourly` `realtime` |
| **Analysis** | `kpi` `trend` `comparison` `ranking` `distribution` `cohort` |
| **Entity** | `wallet` `protocol` `token` `collection` `market` |

**Tag Rules:**
- Use lowercase, no spaces
- 3-7 tags per query
- Always include: domain + metric + time grain
- Add chain if specific, use `crosschain` if multi-chain

**Rules:**
- ONE query per code block (never combine)
- NO text inside code blocks (not valid SQL)
- Separate sections for multiple queries (DAU and MAU = two sections)
- Visual Title only if different from query title
- Visual Subtitle only if adds context not already in title

## MCP Mode Workflow

```
User Request
     ↓
[QueryArchitect] → Clarify requirements
     ↓
[SchemaExpert] → Call mcp__allium__explorer_search_schemas
     │           → Call mcp__allium__explorer_fetch_schema
     │           Returns: exact tables, columns, types
     ↓
[SQLFormatter] → Draft query using live schema
     ↓
[Validator] → Validate against fetched schema
     ↓
[Executor] → Call mcp__allium__explorer_run_sql
     │        Returns: actual data + metadata
     ↓
[Presenter] → Show results + visualization spec
```

## Legacy Mode Workflow

```
User Request
     ↓
[QueryArchitect] → Clarify requirements
     ↓
[SchemaExpert] → Use static schema docs (below)
     ↓
[SQLFormatter] → Draft query
     ↓
[Validator] → Validate syntax
     ↓
[Presenter] → Output SQL for user to copy
```

## Core Schemas Quick Reference

### Crosschain Tables (Multi-chain Aggregated)

| Table | Description |
|-------|-------------|
| `crosschain.dex.trades` | DEX swaps across all chains |
| `crosschain.dex.trades_evm` | EVM DEX swaps with fee details |
| `crosschain.assets.transfers` | Token transfers (ERC20, native, SPL) |
| `crosschain.stablecoin.transfers` | Stablecoin transfers (use `base_asset` filter) |
| `crosschain.stablecoin.list` | Stablecoin metadata by chain |
| `crosschain.metrics.stablecoin_volume` | Daily stablecoin volume metrics |
| `crosschain.metrics.overview` | Chain-level metrics (fees, txns) |
| `crosschain.nfts.trades` | NFT trades with fees (JSON: `agg_fees:usd_platform`) |

### Identity & Labels

| Table | Description |
|-------|-------------|
| `common.identity.entities` | Address labels (category, project, chain) |

### Chain-Specific Balance Tables

| Pattern | Description |
|---------|-------------|
| `<chain>.assets.fungible_balances_daily` | Daily balance snapshots |
| `<chain>.assets.fungible_balances_latest` | Current balances |
| `<chain>.assets.fungible_balances` | Block-level balance changes |

### Lending Tables (by chain)

| Category | Tables Available |
|----------|------------------|
| TVL | Daily TVL snapshots by market |
| Deposits | Supply/collateral events |
| Withdrawals | Withdrawal events |
| Loans | Borrow events |
| Repayments | Repayment events |
| Liquidations | Liquidation events |

## Key Columns Reference

### DEX Trades (`crosschain.dex.trades`)

```sql
chain                    -- blockchain name
block_timestamp          -- trade time
transaction_hash         -- tx hash
token_sold_address       -- sold token contract
token_sold_symbol        -- sold token ticker
token_sold_amount        -- normalized sold amount
token_bought_address     -- bought token contract
token_bought_symbol      -- bought token ticker
token_bought_amount      -- normalized bought amount
usd_amount               -- trade value in USD
project                  -- DEX name (uniswap, curve, etc.)
protocol                 -- specific version (uniswap_v3)
sender_address           -- swap initiator
liquidity_pool_address   -- pool contract
```

### Token Transfers (`crosschain.assets.transfers`)

```sql
chain                    -- blockchain name
token_type               -- erc20, native, spl, etc.
from_address             -- sender
to_address               -- recipient
token_address            -- token contract
token_symbol             -- ticker
amount                   -- normalized amount
usd_amount               -- USD value
transaction_hash         -- tx hash
block_timestamp          -- transfer time
```

### NFT Trades (`crosschain.nfts.trades`)

```sql
chain                    -- blockchain name
marketplace              -- OpenSea, Blur, etc.
buyer_address            -- buyer
seller_address           -- seller
token_address            -- NFT contract
token_id                 -- specific NFT ID
price                    -- sale price (normalized)
usd_price                -- USD value
currency_symbol          -- payment token
block_timestamp          -- trade time
```

### Stablecoin Transfers (`crosschain.stablecoin.transfers`)

```sql
chain                    -- blockchain name
base_asset               -- stablecoin type (usdc, usdt, dai, etc.)
from_address             -- sender
to_address               -- recipient
amount                   -- transfer amount
usd_amount               -- USD value
block_timestamp          -- transfer time
```

## Snowflake SQL Tips

### Must-Know Patterns
```sql
-- GROUP BY: explicit columns or positional (GROUP BY ALL may not work)
GROUP BY 1, 2

-- JSON field extraction (colon, not dot)
SUM(agg_fees:usd_platform) AS platform_fees_usd

-- Window function filtering (QUALIFY, not WHERE)
QUALIFY row_number() OVER (PARTITION BY address ORDER BY ts DESC) = 1

-- Filter toggle pattern
WHERE 1 = 1
  AND block_timestamp >= current_timestamp - interval '30 days'

-- Post-aggregation filtering (HAVING, not WHERE)
HAVING SUM(usd_amount) > 1e4

-- Scientific notation
HAVING SUM(usd_amount) > 1e6  -- $1M
```

### Multi-Series Chart Pattern (UNPIVOT)

**Problem:** Charts only accept ONE Y-axis column, but you need multiple lines (e.g., raw value + moving average).

**Solution:** Unpivot data so each metric becomes a row with a `metric` label column.

```sql
-- WRONG: Two Y-axis columns (won't chart properly)
SELECT day, log_count, ma_7d FROM daily_stats

-- RIGHT: Unpivoted for multi-series chart
WITH base AS (
    SELECT day, log_count, AVG(log_count) OVER (...) AS ma_7d
    FROM daily_stats
)
SELECT day, 'Daily Value' AS metric, log_count AS value FROM base
UNION ALL
SELECT day, '7-Day MA' AS metric, ma_7d AS value FROM base
ORDER BY day, metric
```

**Visualization Spec for unpivoted data:**
| Property | Value |
|----------|-------|
| **Y-Axis** | value |
| **Series (Group By)** | metric |

**Use cases:**
- Raw value + moving average (7D, 30D MA)
- Actual vs target comparison
- Multiple KPIs on same time axis
- Before/after comparisons

### Best Practices
1. **Always filter by time** - `block_timestamp` is indexed
2. **Use WHERE clauses early** - Filter before joins/aggregations to improve query speed
3. **Use explicit GROUP BY** - `GROUP BY 1, 2` or list columns (ALL may not work)
4. **Use `QUALIFY`** for window function deduplication
5. **JSON fields use `:`** not `.` (e.g., `agg_fees:usd_platform`)
6. **Scientific notation** for large numbers (`1e6` = 1 million)
7. **COALESCE for nulls** - `COALESCE(category, 'other')`

## Supported Chains

**EVM (60+):** ethereum, arbitrum, base, optimism, polygon, avalanche, bsc, zksync, linea, scroll, blast, mantle, mode, celo, gnosis, fantom, moonbeam, and many more

**Non-EVM:** solana, bitcoin, sui, aptos, cosmos ecosystem (osmosis, injective, dydx, celestia)

## Related Skills

| Skill | Relationship |
|-------|--------------|
| **Nansen** | Complements with smart money/wallet labeling |
| **Ethereum** | Deep EVM/DeFi protocol knowledge |
| **DeepResearch** | Multi-angle investigation with Allium data |

## Documentation

Full docs: https://docs.allium.so
LLM reference: https://docs.allium.so/llms.txt
MCP docs: https://docs.allium.so/assistant/mcp
