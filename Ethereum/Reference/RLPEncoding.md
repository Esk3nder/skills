# RLP Encoding Specification

Recursive Length Prefix (RLP) is the primary serialization method for Ethereum data structures.

**Reference:** Ethereum Yellow Paper, Appendix B

---

## 1. Definition

RLP encodes arbitrarily nested arrays of binary data (byte arrays).

### 1.1 Input Domain

RLP can encode:
- **Byte strings**: Any sequence of bytes (including empty)
- **Lists**: Ordered sequences of RLP-encodable items

This covers all Ethereum data: transactions, blocks, accounts, trie nodes.

### 1.2 Key Properties

1. **Deterministic**: Same input always produces same output
2. **Prefix-based**: Length information comes first
3. **Self-describing**: Can determine type and length from prefix
4. **Efficient**: Minimal overhead for small items

---

## 2. Encoding Rules

### 2.1 Single Byte (0x00-0x7f)

If the input is a single byte in range [0x00, 0x7f]:

```
RLP(byte) = byte
```

Example: `RLP(0x42)` = `0x42`

### 2.2 Short String (0-55 bytes)

If the input is a string of 0-55 bytes:

```
RLP(string) = (0x80 + length) ++ string
```

Prefix range: 0x80-0xb7

Examples:
- `RLP("")` = `0x80` (empty string)
- `RLP("dog")` = `0x83 ++ "dog"` = `0x83646f67`
- `RLP("cat")` = `0x83 ++ "cat"` = `0x83636174`

### 2.3 Long String (56+ bytes)

If the input is a string of 56 or more bytes:

```
RLP(string) = (0xb7 + len(len)) ++ big_endian(length) ++ string
```

Where:
- `len(len)` = number of bytes needed to encode the length
- Prefix range: 0xb8-0xbf

Example (1024 byte string):
- Length = 1024 = 0x0400 (2 bytes)
- `RLP(string)` = `0xb9 0x04 0x00 ++ string`

### 2.4 Short List (0-55 bytes total payload)

If the total RLP-encoded size of list items is 0-55 bytes:

```
RLP([items]) = (0xc0 + total_length) ++ RLP(item₀) ++ RLP(item₁) ++ ...
```

Prefix range: 0xc0-0xf7

Examples:
- `RLP([])` = `0xc0` (empty list)
- `RLP(["cat", "dog"])` = `0xc8 0x83636174 0x83646f67`
  - 0xc8 = 0xc0 + 8 (total payload = 4 + 4 = 8 bytes)

### 2.5 Long List (56+ bytes total payload)

If the total RLP-encoded size of list items is 56 or more bytes:

```
RLP([items]) = (0xf7 + len(len)) ++ big_endian(total_length) ++ RLP(item₀) ++ ...
```

Prefix range: 0xf8-0xff

---

## 3. Encoding Summary Table

| Input Type | Prefix Range | Format |
|------------|--------------|--------|
| Single byte [0x00, 0x7f] | (none) | byte itself |
| String 0-55 bytes | 0x80-0xb7 | prefix + string |
| String 56+ bytes | 0xb8-0xbf | prefix + len + string |
| List 0-55 bytes payload | 0xc0-0xf7 | prefix + items |
| List 56+ bytes payload | 0xf8-0xff | prefix + len + items |

---

## 4. Decoding Rules

### 4.1 Prefix Interpretation

```
if byte < 0x80:
    # Single byte (self-representing)
    value = byte

elif byte < 0xb8:
    # Short string
    length = byte - 0x80
    value = next `length` bytes

elif byte < 0xc0:
    # Long string
    len_of_len = byte - 0xb7
    length = big_endian(next `len_of_len` bytes)
    value = next `length` bytes

elif byte < 0xf8:
    # Short list
    total_length = byte - 0xc0
    items = decode_items(next `total_length` bytes)

else:
    # Long list
    len_of_len = byte - 0xf7
    total_length = big_endian(next `len_of_len` bytes)
    items = decode_items(next `total_length` bytes)
```

### 4.2 Canonical Encoding Rules

Valid RLP must follow these rules (invalid encodings are rejected):

1. **No leading zeros in length**: Length must be minimal
2. **Single byte rule**: Bytes 0x00-0x7f must not use 0x81 prefix
3. **Minimal length encoding**: Use shortest possible form
4. **Empty string**: Must be 0x80, not 0x00

---

## 5. Integer Encoding

Integers are encoded as byte strings with no leading zeros.

### 5.1 Rules

```
RLP(0) = 0x80           # Zero is empty string
RLP(1) = 0x01           # Single byte
RLP(127) = 0x7f         # Single byte
RLP(128) = 0x8180       # 0x81 prefix + 0x80
RLP(256) = 0x820100     # 0x82 prefix + big-endian(256)
RLP(1024) = 0x820400    # 0x82 prefix + big-endian(1024)
```

### 5.2 Big Integer

For integers > 55 bytes (extremely large):

```
RLP(2²⁵⁶ - 1) = 0xa0 ++ 0xff×32  # 32-byte max uint256
```

---

## 6. Common Ethereum Structures

### 6.1 Account State

```
accountRLP = RLP([nonce, balance, storageRoot, codeHash])

Where:
  nonce:       uint64 (big-endian, no leading zeros)
  balance:     uint256 (big-endian, no leading zeros)
  storageRoot: bytes32 (32 bytes)
  codeHash:    bytes32 (32 bytes)
```

### 6.2 Transaction (Type 0 - Legacy)

