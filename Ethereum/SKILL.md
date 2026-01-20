---
name: Ethereum
description: Ethereum Subject Matter Expert with EVM internals, DeFi primitives, and live protocol data. USE WHEN explaining EVM opcodes OR understanding AMM math OR debugging transactions OR analyzing DeFi protocols OR explaining gas calculations OR understanding lending mechanics OR querying latest EIPs.
---

# Ethereum

Deep Ethereum expertise combining:
- **EVM Internals**: All opcodes through Dencun, gas mechanics, execution model
- **DeFi Primitives**: AMM math, lending protocols, oracles, flash loans
- **Live Tools**: Fetch latest EIPs and current gas prices

**Announce at start:** "I'm using the Ethereum skill for in-depth Ethereum analysis."

## Overview

This skill provides Subject Matter Expert capability for Ethereum, including:

- **EVM Specifications**: All 140+ opcodes with gas costs, stack effects, Dencun updates (TLOAD, TSTORE, MCOPY, blobs)
- **DeFi Mechanics**: Constant product AMMs, concentrated liquidity, lending interest models, oracle patterns
- **Protocol Reference**: Addresses and parameters for Uniswap, Aave, Chainlink, Lido, and more
- **Codebase Navigation**: Tools to explore go-ethereum source code
- **Live Data**: Tools to fetch latest EIPs and network gas prices

Unlike the basic Ethereum skill (which fetches on-chain data), this skill answers "how does X work?" questions at implementation level.

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **ExplainConcept** | "explain [X]", "how does [Y] work", "what is" | Multi-level explanation from high-level to formal spec |
| **TraceCodepath** | "where is [X] implemented", "find code for", "trace in geth" | Navigate go-ethereum codebase |

## CLI Tools

### ExploreGeth

Navigate go-ethereum codebase.

```bash
# Search for code pattern
bun run $PAI_DIR/skills/Ethereum/Tools/ExploreGeth.ts --search "opCall"

# List functions in a package
bun run $PAI_DIR/skills/Ethereum/Tools/ExploreGeth.ts --package core/vm --list-functions

# Show implementation with context
bun run $PAI_DIR/skills/Ethereum/Tools/ExploreGeth.ts --function "StateDB.GetState" --show-implementation
```

### SearchDefinitions

Find function, type, and interface definitions.

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/SearchDefinitions.ts --function "opSstore"
bun run $PAI_DIR/skills/Ethereum/Tools/SearchDefinitions.ts --type "StateDB"
bun run $PAI_DIR/skills/Ethereum/Tools/SearchDefinitions.ts --interface "Backend"
```

### TraceCallers

Build call graphs for functions.

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/TraceCallers.ts --function "StateDB.SetState"
bun run $PAI_DIR/skills/Ethereum/Tools/TraceCallers.ts --function "opSstore" --depth 3
```

### DecodeOpcode

Decode EVM opcodes with Yellow Paper detail.

```bash
bun run $PAI_DIR/skills/Ethereum/Tools/DecodeOpcode.ts --opcode 0x55
bun run $PAI_DIR/skills/Ethereum/Tools/DecodeOpcode.ts --name SSTORE
bun run $PAI_DIR/skills/Ethereum/Tools/DecodeOpcode.ts --bytecode "6001600055"
```

### FetchEIPs

Query latest Ethereum Improvement Proposals.

```bash
# Get EIPs affecting EVM
bun run $PAI_DIR/skills/Ethereum/Tools/FetchEIPs.ts --affects-evm

# Get finalized EIPs since date
bun run $PAI_DIR/skills/Ethereum/Tools/FetchEIPs.ts --status Final --since 2024-01-01

# Get ERC standards
bun run $PAI_DIR/skills/Ethereum/Tools/FetchEIPs.ts --category ERC
```

### FetchGasPrice

Get current network gas prices.

```bash
# Current gas in gwei
bun run $PAI_DIR/skills/Ethereum/Tools/FetchGasPrice.ts --format gwei

# Include blob base fee
bun run $PAI_DIR/skills/Ethereum/Tools/FetchGasPrice.ts --include-blob-fee
```

## Knowledge Reference Files

