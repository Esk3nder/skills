# Allium Query Library

Production-ready SQL queries using Snowflake patterns.

## SQL Style Guide

### Conventions
```sql
-- Keywords uppercase, aliases with AS
SELECT
  date_trunc('day', block_timestamp) AS date,
  chain,
  SUM(usd_amount) AS volume_usd

-- Use 1=1 for easy filter toggling
WHERE 1 = 1
  AND block_timestamp >= current_timestamp - interval '30 days'

-- GROUP BY: Use explicit columns (GROUP BY ALL may not work in all environments)
GROUP BY date, chain
-- Or use positional: GROUP BY 1, 2

-- HAVING for post-aggregation filters
HAVING SUM(usd_amount) > 1e4

-- QUALIFY for window function filtering
QUALIFY row_number() OVER (...) = 1

-- JSON field extraction with colon
SUM(agg_fees:usd_platform) AS platform_fees_usd
```

---

## NFT Analytics

### Weekly NFT Volume with Fees by Chain
```sql
SELECT
  chain,
  date_trunc('week', block_timestamp) AS week,
  SUM(usd_price) AS volume_usd,
  SUM(agg_fees:usd_platform) AS platform_fees_usd,
  SUM(agg_fees:usd_creator) AS creator_fees_usd
FROM crosschain.nfts.trades
WHERE block_timestamp BETWEEN current_date - interval '365 days'
  AND date_trunc('week', current_date)
GROUP BY ALL
```

---

## DEX Analytics

### Daily DEX Volume by Protocol
```sql
SELECT
  date(block_timestamp) AS date,
  project,
  SUM(usd_amount) AS usd_volume
FROM crosschain.dex.trades
WHERE 1 = 1
  AND block_timestamp >= current_timestamp - interval '3 month'
GROUP BY ALL
HAVING SUM(usd_amount) > 1e4  -- More than $10k volume
ORDER BY 1 DESC
```

### Solana DEX Volume for Specific Protocols
```sql
SELECT
  DATE(block_timestamp) AS date,
  project,
  SUM(usd_amount) AS daily_volume_usd
FROM solana.dex.trades
WHERE project IN ('solfi', 'humidifi', 'zerofi', 'obric', 'goonfi', 'aquifer')
  AND block_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY date
```

---

## Bridge & Balance Analytics

### Bridge ETH Balances Over Time (with Deduplication)
```sql
SELECT
  date,
  project,
  SUM(balance) AS eth
FROM (
  SELECT
    date_trunc('week', block_timestamp) AS date,
    project,
    balances.address,
    balance
  FROM ethereum.assets.balances balances
  INNER JOIN common.identity.entities
    ON balances.address = entities.address
    AND category = 'bridge'
    AND chain = 'ethereum'
  WHERE block_timestamp >= current_timestamp - interval '1 year'
    AND token_type = 'ETH'
  QUALIFY row_number() OVER (
    PARTITION BY balances.address, date
    ORDER BY block_timestamp DESC
  ) = 1
)
GROUP BY 1, 2
```

---

## Chain Metrics

### Weekly Transaction Fees by Chain
```sql
SELECT
  chain,
  activity_date,
  transaction_fees_usd
FROM crosschain.metrics.overview
WHERE 1 = 1
  AND activity_date BETWEEN date_trunc('week', current_date - interval '365 days')
  AND date_trunc('week', current_date) - interval '1 day'
```

---

## Stablecoin Analytics

### Daily Stablecoin Volume by Chain
```sql
SELECT
  date_trunc('day', block_timestamp) AS date,
  chain,
  COALESCE(ROUND(SUM(amount), 2), 0) AS volume
FROM crosschain.stablecoin.transfers
WHERE base_asset IN ('usdc', 'usdt', 'pyusd', 'dai', 'tusd', 'busd')
  AND chain != 'solana'  -- Exclude if needed
GROUP BY 1, 2
ORDER BY 1
```

