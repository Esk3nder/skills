# DeFi Primitives Reference

Technical deep-dive into core DeFi building blocks: AMMs, lending, oracles, and flash loans.

## AMM / Decentralized Exchanges

### Constant Product AMM (Uniswap V2)

The foundational AMM model uses the invariant:

```
x * y = k
```

Where:
- `x` = reserve of token A
- `y` = reserve of token B
- `k` = constant (invariant)

**Price determination:**
```
price_A_in_B = y / x
price_B_in_A = x / y
```

**Swap formula (exact input):**
```
amount_out = (reserve_out * amount_in * 997) / (reserve_in * 1000 + amount_in * 997)
```
The 0.3% fee (997/1000) goes to liquidity providers.

**Impermanent Loss:**
```
IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
```
At 2x price change: ~5.7% loss vs holding
At 5x price change: ~25.5% loss vs holding

### Concentrated Liquidity (Uniswap V3)

Instead of providing liquidity across all prices, LPs choose a range [p_a, p_b].

**Tick math:**
```
price = 1.0001^tick
tick = floor(log_1.0001(price))
```

**Virtual reserves within range:**
```
L = sqrt(x * y)  // Liquidity
x_virtual = L / sqrt(price)
y_virtual = L * sqrt(price)
```

**Capital efficiency:** Up to 4000x more capital efficient than V2 for tight ranges.

### StableSwap (Curve)

Hybrid invariant for like-kind assets (stablecoins):

```
A * n^n * sum(x_i) + D = A * D * n^n + D^(n+1) / (n^n * prod(x_i))
```

Where:
- `A` = amplification coefficient (typically 100-1000)
- `n` = number of tokens in pool
- `D` = invariant (sum of tokens when balanced)

Higher A = lower slippage for like-kind swaps, but more vulnerability to depeg.

---

## Lending Protocols

### Core Concepts

**Collateralization Ratio:**
```
health_factor = (collateral_value * liquidation_threshold) / debt_value
```
Liquidation occurs when `health_factor < 1`.

**Loan-to-Value (LTV):**
```
max_borrow = collateral_value * LTV
```
Typical LTV: 70-85% for majors (ETH, WBTC), 50-70% for altcoins.

### Interest Rate Models

**Aave V3 - Utilization-based:**
```
utilization = total_borrowed / total_supplied

if utilization <= optimal_utilization:
    borrow_rate = base_rate + (utilization / optimal) * slope1
else:
    excess = (utilization - optimal) / (1 - optimal)
    borrow_rate = base_rate + slope1 + excess * slope2
```

Typical parameters:
- `optimal_utilization`: 80%
- `base_rate`: 0%
- `slope1`: 4% (gradual increase below optimal)
- `slope2`: 75% (steep increase above optimal, discourages over-borrowing)

**Supply rate (what depositors earn):**
```
supply_rate = borrow_rate * utilization * (1 - reserve_factor)
```

### Liquidation Mechanics

**Liquidation Bonus:** Typically 5-10%, incentivizes liquidators.

```
liquidated_collateral = debt_to_cover * (1 + liquidation_bonus) / collateral_price
```

**Close Factor:** Max percentage of debt that can be liquidated at once (typically 50%).

---

## Oracles

### Chainlink Aggregators

**Round-based updates:**
```solidity
interface AggregatorV3Interface {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}
```

**Staleness check (critical for safety):**
```solidity
(, int256 price, , uint256 updatedAt, ) = feed.latestRoundData();
require(block.timestamp - updatedAt < HEARTBEAT, "Stale price");
require(price > 0, "Invalid price");
```

**Heartbeat:** Max time between updates (varies by feed: 1h for majors, 24h for others).

**Deviation threshold:** Update triggered if price changes >0.5-1%.

### Uniswap TWAP

**Time-Weighted Average Price:**
```
TWAP = (cumulative_price_end - cumulative_price_start) / time_elapsed
```

