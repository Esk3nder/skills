# EVM Formal Specification

This document provides Yellow Paper-level formal specification of the Ethereum Virtual Machine (EVM).

**Reference:** Ethereum Yellow Paper, Appendix H (Virtual Machine Specification)

---

## 1. Machine State

The EVM is a stack-based virtual machine with a 256-bit word size.

### 1.1 Execution Environment (I)

The execution environment **I** contains:

| Symbol | Type | Description |
|--------|------|-------------|
| I_a | Address (20 bytes) | Address of account owning the executing code |
| I_o | Address | Original transaction sender (tx.origin) |
| I_p | uint256 | Gas price (wei per gas) |
| I_d | bytes | Input data (calldata) |
| I_s | Address | Sender of the message (msg.sender) |
| I_v | uint256 | Value sent with the message (msg.value) |
| I_b | bytes | Code being executed |
| I_H | BlockHeader | Current block header |
| I_e | uint256 | Depth of message call/contract creation |
| I_w | bool | Permission to modify state |

### 1.2 Machine State (μ)

The machine state **μ** consists of:

| Symbol | Type | Description |
|--------|------|-------------|
| μ_g | uint256 | Gas available |
| μ_pc | uint256 | Program counter |
| μ_m | bytes | Memory contents |
| μ_i | uint256 | Active memory size (in 32-byte words) |
| μ_s | Stack[uint256] | Stack (max 1024 items) |
| μ_o | bytes | Output data from RETURN/REVERT |

### 1.3 World State (σ)

The world state **σ** maps addresses to account states:

```
σ: Address -> AccountState | ∅

AccountState = {
    nonce: uint64,          # Transaction count (EOA) or contract creations (contract)
    balance: uint256,       # Wei balance
    storageRoot: bytes32,   # Root of storage trie (keccak256 of empty for EOA)
    codeHash: bytes32       # Hash of contract code (keccak256("") for EOA)
}
```

### 1.4 Accrued Substate (A)

The accrued substate **A** tracks side effects:

| Symbol | Type | Description |
|--------|------|-------------|
| A_s | Set[Address] | Self-destructed accounts |
| A_l | List[Log] | Log entries |
| A_t | Set[Address] | Touched accounts |
| A_r | uint256 | Refund balance |
| A_a | Set[(Address, bytes32)] | Accessed account addresses and storage keys |

---

## 2. Execution Model

### 2.1 Execution Function

The EVM execution function is defined as:

```
Ξ(σ, g, A, I) → (σ', g', A', o)

Where:
  σ  = Input world state
  g  = Available gas
  A  = Accrued substate
  I  = Execution environment

  σ' = Resultant world state
  g' = Remaining gas
  A' = Resultant accrued substate
  o  = Output (∅ for exceptional halt)
```

### 2.2 Execution Cycle

```
LOOP:
    1. Fetch opcode: op = I_b[μ_pc]
    2. Check stack requirements
    3. Check gas availability
    4. Execute operation
    5. Update machine state
    6. Increment PC (unless JUMP/JUMPI)
    GOTO LOOP unless halting condition
```

### 2.3 Halting Conditions

Execution halts when:

1. **Normal halt:** STOP, RETURN, or SELFDESTRUCT executed
2. **Revert:** REVERT executed (state changes rolled back)
3. **Exceptional halt:**
   - Out of gas
   - Invalid opcode
   - Stack underflow/overflow
   - Invalid JUMP destination
   - Write in static context
   - Call depth exceeded (1024)
   - Insufficient balance for transfer

---

## 3. Stack Operations

### 3.1 Stack Properties

- Maximum depth: 1024 items
- Each item: 256 bits (32 bytes)
- LIFO (Last In, First Out)
- Operations: push, pop, dup, swap

### 3.2 Stack Validation

Before each operation:

```
if |μ_s| < δ:              # Stack underflow
    EXCEPTIONAL_HALT

if |μ_s| - δ + α > 1024:   # Stack overflow
    EXCEPTIONAL_HALT

Where:
  δ = items popped from stack
  α = items pushed to stack
```

---

## 4. Memory Model

### 4.1 Memory Properties

- Byte-addressable
- Volatile (cleared between calls)
- Initially zero
- Expands on access (never shrinks)
- Word size: 32 bytes

### 4.2 Memory Expansion Cost

Memory cost is quadratic to prevent DoS:

```
C_mem(a) = G_memory * a + floor(a² / 512)

Where a = ceil(size / 32)  # Number of 32-byte words

Expansion cost for accessing byte range [offset, offset + size):
    new_words = ceil((offset + size) / 32)
    cost = C_mem(new_words) - C_mem(μ_i)
    μ_i = max(μ_i, new_words)
```

