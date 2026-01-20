/**
 * go-ethereum path constants and utilities
 */

import { join, dirname } from "path";
import { existsSync } from "fs";

// Default path is relative to this skill
const SKILL_DIR = dirname(dirname(dirname(import.meta.path)));
const DEFAULT_GETH_PATH = join(SKILL_DIR, "codebase", "go-ethereum");

/**
 * Get the go-ethereum source path
 */
export function getGethPath(): string {
  return process.env.GETH_PATH || DEFAULT_GETH_PATH;
}

/**
 * Check if go-ethereum is available
 */
export function isGethAvailable(): boolean {
  return existsSync(getGethPath());
}

/**
 * Core package paths in go-ethereum
 */
export const CORE_PACKAGES = {
  // EVM
  vm: "core/vm",
  instructions: "core/vm/instructions.go",
  interpreter: "core/vm/interpreter.go",
  evm: "core/vm/evm.go",
  jumpTable: "core/vm/jump_table.go",
  gasTable: "core/vm/gas_table.go",

  // State
  state: "core/state",
  statedb: "core/state/statedb.go",
  stateObject: "core/state/state_object.go",

  // Blockchain
  blockchain: "core/blockchain.go",
  stateProcessor: "core/state_processor.go",
  stateTransition: "core/state_transition.go",

  // Trie
  trie: "trie",
  trieNode: "trie/node.go",
  trieMain: "trie/trie.go",
  trieHasher: "trie/hasher.go",

  // RLP
  rlp: "rlp",
  rlpEncode: "rlp/encode.go",
  rlpDecode: "rlp/decode.go",

  // Consensus
  consensus: "consensus",
  beacon: "consensus/beacon",

  // Networking
  eth: "eth",
  p2p: "p2p",

  // RPC
  rpc: "rpc",
  ethApi: "eth/api_backend.go",

  // Types
  types: "core/types",
  block: "core/types/block.go",
  transaction: "core/types/transaction.go",

  // Crypto
  crypto: "crypto",
} as const;

/**
 * Get full path for a package
 */
export function getPackagePath(pkg: keyof typeof CORE_PACKAGES): string {
  return join(getGethPath(), CORE_PACKAGES[pkg]);
}

/**
 * Known entry points for common operations
 */
export const ENTRY_POINTS = {
  transactionExecution: [
    "eth/api_backend.go:SendTx",
    "core/tx_pool.go:Add",
    "core/state_processor.go:Process",
    "core/state_transition.go:TransitionDb",
    "core/vm/evm.go:Call",
  ],
  blockImport: [
    "eth/handler.go:handleBlockBroadcast",
    "core/blockchain.go:InsertChain",
    "core/state_processor.go:Process",
  ],
  stateAccess: [
    "core/state/statedb.go:GetState",
    "core/state/state_object.go:GetState",
    "trie/trie.go:Get",
  ],
  storageWrite: [
    "core/vm/instructions.go:opSstore",
    "core/state/statedb.go:SetState",
    "core/state/state_object.go:SetState",
  ],
  contractCreation: [
    "core/vm/evm.go:Create",
    "core/vm/evm.go:create",
    "core/state/statedb.go:CreateAccount",
  ],
} as const;

/**
 * Map concept to relevant packages
 */
export function getRelevantPackages(concept: string): string[] {
  const lowerConcept = concept.toLowerCase();

  if (lowerConcept.includes("evm") || lowerConcept.includes("opcode")) {
    return ["vm", "instructions", "interpreter", "jumpTable", "gasTable"];
  }

  if (lowerConcept.includes("state") || lowerConcept.includes("storage")) {
    return ["state", "statedb", "stateObject"];
  }

  if (lowerConcept.includes("trie") || lowerConcept.includes("merkle")) {
    return ["trie", "trieNode", "trieMain", "trieHasher"];
  }

  if (lowerConcept.includes("rlp") || lowerConcept.includes("encoding")) {
    return ["rlp", "rlpEncode", "rlpDecode"];
  }

  if (lowerConcept.includes("block") || lowerConcept.includes("chain")) {
    return ["blockchain", "stateProcessor", "types", "block"];
  }

  if (lowerConcept.includes("transaction") || lowerConcept.includes("tx")) {
    return ["stateTransition", "types", "transaction"];
  }

  if (lowerConcept.includes("consensus") || lowerConcept.includes("pos")) {
    return ["consensus", "beacon"];
  }

  if (lowerConcept.includes("network") || lowerConcept.includes("p2p")) {
    return ["eth", "p2p"];
  }

  // Default: return core packages
  return ["vm", "state", "blockchain"];
}
