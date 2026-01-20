# SchemaExplorer Workflow

> **Trigger:** User asks about available tables, schemas, or columns
> **Input:** Question about Allium data structure
> **Output:** Detailed schema information with examples

## Step 1: Identify Schema Category

Determine which data category the user needs:

| Category | Keywords |
|----------|----------|
| DEX | swaps, trades, volume, liquidity, AMM |
| Transfers | transfers, send, receive, flow |
| Balances | balance, holdings, wallet |
| NFT | nft, collection, sales |
| Stablecoin | stablecoin, usdc, usdt, dai |
| Lending | lending, borrow, deposit, liquidation, aave, compound |
| Raw | blocks, transactions, logs, traces |

## Step 2: Provide Schema Details

### DEX Schemas

**`crosschain.dex.trades`** - All DEX trades
```
chain                    STRING    Blockchain name
block_timestamp          TIMESTAMP Trade time
block_number             BIGINT    Block number
transaction_hash         STRING    Transaction hash
token_sold_address       STRING    Sold token contract
token_sold_symbol        STRING    Sold token ticker
token_sold_amount        DOUBLE    Sold amount (normalized)
token_bought_address     STRING    Bought token contract
token_bought_symbol      STRING    Bought token ticker
token_bought_amount      DOUBLE    Bought amount (normalized)
usd_amount               DOUBLE    USD value of trade
project                  STRING    DEX name (uniswap, curve)
protocol                 STRING    Version (uniswap_v3)
sender_address           STRING    Swap initiator
to_address               STRING    Recipient
liquidity_pool_address   STRING    Pool contract
log_index                INT       Log position
unique_id                STRING    Unique trade ID
```

**`crosschain.dex.trades_evm`** - EVM trades with fees
```
[All above columns PLUS:]
token_sold_decimals      INT       Sold token decimals
token_bought_decimals    INT       Bought token decimals
usd_sold_amount          DOUBLE    USD sold value
usd_bought_amount        DOUBLE    USD bought value
transaction_fees         DOUBLE    Gas fees in native token
transaction_fees_usd     DOUBLE    Gas fees in USD
swap_count               INT       Swaps in transaction
```

### Transfer Schemas

**`crosschain.assets.transfers`** - Token transfers
```
chain                    STRING    Blockchain name
token_type               STRING    erc20, native, spl, etc.
from_address             STRING    Sender address
to_address               STRING    Recipient address
token_address            STRING    Token contract
token_name               STRING    Token name
token_symbol             STRING    Token ticker
raw_amount               STRING    Raw amount (unnormalized)
amount                   DOUBLE    Normalized amount
usd_amount               DOUBLE    USD value
transaction_from_address STRING    TX initiator
transaction_to_address   STRING    TX target
transaction_hash         STRING    Transaction hash
block_timestamp          TIMESTAMP Transfer time
block_number             BIGINT    Block number
block_hash               STRING    Block hash
unique_id                STRING    Unique transfer ID
```

### Balance Schemas

**`<chain>.assets.fungible_balances_latest`** - Current balances
```
address                  STRING    Wallet address
token_address            STRING    Token contract
token_symbol             STRING    Token ticker
token_decimals           INT       Decimals
balance                  DOUBLE    Current balance
usd_balance_current      DOUBLE    USD value (current price)
last_updated             TIMESTAMP Last balance change
```

**`<chain>.assets.fungible_balances_daily`** - Daily snapshots
```
date                     DATE      Snapshot date
address                  STRING    Wallet address
token_address            STRING    Token contract
token_symbol             STRING    Token ticker
balance                  DOUBLE    Balance at date
usd_balance              DOUBLE    USD value at date
```

### NFT Schemas

