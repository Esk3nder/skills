#!/usr/bin/env bun
/**
 * DecodeOpcode - Decode EVM opcodes with Yellow Paper-level detail
 *
 * Usage:
 *   bun run DecodeOpcode.ts --opcode 0x55
 *   bun run DecodeOpcode.ts --name SSTORE
 *   bun run DecodeOpcode.ts --category storage
 *   bun run DecodeOpcode.ts --bytecode "6001600055"
 *   bun run DecodeOpcode.ts --list
 */

import { parseArgs } from "util";
import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { join, dirname } from "path";

interface OpcodeInfo {
  opcode: number;
  name: string;
  gas: number | string | object;
  gas_formula?: string;
  gas_schedule?: Record<string, number>;
  stack_in: number;
  stack_out: number;
  description: string;
  formula?: string;
  inputs?: string;
  output?: string;
  note?: string;
  eip?: number;
  geth_func?: string;
  immediate_bytes?: number;
  category?: string;
}

interface OpcodeData {
  version: string;
  constants: Record<string, number>;
  categories: Record<string, { description: string; opcodes: OpcodeInfo[] }>;
  precompiles: Array<{
    address: string;
    name: string;
    gas: number | string;
    gas_formula?: string;
    description: string;
    eip?: number;
  }>;
}

function loadOpcodes(): Map<number, OpcodeInfo> {
  const scriptDir = dirname(import.meta.path);
  const yamlPath = join(scriptDir, "..", "Data", "Opcodes.yaml");
  const content = readFileSync(yamlPath, "utf-8");
  const data = parseYaml(content) as OpcodeData;

  const opcodeMap = new Map<number, OpcodeInfo>();
  for (const [categoryName, category] of Object.entries(data.categories)) {
    for (const op of category.opcodes) {
      opcodeMap.set(op.opcode, { ...op, category: categoryName });
    }
  }
  return opcodeMap;
}

function loadOpcodesByName(): Map<string, OpcodeInfo> {
  const byCode = loadOpcodes();
  const byName = new Map<string, OpcodeInfo>();
  for (const op of byCode.values()) {
    byName.set(op.name.toUpperCase(), op);
  }
  return byName;
}

function loadCategories(): Map<
  string,
  { description: string; opcodes: OpcodeInfo[] }
> {
  const scriptDir = dirname(import.meta.path);
  const yamlPath = join(scriptDir, "..", "Data", "Opcodes.yaml");
  const content = readFileSync(yamlPath, "utf-8");
  const data = parseYaml(content) as OpcodeData;

  const categories = new Map<
    string,
    { description: string; opcodes: OpcodeInfo[] }
  >();
  for (const [name, category] of Object.entries(data.categories)) {
    categories.set(name, category);
  }
  return categories;
}

function formatOpcodeDetail(info: OpcodeInfo): string {
  const hex = info.opcode.toString(16).padStart(2, "0").toUpperCase();

  let output = `
OPCODE: ${info.name} (0x${hex})
${"=".repeat(60)}

Description: ${info.description}
Category: ${info.category || "unknown"}
Stack: ${info.stack_in} input(s) -> ${info.stack_out} output(s)
`;

  // Gas cost section
  output += "\nGas Cost:\n";
  if (typeof info.gas === "number") {
    output += `  Fixed: ${info.gas} gas\n`;
  } else if (info.gas_formula) {
    output += `  Formula: ${info.gas_formula}\n`;
  } else if (info.gas_schedule) {
    output += "  Variable (see schedule):\n";
    for (const [scenario, cost] of Object.entries(info.gas_schedule)) {
      output += `    ${scenario}: ${cost} gas\n`;
    }
  } else if (typeof info.gas === "object") {
    output += "  Access-dependent:\n";
    for (const [scenario, cost] of Object.entries(info.gas)) {
      output += `    ${scenario}: ${cost} gas\n`;
    }
  } else if (typeof info.gas === "string") {
    output += `  Special: ${info.gas}\n`;
  }

  // Inputs/outputs
  if (info.inputs) {
    output += `\nInputs: ${info.inputs}\n`;
  }
  if (info.output) {
    output += `Output: ${info.output}\n`;
  }

  // Semantic formula
  if (info.formula) {
    output += `\nSemantics: ${info.formula}\n`;
  }

  // Immediate bytes (for PUSH)
  if (info.immediate_bytes) {
    output += `\nImmediate Data: ${info.immediate_bytes} byte(s) following opcode\n`;
  }

  // Notes and references
  if (info.note) {
    output += `\nNote: ${info.note}\n`;
  }
  if (info.eip) {
    output += `\nRelevant EIP: EIP-${info.eip}\n`;
  }
  if (info.geth_func) {
    output += `\ngo-ethereum: ${info.geth_func} (core/vm/instructions.go)\n`;
  }

  return output;
}

