# TraceCodepath Workflow

> **Trigger:** "where is [X] implemented", "trace [operation] in geth", "find code for [Y]"
> **Input:** Function, type, or concept name to find in go-ethereum
> **Output:** Call hierarchy with file locations, code snippets, and Yellow Paper references

---

## Step 1: Identify Entry Point

Use the GethPackages.yaml mapping to find the likely starting package:

| Feature | Package | Entry File |
|---------|---------|------------|
| EVM execution | core/vm | interpreter.go, evm.go |
| Opcode handlers | core/vm | instructions.go |
| State operations | core/state | statedb.go |
| Account state | core/state | state_object.go |
| Trie operations | trie | trie.go |
| Trie nodes | trie | node.go |
| Block processing | core | blockchain.go |
| State transitions | core | state_processor.go |
| Transaction pool | core/txpool | txpool.go |
| Consensus (PoS) | consensus/beacon | consensus.go |
| Engine API | eth/catalyst | api.go |
| RLP encoding | rlp | encode.go, decode.go |
| P2P networking | p2p | server.go |
| eth protocol | eth/protocols/eth | handler.go |

---

## Step 2: Search for Definition

Use the search tools to find the exact location:

```bash
# For a function
bun run $PAI_DIR/skills/EthereumSME/Tools/SearchDefinitions.ts --function "FunctionName"

# For a method on a type
bun run $PAI_DIR/skills/EthereumSME/Tools/SearchDefinitions.ts --method "Type.Method"

# For a type definition
bun run $PAI_DIR/skills/EthereumSME/Tools/SearchDefinitions.ts --type "TypeName"

# For an interface
bun run $PAI_DIR/skills/EthereumSME/Tools/SearchDefinitions.ts --interface "InterfaceName"
```

---

## Step 3: Build Call Graph

Trace how the function is called and what it calls:

```bash
# Find all callers
bun run $PAI_DIR/skills/EthereumSME/Tools/ExploreGeth.ts --function "FunctionName" --callers

# Show implementation with context
bun run $PAI_DIR/skills/EthereumSME/Tools/ExploreGeth.ts --function "FunctionName" --show-implementation --context 50
```

Document the call hierarchy:

```
API Entry: eth_sendTransaction (eth/api_backend.go:123)
    ↓ calls
TxPool.Add (core/txpool/txpool.go:456)
    ↓ calls
validateTx (core/txpool/txpool.go:789)
    ↓ eventually leads to
StateProcessor.Process (core/state_processor.go:100)
    ↓ calls
ApplyTransaction (core/state_processor.go:150)
    ↓ calls
TransitionDb (core/state_transition.go:200)
    ↓ calls
EVM.Call (core/vm/evm.go:300)
```

---

## Step 4: Document Code Path

Present the complete path with:

1. **File locations** - Relative paths with line numbers
2. **Function signatures** - Show the actual Go signatures
3. **Key logic** - Explain what each step does
4. **Data transformations** - What goes in and comes out

### Example: SSTORE Code Path

```
Entry: opSstore (core/vm/instructions.go:524)
  ↓
  Pops slot and value from stack
  ↓
StateDB.SetState (core/state/statedb.go:340)
  ↓
  Looks up or creates state object for contract address
  ↓
stateObject.SetState (core/state/state_object.go:280)
  ↓
  Updates dirty storage map
  ↓
On commit: trie.Update (trie/trie.go:156)
  ↓
  Updates Merkle Patricia Trie with new value
```

---

## Step 5: Show Key Code Snippets

For critical functions, show the actual implementation:

```go
// core/vm/instructions.go:524
func opSstore(pc *uint64, interpreter *EVMInterpreter, scope *ScopeContext) ([]byte, error) {
    if interpreter.readOnly {
        return nil, ErrWriteProtection
    }
    loc := scope.Stack.pop()
    val := scope.Stack.pop()
    interpreter.evm.StateDB.SetState(
        scope.Contract.Address(),
        loc.Bytes32(),
        val.Bytes32(),
    )
    return nil, nil
}
```

---

## Step 6: Connect to Yellow Paper

Map the code to formal specification:

```
Code: opSstore in instructions.go
Yellow Paper: Appendix H, Section SSTORE

The implementation directly follows the formal specification:
- Stack pops: 2 items (slot, value) - matches δ=2
- State update: σ'[a].storage[slot] = value
- Gas deduction: Handled by gas_table.go:gasSStore
```

Reference the relevant section in Reference/EVMSpecification.md.

---

## Common Code Paths

### Transaction Execution

```
eth_sendTransaction
  → eth/api_backend.go:SendTx
  → core/txpool:Add
  → (block building)
  → core/state_processor.go:Process
  → core/state_processor.go:ApplyTransaction
  → core/state_transition.go:TransitionDb
  → core/vm/evm.go:Call or Create
  → core/vm/interpreter.go:Run
```

### State Read (SLOAD)

```
opSload (core/vm/instructions.go)
  → StateDB.GetState (core/state/statedb.go)
  → stateObject.GetState (core/state/state_object.go)
  → Trie.Get (trie/trie.go)
```

### Contract Creation (CREATE)

```
opCreate (core/vm/instructions.go)
  → EVM.Create (core/vm/evm.go)
  → evm.create (core/vm/evm.go)
  → StateDB.CreateAccount (core/state/statedb.go)
  → interpreter.Run (executes init code)
  → StateDB.SetCode (core/state/statedb.go)
```

### Block Import

```
eth handler receives block
  → eth/handler.go:handleBlockBroadcast
  → core/blockchain.go:InsertChain
  → core/blockchain.go:insertChain
  → core/blockchain.go:insertBlock
  → core/state_processor.go:Process
  → commit to database
```

---

## Output Format

Present the code path as:

```
Code Path: [Feature Name]
==========================

Entry Point: [API/Function]
Package: [go-ethereum package]

Call Hierarchy:
  1. [file:line] - [function] - [purpose]
  2. [file:line] - [function] - [purpose]
  ...

Key Code:
  [Most important code snippet]

Yellow Paper Reference:
  Section [X.Y]: [Description]

Related EIPs:
  - EIP-XXXX: [Description]
```

---

## Completion Checklist

- [ ] Entry point identified
- [ ] Full call path documented
- [ ] Line numbers included
- [ ] Key code snippets shown
- [ ] Yellow Paper connection made
- [ ] Related EIPs mentioned

## Skills Invoked

| Step | Resource/Skill |
|------|----------------|
| Definition search | SearchDefinitions.ts |
| Call graph | ExploreGeth.ts |
| Code exploration | ExploreGeth.ts --show-implementation |
| Formal spec | Reference/EVMSpecification.md |
