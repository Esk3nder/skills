# QueryBuilder Workflow

> **Trigger:** User wants to write a blockchain SQL query
> **Input:** Natural language description of data needed
> **Output:** Production-ready SQL query with explanation

## Step 1: Understand the Request

Parse the user's request to identify:

1. **Data type**: DEX trades, transfers, balances, NFTs, lending, stablecoins
2. **Chains**: Specific chains or all chains
3. **Time range**: Relative (last 7 days) or absolute dates
4. **Filters**: Addresses, tokens, protocols, amounts
5. **Aggregations**: Sum, count, avg, group by
6. **Output format**: Raw data, aggregated metrics, time series

## Step 2: Select the Right Table

| Data Need | Table |
|-----------|-------|
| DEX swaps/trades | `crosschain.dex.trades` or `crosschain.dex.trades_evm` |
| Token transfers | `crosschain.assets.transfers` |
| Current wallet balances | `<chain>.assets.fungible_balances_latest` |
| Historical balances | `<chain>.assets.fungible_balances_daily` |
| Balance changes | `<chain>.assets.fungible_balances` |
| Stablecoin transfers | `crosschain.stablecoin.transfers` |
| Stablecoin volume | `crosschain.metrics.stablecoin_volume` |
| NFT sales | `crosschain.nfts.trades` |
| Lending deposits | `<chain>.defi.lending_deposits` |
| Lending borrows | `<chain>.defi.lending_borrows` |
| Lending liquidations | `<chain>.defi.lending_liquidations` |

## Step 3: Build the Query Structure

```sql
-- [Description of what this query does]
SELECT
  [columns with clear aliases]
FROM [table]
WHERE
  [time filter - ALWAYS include for performance]
  AND [chain filter if needed]
  AND [additional filters]
GROUP BY [if aggregating]
ORDER BY [logical ordering]
LIMIT [reasonable limit for exploration];
```

## Step 4: Apply Best Practices

### Time Filtering (MANDATORY)
```sql
-- Relative time (preferred)
WHERE block_timestamp >= current_timestamp - interval '7 days'

-- Absolute time
WHERE block_timestamp BETWEEN '2024-01-01' AND '2024-01-31'
```

### Chain Filtering
```sql
-- Single chain
WHERE chain = 'ethereum'

-- Multiple chains
WHERE chain IN ('ethereum', 'base', 'arbitrum')
```

### Address Filtering
```sql
-- Always lowercase addresses
WHERE from_address = lower('0xAbC...')
-- Or
WHERE from_address = '0xabc...'
```

### Aggregations
```sql
-- Daily aggregation pattern
SELECT
  date(block_timestamp) as date,
  chain,
  SUM(usd_amount) as volume
FROM crosschain.dex.trades
WHERE block_timestamp >= current_timestamp - interval '30 days'
GROUP BY 1, 2
ORDER BY date ASC;
```

## Step 5: Optimize Query

1. **Filter early**: Put most selective conditions first
2. **Limit scope**: Add chain filter even if querying all chains
3. **Use indexes**: `block_timestamp`, `chain`, `token_address` are indexed
4. **Avoid SELECT ***: Specify only needed columns
5. **Add LIMIT**: Always limit exploration queries (100-1000 rows)

## Step 6: Provide Explanation

After the query, explain:
- What data it returns
- Key filters applied
- Expected output format
- How to modify for other use cases

## Query Templates by Use Case

### DEX Volume Analysis
```sql
-- DEX volume by protocol on [chain] for last [N] days
SELECT
  date(block_timestamp) as date,
  project,
  protocol,
  COUNT(*) as trades,
  SUM(usd_amount) as volume_usd
FROM crosschain.dex.trades
WHERE block_timestamp >= current_timestamp - interval '7 days'
  AND chain = 'ethereum'
GROUP BY 1, 2, 3
ORDER BY date, volume_usd DESC;
```

### Wallet Activity
```sql
-- All token transfers for wallet [address] in last [N] days
SELECT
  block_timestamp,
  CASE WHEN from_address = lower('[address]') THEN 'OUT' ELSE 'IN' END as direction,
  token_symbol,
  amount,
  usd_amount,
  transaction_hash
FROM crosschain.assets.transfers
WHERE block_timestamp >= current_timestamp - interval '30 days'
  AND (from_address = lower('[address]') OR to_address = lower('[address]'))
ORDER BY block_timestamp DESC;
```

### Token Flow Analysis
```sql
-- Top senders/receivers of [token] on [chain]
SELECT
  from_address,
  to_address,
  SUM(amount) as total_amount,
  SUM(usd_amount) as total_usd,
  COUNT(*) as transfer_count
FROM crosschain.assets.transfers
WHERE block_timestamp >= current_timestamp - interval '7 days'
  AND chain = 'ethereum'
  AND token_address = lower('[token_address]')
GROUP BY 1, 2
ORDER BY total_usd DESC
LIMIT 100;
```

### NFT Market Analysis
```sql
-- Top NFT collections by volume on [chain]
SELECT
  token_address as collection,
  COUNT(*) as sales,
  SUM(usd_price) as total_volume,
  AVG(usd_price) as avg_price,
  MAX(usd_price) as max_price
FROM crosschain.nfts.trades
WHERE block_timestamp >= current_timestamp - interval '7 days'
  AND chain = 'ethereum'
GROUP BY 1
HAVING SUM(usd_price) > 10000
ORDER BY total_volume DESC
LIMIT 50;
```

### Stablecoin Metrics
```sql
-- Daily stablecoin transfer volume by chain
SELECT
  date,
  chain,
  SUM(transfer_volume_usd) as volume,
  SUM(transfer_count) as txns
FROM crosschain.metrics.stablecoin_volume
WHERE date >= current_date - interval '30 days'
GROUP BY 1, 2
ORDER BY date, volume DESC;
```

### Multi-Stage Analysis Pattern
```sql
-- Step 1: Run base query (save run_id)
SELECT ... FROM crosschain.dex.trades WHERE ...;

-- Step 2: Query results (within 24 hours)
SELECT
  SUM(volume_usd) as total,
  AVG(volume_usd) as avg_daily
FROM query_history.[run_id]_[timestamp]_horde;
```

## Completion

Return:
1. The complete SQL query
2. Brief explanation of what it queries
3. Notes on any assumptions made
4. Suggestions for variations

## Skills Invoked

| Step | Skill |
|------|-------|
| Complex analysis | DeepResearch |
| Wallet labeling | Nansen |
| Protocol details | Ethereum |