function decodeBytecode(hex: string): void {
  const bytes = Buffer.from(hex.replace("0x", ""), "hex");
  const opcodes = loadOpcodes();

  console.log("Bytecode Disassembly:");
  console.log("=".repeat(60));
  console.log();

  let pc = 0;
  while (pc < bytes.length) {
    const opcode = bytes[pc];
    const info = opcodes.get(opcode);
    const hexOp = opcode.toString(16).padStart(2, "0").toUpperCase();

    if (info) {
      let line = `${pc.toString().padStart(4, "0")}  0x${hexOp}  ${info.name.padEnd(16)}`;

      // Handle PUSH opcodes (0x60-0x7f)
      if (opcode >= 0x60 && opcode <= 0x7f) {
        const pushSize = opcode - 0x5f;
        const immediateBytes = bytes.slice(pc + 1, pc + 1 + pushSize);
        const hexValue = immediateBytes.toString("hex").toUpperCase();
        line += ` 0x${hexValue}`;
        pc += pushSize;
      }

      console.log(line);
    } else {
      console.log(
        `${pc.toString().padStart(4, "0")}  0x${hexOp}  INVALID`
      );
    }

    pc++;
  }

  console.log();
  console.log(`Total: ${bytes.length} bytes`);
}

function listOpcodes(): void {
  const categories = loadCategories();

  console.log("EVM Opcode Reference (Cancun)");
  console.log("=".repeat(60));
  console.log();

  for (const [name, category] of categories) {
    console.log(`${name.toUpperCase()}`);
    console.log(`  ${category.description}`);
    console.log();

    for (const op of category.opcodes) {
      const hex = op.opcode.toString(16).padStart(2, "0").toUpperCase();
      const gasStr =
        typeof op.gas === "number" ? op.gas.toString() : "variable";
      console.log(
        `  0x${hex}  ${op.name.padEnd(16)}  ${gasStr.padStart(8)} gas  ${op.description.slice(0, 40)}`
      );
    }
    console.log();
  }
}

function showCategory(categoryName: string): void {
  const categories = loadCategories();
  const category = categories.get(categoryName);

  if (!category) {
    // Try to find by partial match
    for (const [name, cat] of categories) {
      if (name.toLowerCase().includes(categoryName.toLowerCase())) {
        console.log(`Category: ${name}`);
        console.log(cat.description);
        console.log();

        for (const op of cat.opcodes) {
          console.log(formatOpcodeDetail(op));
        }
        return;
      }
    }
    console.error(`Category not found: ${categoryName}`);
    console.error("Available categories:", Array.from(categories.keys()).join(", "));
    return;
  }

  console.log(`Category: ${categoryName}`);
  console.log(category.description);
  console.log();

  for (const op of category.opcodes) {
    console.log(formatOpcodeDetail(op));
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      opcode: { type: "string", short: "o" },
      name: { type: "string", short: "n" },
      category: { type: "string", short: "c" },
      bytecode: { type: "string", short: "b" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
DecodeOpcode - EVM opcode reference with Yellow Paper detail

USAGE:
  bun run DecodeOpcode.ts [OPTIONS]

OPTIONS:
  -o, --opcode <hex>      Decode opcode by hex value (e.g., 0x55 or 55)
  -n, --name <name>       Look up opcode by name (e.g., SSTORE)
  -c, --category <name>   Show all opcodes in a category
  -b, --bytecode <hex>    Disassemble bytecode
  -l, --list              List all opcodes
  -h, --help              Show this help

EXAMPLES:
  # Look up SSTORE opcode
  bun run DecodeOpcode.ts --name SSTORE

  # Look up by hex value
  bun run DecodeOpcode.ts --opcode 0x55

  # Show all storage-related opcodes
  bun run DecodeOpcode.ts --category storage

  # Disassemble bytecode
  bun run DecodeOpcode.ts --bytecode "6001600055"

  # List all opcodes
  bun run DecodeOpcode.ts --list

CATEGORIES:
  stop_arithmetic, comparison_bitwise, keccak256, environmental,
  block_info, stack_memory_storage, push, dup, swap, log, system
`);
    return;
  }

  if (values.list) {
    listOpcodes();
    return;
  }

  if (values.bytecode) {
    decodeBytecode(values.bytecode);
    return;
  }

  if (values.category) {
    showCategory(values.category);
    return;
  }

  if (values.opcode) {
    const opcodes = loadOpcodes();
    const code = parseInt(values.opcode, 16);
    const info = opcodes.get(code);

    if (info) {
      console.log(formatOpcodeDetail(info));
    } else {
      console.error(`Unknown opcode: ${values.opcode}`);
    }
    return;
  }

  if (values.name) {
    const byName = loadOpcodesByName();
    const info = byName.get(values.name.toUpperCase());

    if (info) {
      console.log(formatOpcodeDetail(info));
    } else {
      console.error(`Unknown opcode: ${values.name}`);
      console.error("Try --list to see all opcodes");
    }
    return;
  }

  // Default: show help
  console.log("Use --help for usage information");
}

main().catch(console.error);
