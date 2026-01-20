# State Trie Formalization

The Modified Merkle Patricia Trie (MPT) is the core data structure for storing Ethereum state.

**Reference:** Ethereum Yellow Paper, Appendix D

---

## 1. Overview

Ethereum uses MPT for four distinct tries:

| Trie | Key | Value | Root Stored In |
|------|-----|-------|----------------|
| State Trie | keccak256(address) | RLP(account) | Block header |
| Storage Trie | keccak256(slot) | RLP(value) | Account storageRoot |
| Transactions Trie | RLP(index) | RLP(transaction) | Block header |
| Receipts Trie | RLP(index) | RLP(receipt) | Block header |

### 1.1 Key Properties

1. **Deterministic**: Same key-value pairs always produce same root hash
2. **Authenticated**: Root hash cryptographically commits to all data
3. **Efficient proofs**: O(log n) proof size for membership
4. **Space-efficient**: Shared prefixes reduce storage

---

## 2. Trie Structure

### 2.1 Node Types

The MPT has four node types:

```
Node = EmptyNode
     | LeafNode(encodedPath, value)
     | ExtensionNode(encodedPath, child)
     | BranchNode(children[16], value)
```

#### 2.1.1 Empty Node

Represents an empty trie. Hash = keccak256(RLP(""))

```
EMPTY_ROOT = keccak256(0x80) = 0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421
```

#### 2.1.2 Leaf Node

Stores a key-value pair at the end of a path.

```
LeafNode = [HP(remainingPath, terminated=true), RLP(value)]

Structure:
  - encodedPath: Hex-prefix encoded remaining key nibbles
  - value: RLP-encoded stored value
```

#### 2.1.3 Extension Node

Compresses shared path prefixes.

```
ExtensionNode = [HP(sharedPath, terminated=false), childHash]

Structure:
  - encodedPath: Hex-prefix encoded shared nibbles
  - child: Hash or inline RLP of child node
```

#### 2.1.4 Branch Node

Represents a 16-way fork (one per hex nibble).

```
BranchNode = [child₀, child₁, ..., child₁₅, value]

Structure:
  - children[0-15]: Hash or inline RLP of children (one per nibble)
  - value: Optional value if a key terminates here
```

---

## 3. Hex-Prefix (HP) Encoding

HP encoding compactly represents nibble sequences with termination flag.

### 3.1 Definition

```
HP(nibbles, t) where t ∈ {0, 1}

Flag = 2*t + (len(nibbles) mod 2)

If odd length:
    result = [Flag] ++ nibbles

If even length:
    result = [Flag, 0] ++ nibbles
```

### 3.2 Flag Values

| Terminator | Length | First Nibble |
|------------|--------|--------------|
| No (extension) | Even | 0 |
| No (extension) | Odd | 1 |
| Yes (leaf) | Even | 2 |
| Yes (leaf) | Odd | 3 |

### 3.3 Examples

```
HP([1,2,3,4,5], false) = [0x11, 0x23, 0x45]     # Extension, odd
HP([1,2,3,4], false)   = [0x00, 0x12, 0x34]     # Extension, even
HP([1,2,3,4,5], true)  = [0x31, 0x23, 0x45]     # Leaf, odd
HP([1,2,3,4], true)    = [0x20, 0x12, 0x34]     # Leaf, even
```

---

## 4. Node Encoding

### 4.1 RLP Encoding

Each node is RLP-encoded:

```
encode(EmptyNode) = ""
encode(LeafNode) = RLP([HP(path, true), value])
encode(ExtensionNode) = RLP([HP(path, false), child])
encode(BranchNode) = RLP([c₀, c₁, ..., c₁₅, value])
```

### 4.2 Child References

Children are referenced by:
- **Hash**: keccak256(RLP(child)) if RLP(child) >= 32 bytes
- **Inline**: RLP(child) directly if RLP(child) < 32 bytes

```
childRef(node) =
    let encoded = RLP(node)
    if len(encoded) < 32:
        return encoded
    else:
        return keccak256(encoded)
```