```
txRLP = RLP([nonce, gasPrice, gasLimit, to, value, data, v, r, s])

Where:
  nonce:    uint64
  gasPrice: uint256
  gasLimit: uint64
  to:       address (20 bytes) or empty for creation
  value:    uint256
  data:     bytes
  v, r, s:  signature components
```

### 6.3 Transaction (Type 2 - EIP-1559)

```
txRLP = 0x02 ++ RLP([
    chainId,
    nonce,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasLimit,
    to,
    value,
    data,
    accessList,      # [[address, [storageKeys]], ...]
    signatureYParity,
    signatureR,
    signatureS
])

Note: Type prefix (0x02) is NOT RLP-encoded
```

### 6.4 Block Header

```
headerRLP = RLP([
    parentHash,      # bytes32
    unclesHash,      # bytes32 (ommersHash)
    coinbase,        # address
    stateRoot,       # bytes32
    transactionsRoot,# bytes32
    receiptsRoot,    # bytes32
    logsBloom,       # bytes256
    difficulty,      # uint256 (0 post-merge)
    number,          # uint64
    gasLimit,        # uint64
    gasUsed,         # uint64
    timestamp,       # uint64
    extraData,       # bytes (max 32)
    mixHash,         # bytes32 (prevRandao post-merge)
    nonce,           # bytes8 (0 post-merge)
    # Post-London:
    baseFeePerGas,   # uint256
    # Post-Shanghai:
    withdrawalsRoot, # bytes32
    # Post-Cancun:
    blobGasUsed,     # uint64
    excessBlobGas,   # uint64
    parentBeaconBlockRoot # bytes32
])
```

### 6.5 Trie Node

See StateTrieFormalization.md for trie node encoding.

---

## 7. Implementation Examples

### 7.1 Encoding in Go (go-ethereum)

```go
import "github.com/ethereum/go-ethereum/rlp"

// Encode a structure
type Account struct {
    Nonce       uint64
    Balance     *big.Int
    StorageRoot common.Hash
    CodeHash    common.Hash
}

encoded, err := rlp.EncodeToBytes(&account)

// Decode
var decoded Account
err := rlp.DecodeBytes(encoded, &decoded)
```

### 7.2 Encoding in TypeScript

```typescript
import { RLP } from '@ethereumjs/rlp';

// Encode
const encoded = RLP.encode(['cat', 'dog']);
// Result: 0xc88363617483646f67

// Decode
const decoded = RLP.decode(encoded);
// Result: [Buffer<636174>, Buffer<646f67>]
```

---

## 8. go-ethereum Implementation

### 8.1 Key Files

| File | Purpose |
|------|---------|
| `rlp/encode.go` | Encoding functions |
| `rlp/decode.go` | Decoding functions |
| `rlp/raw.go` | Raw (uninterpreted) RLP handling |
| `rlp/encbuffer.go` | Efficient encoding buffer |
| `rlp/iterator.go` | List iteration |

### 8.2 Core Types

```go
// rlp/raw.go
type RawValue []byte  // Undecoded RLP bytes

// rlp/decode.go
type Stream struct {
    r     io.Reader
    buf   [32]byte    // Scratch buffer
    stack []listpos   // Nested list tracking
}

// rlp/encode.go
type Encoder interface {
    EncodeRLP(io.Writer) error
}
```

### 8.3 Encoding Flow

```
rlp.EncodeToBytes(val)
    → makeWriter().encode(val)
        → For each type:
            - bool: encode(0x01 or 0x80)
            - uint: encodeUint
            - []byte: encodeString
            - struct: encodeStruct (fields in order)
            - slice: encodeList
```

---

## 9. Security Considerations

### 9.1 Canonical Encoding

Non-canonical encoding can cause:
- Different hashes for equivalent data
- Consensus failures between clients
- Signature verification issues

Always use canonical form:
- No leading zeros in lengths
- Minimal byte representation
- Strict prefix rules

### 9.2 Size Limits

Be aware of maximum sizes:
- Max theoretical RLP: 2⁶⁴ bytes (length field limit)
- Practical limits: Transaction size, block gas limit

### 9.3 Denial of Service

Malicious RLP can cause:
- Stack overflow (deeply nested lists)
- Memory exhaustion (claimed large lengths)
- CPU exhaustion (decoding overhead)

Clients implement depth and size limits.

---

## 10. Examples Gallery

### 10.1 Scalars

| Value | RLP Encoding |
|-------|--------------|
| 0 | `0x80` |
| 1 | `0x01` |
| 127 | `0x7f` |
| 128 | `0x8180` |
| 255 | `0x81ff` |
| 256 | `0x820100` |
| 1024 | `0x820400` |
| 2²⁴ | `0x83010000` |

### 10.2 Strings

| Value | RLP Encoding |
|-------|--------------|
| "" | `0x80` |
| "a" | `0x61` |
| "abc" | `0x83616263` |
| "Lorem ipsum..." (56 bytes) | `0xb838...` |

### 10.3 Lists

| Value | RLP Encoding |
|-------|--------------|
| [] | `0xc0` |
| [""] | `0xc180` |
| ["cat", "dog"] | `0xc88363617483646f67` |
| [[]] | `0xc1c0` |
| [[], [[]], [[], [[]]]] | `0xc7c0c1c0c3c0c1c0` |

### 10.4 Real-World

```
# Empty account
RLP([0, 0, emptyRoot, emptyCodeHash])
= 0xf8448080a0...a0...

# ETH transfer transaction
RLP([nonce=1, gasPrice=20gwei, gas=21000, to=0x..., value=1eth, data=0x])
= 0xf86c0185...
```