### 4.3 Memory Operations

| Opcode | Operation |
|--------|-----------|
| MLOAD | Load 32 bytes from memory at offset |
| MSTORE | Store 32 bytes to memory at offset |
| MSTORE8 | Store 1 byte to memory at offset |
| MSIZE | Get current memory size (bytes) |
| MCOPY | Copy memory range (EIP-5656) |

---

## 5. Storage Model

### 5.1 Storage Properties

- Persistent (survives transactions)
- Per-account
- Key-value map: uint256 → uint256
- Initially zero (non-existent keys return 0)

### 5.2 Storage Gas (EIP-2200, EIP-2929)

Storage operations are the most expensive due to persistence.

**Access costs (EIP-2929):**
- Cold slot access: 2100 gas
- Warm slot access: 100 gas

**SSTORE gas schedule (EIP-2200):**

| Current | New | Gas Cost | Refund |
|---------|-----|----------|--------|
| 0 | 0 | 100 | 0 |
| 0 | non-zero | 20000 | 0 |
| non-zero | 0 | 2900 | 4800 |
| non-zero (same) | non-zero (same) | 100 | 0 |
| non-zero | non-zero (different) | 2900 | 0 |

**Additional rules:**
- If slot was modified earlier in same transaction, only 100 gas
- Refund capped at 1/5 of total gas used (EIP-3529)

### 5.3 Storage in go-ethereum

```
core/vm/instructions.go:opSstore
    → core/state/statedb.go:SetState
        → core/state/state_object.go:SetState
            → trie update on commit
```

---

## 6. Gas Model

### 6.1 Intrinsic Gas

Gas charged before execution begins:

```
G_transaction = 21000                    # Base cost
G_txdatazero = 4                         # Per zero byte
G_txdatanonzero = 16                     # Per non-zero byte
G_txcreate = 32000                       # If contract creation
G_initcodeword = 2                       # Per 32-byte word of initcode (EIP-3860)
G_accesslistaddress = 2400               # Per address in access list
G_accessliststorage = 1900               # Per storage key in access list

Intrinsic gas = G_transaction
             + G_txdatazero * (zero bytes in data)
             + G_txdatanonzero * (non-zero bytes in data)
             + G_txcreate * (1 if creation else 0)
             + G_initcodeword * ceil(initcode_size / 32) if creation
             + G_accesslistaddress * (addresses in access list)
             + G_accessliststorage * (storage keys in access list)
```

### 6.2 Execution Gas

Each opcode has associated gas cost. Categories:

| Tier | Gas | Examples |
|------|-----|----------|
| Zero | 0 | STOP, RETURN |
| Base | 2 | ADDRESS, CALLER |
| Very Low | 3 | ADD, SUB, PUSH, POP |
| Low | 5 | MUL, DIV |
| Mid | 8 | ADDMOD, MULMOD |
| High | 10 | JUMPI |
| Ext | Variable | CALL, CREATE |

### 6.3 Dynamic Gas Costs

Some operations have variable gas:

```
EXP:        10 + 50 * byte_size(exponent)
KECCAK256:  30 + 6 * ceil(size / 32)
CALLDATACOPY, CODECOPY, RETURNDATACOPY:
            3 + 3 * ceil(size / 32) + memory_expansion
LOG{0-4}:   375 + 375*topics + 8*data_size + memory_expansion
CALL:       access_cost + memory_expansion + gas_to_callee
            + 9000 if value > 0
            + 25000 if creating new account
```

---

## 7. Call Operations

### 7.1 CALL Variants