### 4.3 Root Hash

```
rootHash(trie) =
    if trie is empty:
        return keccak256(0x80)
    else:
        return keccak256(RLP(rootNode))
```

---

## 5. Trie Operations

### 5.1 Lookup (GET)

```python
def get(node, key):
    if node is EmptyNode:
        return None

    if node is LeafNode:
        if node.path == key:
            return node.value
        return None

    if node is ExtensionNode:
        if key.startswith(node.path):
            return get(resolve(node.child), key[len(node.path):])
        return None

    if node is BranchNode:
        if len(key) == 0:
            return node.value
        return get(resolve(node.children[key[0]]), key[1:])
```

### 5.2 Insert/Update (PUT)

```python
def put(node, key, value):
    if node is EmptyNode:
        return LeafNode(key, value)

    if node is LeafNode:
        shared = common_prefix(node.path, key)
        if shared == node.path == key:
            # Update existing
            return LeafNode(key, value)
        # Split into branch
        return create_branch(node, key, value, shared)

    if node is ExtensionNode:
        shared = common_prefix(node.path, key)
        if shared == node.path:
            # Descend
            newChild = put(resolve(node.child), key[len(shared):], value)
            return ExtensionNode(shared, ref(newChild))
        # Split extension
        return split_extension(node, key, value, shared)

    if node is BranchNode:
        if len(key) == 0:
            return BranchNode(node.children, value)
        idx = key[0]
        newChild = put(resolve(node.children[idx]), key[1:], value)
        children = node.children.copy()
        children[idx] = ref(newChild)
        return BranchNode(children, node.value)
```

### 5.3 Delete

```python
def delete(node, key):
    # Similar structure to put
    # Returns modified trie or EmptyNode
    # May collapse extension/branch nodes
```

---

## 6. World State Trie

### 6.1 Key Derivation

```
key = keccak256(address)    # 32 bytes = 64 nibbles

Example:
  address = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  key = keccak256(address) = 0x...  (64 hex nibbles)
```

### 6.2 Value Structure

```
accountState = RLP([nonce, balance, storageRoot, codeHash])

Where:
  nonce:       uint64, transaction count
  balance:     uint256, wei balance
  storageRoot: bytes32, root of storage trie
  codeHash:    bytes32, keccak256(code)

For EOA (no code):
  storageRoot = EMPTY_ROOT
  codeHash = keccak256("")
```

---

## 7. Storage Trie

Each contract has its own storage trie.

### 7.1 Key Derivation

```
key = keccak256(slot)       # 32 bytes = 64 nibbles

Where slot is left-padded to 32 bytes:
  slot 0 → keccak256(0x0000...0000)
  slot 1 → keccak256(0x0000...0001)
```

### 7.2 Value Structure

```
value = RLP(storageValue)   # uint256, RLP-encoded with leading zeros stripped
```

### 7.3 Slot Calculation for Complex Types

```
# Simple variable at slot N
key = keccak256(N)

# Array element at slot N, index I
key = keccak256(keccak256(N) + I)

# Mapping at slot N, key K
key = keccak256(K ++ N)     # K and N both padded to 32 bytes
```

---

## 8. Merkle Proofs

### 8.1 Proof Structure

A Merkle proof consists of:
1. The path from root to target
2. All sibling hashes needed to verify

```
Proof = [node₀, node₁, ..., nodeₙ]

Where each node is the RLP-encoded node on the path.
```

### 8.2 Verification

```python
def verify_proof(root_hash, key, value, proof):
    expected_hash = root_hash
    remaining_key = to_nibbles(key)

    for node_rlp in proof:
        if keccak256(node_rlp) != expected_hash:
            return False

        node = decode(node_rlp)

        if node is LeafNode:
            if node.path == remaining_key:
                return node.value == value
            return False

        if node is ExtensionNode:
            if not remaining_key.startswith(node.path):
                return False
            remaining_key = remaining_key[len(node.path):]
            expected_hash = node.child

        if node is BranchNode:
            if len(remaining_key) == 0:
                return node.value == value
            expected_hash = node.children[remaining_key[0]]
            remaining_key = remaining_key[1:]

    return False
```