### Stablecoin Volume by Address Category
```sql
SELECT
  date_trunc('day', block_timestamp) AS date,
  COALESCE(l.category, 'other') AS category,
  ROUND(SUM(amount), 2) AS amount
FROM crosschain.stablecoin.transfers c
LEFT JOIN common.identity.entities l
  ON c.from_address = l.address
WHERE base_asset IN ('usdc', 'usdt', 'pyusd', 'dai', 'tusd', 'busd')
GROUP BY 1, 2
ORDER BY 1
```

### Transaction Size Distribution (Bucketing)
```sql
WITH cte AS (
  SELECT
    UPPER(base_asset) AS base_asset,
    CASE
      WHEN amount < 100 THEN 'a. < $100'
      WHEN amount < 1000 THEN 'b. $100 - $1k'
      WHEN amount < 10000 THEN 'c. $1k - $10k'
      WHEN amount < 100000 THEN 'd. $10k - $100k'
      WHEN amount < 1000000 THEN 'e. $100k - $1M'
      WHEN amount < 10000000 THEN 'f. $1M - $10M'
      WHEN amount < 10000000000 THEN 'g. > $10M'
      ELSE 'h. n/a'
    END AS txn_size
  FROM crosschain.stablecoin.transfers
  WHERE base_asset IN ('usdc', 'usdt', 'pyusd', 'dai', 'tusd', 'busd')
    AND block_timestamp >= current_timestamp - interval '30 days'
)
SELECT
  base_asset,
  txn_size,
  COUNT(*) AS txn_count
FROM cte
WHERE txn_size <> 'h. n/a'
GROUP BY 1, 2
ORDER BY 3
```

### Unique Addresses by Chain (Last 7 Days)
```sql
SELECT
  date_trunc('day', block_timestamp) AS date,
  chain,
  COUNT(DISTINCT from_address) AS uq_senders,
  COUNT(DISTINCT to_address) AS uq_recipients
FROM crosschain.stablecoin.transfers
WHERE block_timestamp >= current_timestamp - interval '7 days'
  AND base_asset IN ('usdc', 'usdt', 'pyusd', 'dai', 'tusd', 'busd')
GROUP BY 1, 2
ORDER BY 1
```

---

## Key Tables Reference

| Table | Use Case |
|-------|----------|
| `crosschain.dex.trades` | DEX swaps across all chains |
| `crosschain.nfts.trades` | NFT sales with fees |
| `crosschain.stablecoin.transfers` | Stablecoin transfers |
| `crosschain.metrics.overview` | Chain-level metrics (fees, txns) |
| `<chain>.assets.balances` | Wallet balances over time |
| `<chain>.dex.trades` | Chain-specific DEX data |
| `common.identity.entities` | Address labels (bridges, exchanges, etc.) |

## Key Columns

### Stablecoin Transfers
- `base_asset` - Stablecoin type (usdc, usdt, dai, etc.)
- `amount` - Transfer amount
- `from_address`, `to_address` - Participants

### NFT Trades
- `agg_fees:usd_platform` - Platform fees (JSON extraction)
- `agg_fees:usd_creator` - Creator royalties (JSON extraction)
- `usd_price` - Sale price in USD

### Chain Metrics
- `activity_date` - Date of activity
- `transaction_fees_usd` - Total fees in USD

### Identity/Labels
- `category` - Address category (bridge, exchange, etc.)
- `project` - Protocol name
- `chain` - Chain for the address

---

## Snowflake-Specific Syntax

| Feature | Syntax | Example |
|---------|--------|---------|
| Group all columns | `GROUP BY ALL` | Saves listing every column |
| JSON field | `column:field` | `agg_fees:usd_platform` |
| Window filter | `QUALIFY` | `QUALIFY row_number() = 1` |
| Null handling | `COALESCE(x, 'default')` | `COALESCE(category, 'other')` |
| Scientific notation | `1e6` | `HAVING sum(x) > 1e6` |
| Date truncation | `date_trunc('week', ts)` | Weekly aggregation |