| Opcode | Context | Value Transfer | State Modification |
|--------|---------|----------------|-------------------|
| CALL | callee | yes | yes |
| CALLCODE | caller | yes | yes (caller's storage) |
| DELEGATECALL | caller | no (preserves) | yes (caller's storage) |
| STATICCALL | callee | no | no (read-only) |

### 7.2 CALL Gas Calculation

```
base_cost = access_cost(address)          # 2600 cold, 100 warm
memory_cost = expansion_cost(args) + expansion_cost(ret)
value_cost = 9000 if value > 0 else 0
new_account_cost = 25000 if address empty and value > 0 else 0

total = base_cost + memory_cost + value_cost + new_account_cost

# Gas to callee (after all deductions)
gas_to_callee = min(available_gas - floor(available_gas / 64), gas_param)

# EIP-150: 63/64 rule - keep 1/64 for caller
```

### 7.3 Call Depth Limit

Maximum call depth: 1024

Each CALL/DELEGATECALL/STATICCALL/CREATE increments depth.

---

## 8. Contract Creation

### 8.1 CREATE

```
address = keccak256(RLP([sender, nonce]))[12:]

Steps:
1. Deduct value from sender
2. Increment sender nonce
3. Create account at address
4. Transfer value
5. Execute init code
6. Store returned code (max 24576 bytes, EIP-170)
7. Charge G_codedeposit * code_length
```

### 8.2 CREATE2 (EIP-1014)

```
address = keccak256(0xff ++ sender ++ salt ++ keccak256(init_code))[12:]

Additional cost: 6 * ceil(init_code_length / 32) for hashing
```

### 8.3 Creation Constraints

- Max init code size: 49152 bytes (EIP-3860)
- Max deployed code size: 24576 bytes (EIP-170)
- Code cannot start with 0xEF (EIP-3541, reserved for EOF)

---

## 9. Precompiled Contracts

Precompiles are built-in contracts at addresses 0x01-0x0a:

| Address | Name | Gas Formula | Description |
|---------|------|-------------|-------------|
| 0x01 | ecRecover | 3000 | ECDSA public key recovery |
| 0x02 | SHA256 | 60 + 12*words | SHA-256 hash |
| 0x03 | RIPEMD160 | 600 + 120*words | RIPEMD-160 hash |
| 0x04 | identity | 15 + 3*words | Data copy |
| 0x05 | modexp | complex | Modular exponentiation |
| 0x06 | ecAdd | 150 | BN256 point addition |
| 0x07 | ecMul | 6000 | BN256 scalar multiplication |
| 0x08 | ecPairing | 45000 + 34000*pairs | BN256 pairing check |
| 0x09 | blake2f | rounds | BLAKE2b compression |
| 0x0a | pointEvaluation | 50000 | KZG point evaluation (EIP-4844) |

---

## 10. go-ethereum Implementation

### 10.1 Key Files

| File | Contents |
|------|----------|
| `core/vm/evm.go` | EVM struct, Call/Create functions |
| `core/vm/interpreter.go` | Main execution loop |
| `core/vm/instructions.go` | Opcode implementations |
| `core/vm/jump_table.go` | Opcode dispatch table |
| `core/vm/gas_table.go` | Gas cost calculations |
| `core/vm/memory.go` | Memory implementation |
| `core/vm/stack.go` | Stack implementation |

### 10.2 Execution Flow

```
1. EVM.Call / EVM.Create
   → NewContract (wrap code)
   → interpreter.Run

2. interpreter.Run (main loop)
   → For each opcode:
      → Check gas
      → Execute via jump table
      → Update state

3. Opcode execution
   → instructions.go functions
   → State updates via StateDB
```

### 10.3 Jump Table

The jump table maps opcodes to their implementations:

```go
// core/vm/jump_table.go
type operation struct {
    execute     executionFunc    // Implementation
    constantGas uint64           // Fixed gas cost
    dynamicGas  gasFunc          // Variable gas calculator
    minStack    int              // Min stack items required
    maxStack    int              // Max stack growth
    memorySize  memorySizeFunc   // Memory size calculator
}

type JumpTable [256]*operation
```

---

## 11. EVM Versions (Forks)

| Fork | Block | Key Changes |
|------|-------|-------------|
| Frontier | 0 | Initial release |
| Homestead | 1150000 | CREATE failure behavior |
| Tangerine Whistle | 2463000 | Gas cost increases (EIP-150) |
| Spurious Dragon | 2675000 | State clearing, code size limit |
| Byzantium | 4370000 | REVERT, RETURNDATASIZE/COPY |
| Constantinople | 7280000 | SHL, SHR, SAR, CREATE2, EXTCODEHASH |
| Istanbul | 9069000 | CHAINID, SELFBALANCE, gas adjustments |
| Berlin | 12244000 | Access lists (EIP-2929, 2930) |
| London | 12965000 | Base fee (EIP-1559), EIP-3529 |
| Paris (Merge) | 15537394 | PoS, PREVRANDAO replaces DIFFICULTY |
| Shanghai | 17034870 | Withdrawals, PUSH0 |
| Cancun | 19426589 | Blobs (EIP-4844), TSTORE/TLOAD, MCOPY |

---

## 12. Formal Notation Reference

| Symbol | Meaning |
|--------|---------|
| σ | World state |
| μ | Machine state |
| I | Execution environment |
| A | Accrued substate |
| Ξ | Execution function |
| ∅ | Empty/null |
| ⊥ | Exception/invalid |
| ‖ | Concatenation |
| KEC | Keccak-256 |
| RLP | Recursive Length Prefix encoding |