### 8.3 Proof of Non-Existence

To prove a key doesn't exist:
- Provide proof to the point where path diverges
- Divergence can be: wrong nibble in branch, wrong prefix in extension/leaf

---

## 9. go-ethereum Implementation

### 9.1 Key Files

| File | Purpose |
|------|---------|
| `trie/trie.go` | Main trie interface |
| `trie/node.go` | Node type definitions |
| `trie/hasher.go` | Trie hashing |
| `trie/encoding.go` | Hex-prefix encoding |
| `trie/proof.go` | Merkle proof generation |
| `trie/committer.go` | Database commits |
| `triedb/database.go` | Trie database interface |

### 9.2 Node Types in Go

```go
// trie/node.go
type (
    fullNode struct {
        Children [17]node     // 16 children + value
        flags    nodeFlag
    }

    shortNode struct {
        Key   []byte          // HP-encoded path
        Val   node            // Child or value
        flags nodeFlag
    }

    hashNode  []byte          // 32-byte hash reference
    valueNode []byte          // Leaf value
)
```

### 9.3 Key Functions

```go
// trie/trie.go

// Get retrieves value by key
func (t *Trie) Get(key []byte) []byte

// Update inserts/updates a key-value pair
func (t *Trie) Update(key, value []byte)

// Delete removes a key
func (t *Trie) Delete(key []byte)

// Hash returns the root hash (without committing)
func (t *Trie) Hash() common.Hash

// Commit writes changes to database and returns root
func (t *Trie) Commit(collectLeaf bool) (common.Hash, *trienode.NodeSet)
```

---

## 10. Performance Considerations

### 10.1 Trie Depth

- Maximum depth: 64 nibbles (256-bit keys after hashing)
- Average depth depends on distribution
- Uniform distribution → log₁₆(n) depth

### 10.2 Proof Size

- Proof size: O(depth × node_size)
- Maximum: ~3KB for state proof
- Each level: ~532 bytes (branch) or ~67 bytes (extension)

### 10.3 Database Access

- Each trie operation requires multiple DB reads
- Caching critical for performance
- go-ethereum uses multiple cache layers:
  - In-memory node cache
  - Database cache (LevelDB/Pebble)

---

## 11. Formal Definitions

### 11.1 Trie Definition

```
TRIE(J) ≡ {
    () if J = ∅
    n(J, 0) otherwise
}

n(J, i) ≡ {
    Leaf(HP(I(J)ᵢ₊, true), v) if |J| = 1 where {I(J) → v} = J
    Extension(HP(I(J)ᵢ:ⱼ, false), n(J, j)) if i ≠ j where j = argmin{x : |{I(J)ᵢ:ₓ}| > 1}
    Branch(u(0), u(1), ..., u(15), v) otherwise
}

where u(j) = n({I : I ∈ J where Iᵢ = j}, i + 1)
      v = J[I(J)ᵢ] if |I(J)ᵢ| = 0 else ∅
```

### 11.2 Node Hash

```
H(x) ≡ {
    x if |RLP(x)| < 32
    KEC(RLP(x)) otherwise
}
```

### 11.3 Root Hash

```
ROOT(J) ≡ KEC(RLP(TRIE(J)))
```

---

## 12. Security Properties

### 12.1 Collision Resistance

The trie inherits collision resistance from Keccak-256:
- Finding two different states with same root is computationally infeasible
- Key hashing (keccak256(address)) provides uniform distribution

### 12.2 Proof Binding

A valid Merkle proof cryptographically binds:
- The root hash
- The key
- The value (or non-existence)

### 12.3 Attack Resistance

- **Grinding attacks**: Mitigated by key hashing
- **Storage attacks**: Gas costs for state writes
- **Proof inflation**: Node size limits