| File | Content |
|------|---------|
| `Reference/EVMSpecification.md` | Complete EVM formal spec (execution model, opcodes, gas) |
| `Reference/DeFiPrimitives.md` | AMM math, lending mechanics, oracle patterns, flash loans |
| `Reference/StateTrieFormalization.md` | MPT structure, node types, proofs |
| `Reference/RLPEncoding.md` | RLP formal definition with examples |
| `Reference/BlockTransactionReceipt.md` | Data structure formats |
| `Reference/GasSchedule.md` | Complete gas cost tables by EIP |
| `Reference/ConsensusProtocol.md` | PoS consensus formalization |

## Data Files

| File | Content |
|------|---------|
| `Data/Opcodes.yaml` | All 140+ opcodes with gas costs, stack effects (through Dencun) |
| `Data/DeFiProtocols.yaml` | Protocol addresses, parameters for Uniswap, Aave, Chainlink, etc. |
| `Data/Precompiles.yaml` | Precompile addresses and gas models |
| `Data/GethPackages.yaml` | go-ethereum package map for navigation |

## Configuration

Set go-ethereum source path (defaults to skill's codebase/ directory):
```bash
export GETH_PATH=$PAI_DIR/skills/Ethereum/codebase/go-ethereum
```

## Examples

**Example 1: Explain SSTORE gas costs**
```
User: "Explain how SSTORE calculates gas"
-> Invokes ExplainConcept workflow
-> Level 1: SSTORE writes to storage, most expensive operation
-> Level 2: Gas depends on current/new value, cold/warm slot
-> Level 3: EIP-2200 gas schedule with scenarios
-> Level 4: Yellow Paper formula with formal notation
-> Code: Shows opSstore in core/vm/instructions.go
```

**Example 2: Debug failed transaction**
```
User: "Debug tx 0x1234... - it reverted"
-> Invokes DebugTransaction workflow
-> Fetches tx details
-> Traces execution step by step
-> Finds REVERT at step 47
-> Decodes revert reason: "Insufficient balance"
-> Shows exact storage read that triggered revert
```

**Example 3: Find storage update code path**
```
User: "Where does geth update account storage?"
-> Invokes TraceCodepath workflow
-> Entry: StateDB.SetState
-> Traces through state_object.go -> trie.go
-> Shows complete call hierarchy with line numbers
-> Links to Yellow Paper section 4.1
```

**Example 4: Explain block production**
```
User: "How does Ethereum produce blocks?"
-> Invokes ExplainConcept workflow
-> Slots (12 seconds), epochs (32 slots)
-> Proposer selection via RANDAO
-> Attestation and LMD-GHOST fork choice
-> Casper-FFG finality (2 epochs)
-> Code: Shows beacon/ and consensus/ packages
```

**Example 5: Explain Uniswap V3 math**
```
User: "How does concentrated liquidity work?"
-> Invokes ExplainDeFi workflow
-> Level 1: LPs provide liquidity in price ranges, not entire curve
-> Level 2: Tick math: price = 1.0001^tick
-> Level 3: Virtual reserves: L = sqrt(x * y)
-> Level 4: Capital efficiency up to 4000x vs V2 for tight ranges
-> Reference: DeFiPrimitives.md and Uniswap V3 whitepaper
```

**Example 6: Analyze Aave interest rates**
```
User: "How does Aave calculate borrow rates?"
-> Invokes AnalyzeProtocol workflow
-> Explains utilization curve model
-> Shows formula: rate = base + (utilization/optimal) * slope1
-> Above optimal: steep slope2 kicks in
-> Pulls parameters from DeFiProtocols.yaml
```

**Example 7: Get latest EVM changes**
```
User: "What EIPs changed the EVM in 2024?"
-> Invokes FetchEIPs tool
-> Returns: EIP-1153 (transient storage), EIP-5656 (MCOPY), EIP-4844 (blobs)
-> Shows opcode additions and gas implications
```

## Progressive Depth Model

When explaining concepts, this skill uses four levels of detail:

1. **High-Level Summary** (1-2 sentences) - What is it and why it matters
2. **Conceptual Model** (1 paragraph) - How it fits in the system
3. **Technical Detail** - Data structures, algorithms, gas implications
4. **Yellow Paper Formalization** - Formal notation, mathematical definitions

## Related Skills

**Uses:**
- **Ethereum** - For on-chain data queries (balances, contract reads)
- **SystematicDebugging** - When debugging complex issues

**Used by:**
- **DeepResearch** - As source for Ethereum architecture research
- **Brainstorming** - For Ethereum-related feature design
