# ExplainConcept Workflow

> **Trigger:** "explain [concept]", "how does [X] work", "what is [Y] in Ethereum"
> **Input:** Concept name or question about Ethereum internals
> **Output:** Multi-level explanation from high-level summary to Yellow Paper formalization

---

## Step 1: Identify Concept Category

First, categorize the concept to determine relevant reference files:

| Category | Examples | Primary Reference |
|----------|----------|-------------------|
| EVM Execution | opcodes, gas, stack, interpreter | Reference/EVMSpecification.md |
| State Management | accounts, storage, tries | Reference/StateTrieFormalization.md |
| Data Encoding | RLP, SSZ, ABI, serialization | Reference/RLPEncoding.md |
| Consensus | PoS, validators, slots, epochs | Reference/ConsensusProtocol.md |
| Networking | devp2p, discovery, sync | Reference/NetworkProtocol.md |
| Transactions | types, signing, receipts | Reference/BlockTransactionReceipt.md |
| Gas Economics | gas schedule, EIPs, pricing | Reference/GasSchedule.md |

---

## Step 2: Progressive Depth Explanation

Explain the concept at four levels of increasing detail:

### Level 1: High-Level Summary (1-2 sentences)

Answer:
- **What is it?** (definition)
- **Why does it matter?** (purpose)

Example for SSTORE:
> "SSTORE is the EVM opcode that writes data to persistent storage. It's the most expensive operation because storage persists across transactions and must be maintained by all nodes."

### Level 2: Conceptual Model (1 paragraph)

Explain:
- How it fits in the system
- Key components or stages
- Important invariants

Example for SSTORE:
> "When SSTORE executes, it writes a 256-bit value to a 256-bit storage slot in the contract's storage trie. The gas cost depends on whether the slot is empty (first write costs more) and whether it was accessed earlier in the transaction (cold vs warm access). Storage changes are only committed to the state trie when the transaction succeeds."

### Level 3: Technical Detail

Cover:
- Data structures involved
- Algorithms used
- Gas implications
- Edge cases

Example for SSTORE:
> "SSTORE pops two values from the stack: slot (position) and value. The slot is keccak256-hashed to get the trie key. Gas calculation follows EIP-2200: 20,000 for zero-to-nonzero, 2,900 for nonzero-to-nonzero, plus access costs from EIP-2929 (2,100 cold, 100 warm). Setting a slot to zero provides a 4,800 gas refund."

### Level 4: Yellow Paper Formalization

Load the appropriate reference file and present:
- Formal notation
- Mathematical definitions
- Exact formulas
- EIP references

Example for SSTORE:
```
From EVMSpecification.md:

SSTORE (0x55):
  μ'[s] = μ[s] - gas_cost
  σ'[a].storage[slot] = value

Gas Schedule (EIP-2200 + EIP-2929):
  G_coldsload = 2100
  G_warmaccess = 100
  G_sset = 20000
  G_sreset = 2900
  R_sclear = 4800 (refund)
```

---

## Step 3: Code Reference

If the concept has implementation in go-ethereum, show the relevant code:

```bash
# Find the implementation
bun run $PAI_DIR/skills/EthereumSME/Tools/SearchDefinitions.ts --function "opSstore" --context 30

# Or for types
bun run $PAI_DIR/skills/EthereumSME/Tools/SearchDefinitions.ts --type "StateDB" --context 50

# Trace call path
bun run $PAI_DIR/skills/EthereumSME/Tools/ExploreGeth.ts --function "opSstore" --callers
```

Present:
- File location and line number
- Key code snippet
- Brief explanation of the implementation

---

## Step 4: Practical Examples

Provide concrete examples:

1. **Simple example** with actual values
2. **Edge case** showing boundary behavior
3. **Real-world scenario** if applicable

Example for SSTORE:
```
Simple: Write value 1 to slot 0
  PUSH1 0x01    # value
  PUSH1 0x00    # slot
  SSTORE        # storage[0] = 1

Edge case: Overwrite existing value
  If storage[0] = 5, then SSTORE with value=10
  Gas: 2100 (cold) + 2900 (reset) = 5000 gas

Real-world: ERC-20 balance update
  mapping(address => uint256) balances;
  balances[msg.sender] = newBalance;
  # Compiles to SSTORE with slot = keccak256(sender ++ slot_index)
```

---

## Completion Checklist

Before completing the explanation, ensure:

- [ ] All four depth levels covered
- [ ] Accurate technical details
- [ ] Formal notation from reference files (when applicable)
- [ ] Code reference with file:line
- [ ] At least one practical example
- [ ] Related concepts mentioned (if helpful)

---

## Concept Quick Reference

For common concepts, here's where to look:

### EVM Opcodes
- Definition: Data/Opcodes.yaml
- Formal spec: Reference/EVMSpecification.md, Section 3-6
- Code: core/vm/instructions.go
- Tool: `DecodeOpcode.ts --name OPCODE`

### Storage Operations
- Formal spec: Reference/EVMSpecification.md, Section 5
- State trie: Reference/StateTrieFormalization.md
- Code: core/state/statedb.go, core/state/state_object.go
- Tool: `ExploreGeth.ts --function "SetState" --callers`

### Gas Calculations
- Formal spec: Reference/EVMSpecification.md, Section 6
- Gas table: Data/Opcodes.yaml (gas fields)
- Code: core/vm/gas_table.go
- Tool: `DecodeOpcode.ts --name OPCODE` (shows gas)

### Merkle Patricia Trie
- Formal spec: Reference/StateTrieFormalization.md
- Code: trie/trie.go, trie/node.go
- Tool: `ExploreGeth.ts --package trie --list-functions`

### RLP Encoding
- Formal spec: Reference/RLPEncoding.md
- Code: rlp/encode.go, rlp/decode.go
- Tool: `ExploreGeth.ts --search "RLP"`

### Block Production
- Code: eth/catalyst/api.go (Engine API)
- Code: core/blockchain.go (chain management)
- Tool: `ExploreGeth.ts --search "ForkchoiceUpdated"`

---

## Skills Invoked

| Step | Resource/Skill |
|------|----------------|
| Categorization | Reference file headers |
| Formal spec | Reference/*.md files |
| Code lookup | ExploreGeth.ts, SearchDefinitions.ts |
| Opcode details | DecodeOpcode.ts |
| Deep dive | DeepResearch skill (if external sources needed) |