**`crosschain.nfts.trades`** - NFT sales
```
chain                    STRING    Blockchain name
marketplace              STRING    Marketplace (OpenSea, Blur)
protocol                 STRING    Protocol version
order_match_type         STRING    BUY or ACCEPT_BID
trade_type               STRING    SINGLE_TRADE or BUNDLE_TRADE
buyer_address            STRING    Buyer
seller_address           STRING    Seller
token_address            STRING    Collection contract
token_id                 STRING    Specific NFT ID
token_standard           STRING    ERC721, ERC1155
raw_price                STRING    Unnormalized price
price                    DOUBLE    Normalized price
usd_price                DOUBLE    USD value
currency_symbol          STRING    Payment token
agg_fees                 DOUBLE    Total fees
buyer_fees               OBJECT    Buyer fee breakdown
seller_fees              OBJECT    Seller fee breakdown
block_timestamp          TIMESTAMP Sale time
block_number             BIGINT    Block number
transaction_hash         STRING    Transaction hash
unique_id                STRING    Unique trade ID
```

### Stablecoin Schemas

**`crosschain.stablecoin.transfers`** - Stablecoin transfers
```
chain                    STRING    Blockchain
from_address             STRING    Sender
to_address               STRING    Recipient
token_address            STRING    Stablecoin contract
token_symbol             STRING    USDC, USDT, DAI, etc.
amount                   DOUBLE    Transfer amount
usd_amount               DOUBLE    USD value
block_timestamp          TIMESTAMP Transfer time
transaction_hash         STRING    Transaction hash
```

**`crosschain.stablecoin.list`** - Stablecoin metadata
```
chain                    STRING    Blockchain
token_address            STRING    Contract address
token_symbol             STRING    Ticker
token_name               STRING    Full name
currency                 STRING    Currency type (usd, eur, etc.)
```

**`crosschain.metrics.stablecoin_volume`** - Aggregated metrics
```
date                     DATE      Metric date
chain                    STRING    Blockchain
token_address            STRING    Stablecoin contract
token_symbol             STRING    Ticker
transfer_volume          DOUBLE    Volume in tokens
transfer_volume_usd      DOUBLE    Volume in USD
transfer_count           BIGINT    Number of transfers
unique_senders           BIGINT    Unique sender count
unique_receivers         BIGINT    Unique receiver count
```

### Lending Schemas (Chain-Specific)

**`<chain>.defi.lending_deposits`**
```
block_timestamp          TIMESTAMP Deposit time
transaction_hash         STRING    Transaction hash
protocol                 STRING    Protocol (aave_v3, compound_v2)
market_address           STRING    Lending market contract
depositor_address        STRING    Depositor
token_address            STRING    Supplied token
amount                   DOUBLE    Deposit amount
usd_amount               DOUBLE    USD value
```

**`<chain>.defi.lending_liquidations`**
```
block_timestamp          TIMESTAMP Liquidation time
transaction_hash         STRING    Transaction hash
protocol                 STRING    Lending protocol
liquidator_address       STRING    Liquidator
borrower_address         STRING    Borrower
collateral_token         STRING    Seized collateral
collateral_amount        DOUBLE    Collateral amount
debt_token               STRING    Repaid debt token
debt_amount              DOUBLE    Debt amount
```

## Step 3: Provide Chain Coverage

### Chains with Balance Tables
```
ethereum, arbitrum, avalanche, base, bsc, optimism, polygon,
zksync, linea, scroll, blast, mantle, mode, celo, gnosis,
fantom, moonbeam, solana, sui, aptos, tron, bitcoin
```

### Chains with DEX Data
```
ethereum, arbitrum, base, optimism, polygon, avalanche, bsc,
solana, sui, fantom, gnosis, celo, linea, scroll, zksync,
blast, mantle, mode, moonbeam, aurora, harmony
```

### Chains with Lending Data
```
ethereum, arbitrum, avalanche, base, bsc, celo, gnosis,
linea, optimism, polygon, scroll, zksync
```

## Completion

Provide:
1. Relevant table names and schemas
2. Example query using those tables
3. Notes on chain availability
4. Related schemas that might be useful

## Skills Invoked

| Step | Skill |
|------|-------|
| Query building | QueryBuilder (this skill) |
| Protocol details | Ethereum |