**Manipulation resistance:**
- Longer TWAP window = more resistant but slower to react
- Short window (e.g., 10 min) = responsive but manipulable
- Recommended: 30 min - 1 hour for lending protocols

**V3 Oracle (tick-based):**
```solidity
(int24 arithmeticMeanTick, ) = oracle.consult(pool, secondsAgo);
uint256 price = OracleLibrary.getQuoteAtTick(arithmeticMeanTick, baseAmount, baseToken, quoteToken);
```

---

## Flash Loans

### Mechanics

Borrow any amount with zero collateral, must repay within same transaction.

**Callback pattern (Aave):**
```solidity
function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,  // Fee: 0.09% on Aave
    address initiator,
    bytes calldata params
) external returns (bool);
```

**Uniswap V2 Flash Swaps:**
```solidity
function uniswapV2Call(
    address sender,
    uint256 amount0,
    uint256 amount1,
    bytes calldata data
) external;
```

### Common Use Cases

1. **Arbitrage:** Buy low on DEX A, sell high on DEX B
2. **Liquidations:** Borrow to pay off underwater position, receive collateral
3. **Collateral swaps:** Change collateral type without closing position
4. **Self-liquidation:** Avoid liquidation penalty by repaying debt yourself

### Security Considerations

Flash loans enable:
- **Oracle manipulation:** Temporarily skew TWAP/spot price
- **Governance attacks:** Borrow voting tokens, vote, return
- **Reentrancy amplification:** Large amounts make reentrancy more damaging

Mitigations:
- Use TWAP with sufficient window
- Snapshot voting power at past block
- Follow checks-effects-interactions pattern

---

## Staking

### Ethereum PoS Staking

**Validator requirements:**
- 32 ETH minimum stake
- Withdrawal credentials (0x01 for smart contract, 0x00 for BLS)

**Rewards:**
```
annual_yield ≈ base_reward * (1 / sqrt(total_staked))
```
Currently ~3-5% APY with ~30M ETH staked.

**Slashing conditions:**
1. **Double voting:** Signing two different blocks for same slot
2. **Surround voting:** FFG vote surrounds or is surrounded by previous vote

**Slashing penalty:**
```
initial_penalty = effective_balance / 32  // ~1 ETH
correlation_penalty = effective_balance * slashed_in_period * 3 / total_staked
```

### Liquid Staking (Lido, Rocket Pool)

**stETH mechanics (rebasing):**
- Balance increases daily as rewards accrue
- 1 stETH always redeemable for 1 ETH (plus queue time)
- Exchange rate can temporarily deviate on secondary markets

**rETH mechanics (non-rebasing):**
- Fixed balance, exchange rate increases
- `rETH_value = ETH_deposited * (1 + cumulative_rewards)`

---

## Key Addresses (Ethereum Mainnet)

| Protocol | Contract | Address |
|----------|----------|---------|
| Uniswap V2 Router | Router02 | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` |
| Uniswap V3 Factory | Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |
| Uniswap V3 Router | SwapRouter02 | `0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45` |
| Aave V3 Pool | Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` |
| Compound V3 USDC | cUSDCv3 | `0xc3d688B66703497DAA19211EEdff47f25384cdc3` |
| Chainlink ETH/USD | Aggregator | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| Lido stETH | stETH | `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84` |
| Rocket Pool rETH | rETH | `0xae78736Cd615f374D3085123A210448E74Fc6393` |

---

## Common Vulnerabilities

| Vulnerability | Description | Mitigation |
|---------------|-------------|------------|
| **Price manipulation** | Flash loan to skew spot price | Use TWAP, multiple oracles |
| **Reentrancy** | Callback before state update | CEI pattern, reentrancy guard |
| **Front-running** | MEV bots extract value | Use private mempools, commit-reveal |
| **Oracle staleness** | Using outdated price data | Check `updatedAt` timestamp |
| **Rounding errors** | Integer math precision loss | Round in protocol's favor |
| **Sandwich attacks** | Front + back-run user swap | Set reasonable slippage |
