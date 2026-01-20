#!/usr/bin/env bun
/**
 * ExploreGeth - Navigate go-ethereum codebase
 *
 * Usage:
 *   bun run ExploreGeth.ts --search "opCall"
 *   bun run ExploreGeth.ts --package vm --list-functions
 *   bun run ExploreGeth.ts --function "StateDB.GetState" --show-implementation
 *   bun run ExploreGeth.ts --type "EVM" --show-definition
 */

import { parseArgs } from "util";
import {
  getGethPath,
  isGethAvailable,
  CORE_PACKAGES,
  getPackagePath,
  getRelevantPackages,
} from "./lib/geth-paths";
import {
  functionDefPattern,
  methodDefPattern,
  typeDefPattern,
  functionCallPattern,
} from "./lib/go-ast";

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

/**
 * Run ripgrep using the conductor-provided binary
 */
async function runRg(args: string): Promise<string> {
  // In conductor environment, rg is aliased through claude binary
  const claudePath = `${process.env.HOME}/Library/Application Support/com.conductor.app/bin/claude`;
  const cmd = `"${claudePath}" --ripgrep ${args}`;

  const proc = Bun.spawn(["bash", "-c", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(proc.stdout).text();
  await proc.exited;
  return output;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      search: { type: "string", short: "s" },
      package: { type: "string", short: "p" },
      function: { type: "string", short: "f" },
      type: { type: "string", short: "t" },
      "list-functions": { type: "boolean" },
      "show-implementation": { type: "boolean" },
      "show-definition": { type: "boolean" },
      callers: { type: "boolean" },
      context: { type: "string", default: "10" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (!isGethAvailable()) {
    console.error("Error: go-ethereum not found at", getGethPath());
    console.error("Clone it first or set GETH_PATH environment variable");
    process.exit(1);
  }

  const gethPath = getGethPath();

  // Handle different commands
  if (values.search) {
    await searchCode(values.search, gethPath);
  } else if (values.package && values["list-functions"]) {
    await listPackageFunctions(values.package, gethPath);
  } else if (values.function) {
    if (values.callers) {
      await findCallers(values.function, gethPath);
    } else if (values["show-implementation"]) {
      await showImplementation(
        values.function,
        gethPath,
        parseInt(values.context || "30")
      );
    } else {
      await findFunctionDefinition(values.function, gethPath);
    }
  } else if (values.type) {
    if (values["show-definition"]) {
      await showTypeDefinition(
        values.type,
        gethPath,
        parseInt(values.context || "50")
      );
    } else {
      await findTypeDefinition(values.type, gethPath);
    }
  } else {
    printHelp();
  }
}

function printHelp() {
  console.log(`
ExploreGeth - Navigate go-ethereum codebase

USAGE:
  bun run ExploreGeth.ts [OPTIONS]

OPTIONS:
  -s, --search <pattern>        Search for a pattern in the codebase
  -p, --package <name>          Specify a package (vm, state, trie, etc.)
  -f, --function <name>         Search for a function
  -t, --type <name>             Search for a type definition
  --list-functions              List all functions in a package
  --show-implementation         Show function implementation with context
  --show-definition             Show type definition with context
  --callers                     Find all callers of a function
  --context <lines>             Context lines for implementation (default: 10)
  -h, --help                    Show this help

EXAMPLES:
  # Search for "opCall" anywhere in codebase
  bun run ExploreGeth.ts --search "opCall"

  # List all functions in core/vm package
  bun run ExploreGeth.ts --package vm --list-functions

  # Find opSstore function definition
  bun run ExploreGeth.ts --function "opSstore"

  # Show opSstore implementation with 50 lines of context
  bun run ExploreGeth.ts --function "opSstore" --show-implementation --context 50

  # Find all callers of SetState
  bun run ExploreGeth.ts --function "SetState" --callers

  # Show StateDB type definition
  bun run ExploreGeth.ts --type "StateDB" --show-definition

PACKAGES:
  vm, state, trie, rlp, blockchain, types, eth, p2p, consensus, beacon
`);
}

async function searchCode(pattern: string, gethPath: string) {
  console.log(`Searching for "${pattern}" in go-ethereum...\n`);

  try {
    const result = await runRg(`--type go -n --color=never "${pattern}" "${gethPath}"`);
    const lines = result.trim().split("\n").filter(Boolean);

    if (lines.length === 0) {
      console.log("No matches found.");
      return;
    }

    console.log(`Found ${lines.length} matches:\n`);

    // Group by file
    const byFile = new Map<string, string[]>();
    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const [, file, lineNum, content] = match;
        const relFile = file.replace(gethPath + "/", "");
        if (!byFile.has(relFile)) {
          byFile.set(relFile, []);
        }
        byFile.get(relFile)!.push(`  ${lineNum}: ${content.trim()}`);
      }
    }

    for (const [file, matches] of byFile) {
      console.log(`${file}:`);
      for (const m of matches.slice(0, 5)) {
        console.log(m);
      }
      if (matches.length > 5) {
        console.log(`  ... and ${matches.length - 5} more`);
      }
      console.log();
    }
  } catch (e) {
    console.log("No matches found.");
  }
}

async function listPackageFunctions(pkgName: string, gethPath: string) {
  // Map short names to paths
  const pkgPath =
    CORE_PACKAGES[pkgName as keyof typeof CORE_PACKAGES] || pkgName;
  const fullPath = `${gethPath}/${pkgPath}`;

  console.log(`Functions in ${pkgPath}:\n`);

  try {
    const result = await runRg(`--type go -o 'func\\s+(?:\\([^)]+\\)\\s+)?(\\w+)\\s*\\(' "${fullPath}"`);

    // Extract function names
    const names = new Set<string>();
    const methods = new Map<string, string[]>(); // receiver -> method names

    for (const line of result.split("\n")) {
      // Match method with receiver
      const methodMatch = line.match(
        /func\s+\((\w+)\s+\*?(\w+)\)\s+(\w+)\s*\(/
      );
      if (methodMatch) {
        const [, , receiver, method] = methodMatch;
        if (!methods.has(receiver)) {
          methods.set(receiver, []);
        }
        methods.get(receiver)!.push(method);
        continue;
      }

      // Match standalone function
      const funcMatch = line.match(/func\s+(\w+)\s*\(/);
      if (funcMatch) {
        names.add(funcMatch[1]);
      }
    }

    // Print standalone functions
    if (names.size > 0) {
      console.log("Standalone functions:");
      for (const name of Array.from(names).sort()) {
        console.log(`  ${name}`);
      }
      console.log();
    }

    // Print methods by type
    if (methods.size > 0) {
      console.log("Methods by type:");
      for (const [type, methodList] of Array.from(methods).sort()) {
        console.log(`  ${type}:`);
        for (const m of methodList.sort()) {
          console.log(`    - ${m}`);
        }
      }
    }
  } catch (e) {
    console.error("Error listing functions:", e);
  }
}

async function findFunctionDefinition(funcName: string, gethPath: string) {
  // Check if it's a method (Type.Method)
  const parts = funcName.split(".");
  let pattern: string;

  if (parts.length === 2) {
    pattern = methodDefPattern(parts[0], parts[1]);
    console.log(`Searching for method ${parts[0]}.${parts[1]}...\n`);
  } else {
    pattern = functionDefPattern(funcName);
    console.log(`Searching for function ${funcName}...\n`);
  }

  try {
    const result = await runRg(`--type go -n --color=never '${pattern}' "${gethPath}"`);
    const lines = result.trim().split("\n").filter(Boolean);

    if (lines.length === 0) {
      console.log("No definitions found.");
      return;
    }

    console.log(`Found ${lines.length} definition(s):\n`);

    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const [, file, lineNum, content] = match;
        const relFile = file.replace(gethPath + "/", "");
        console.log(`${relFile}:${lineNum}`);
        console.log(`  ${content.trim()}\n`);
      }
    }
  } catch (e) {
    console.log("No definitions found.");
  }
}

async function showImplementation(
  funcName: string,
  gethPath: string,
  contextLines: number
) {
  const parts = funcName.split(".");
  let pattern: string;

  if (parts.length === 2) {
    pattern = methodDefPattern(parts[0], parts[1]);
  } else {
    pattern = functionDefPattern(funcName);
  }

  console.log(`Implementation of ${funcName}:\n`);

  try {
    const result = await runRg(`--type go -A ${contextLines} --color=never '${pattern}' "${gethPath}"`);

    if (!result.trim()) {
      console.log("No implementation found.");
      return;
    }

    // Format output
    const sections = result.split("--\n");
    for (const section of sections) {
      if (!section.trim()) continue;

      const lines = section.trim().split("\n");
      const firstLine = lines[0];
      const match = firstLine.match(/^([^:]+):(\d+)[:-](.*)$/);

      if (match) {
        const [, file, lineNum] = match;
        const relFile = file.replace(gethPath + "/", "");
        console.log(`// ${relFile}:${lineNum}`);
        console.log("// " + "=".repeat(60));

        for (const line of lines) {
          const contentMatch = line.match(/^[^:]+:\d+[:-](.*)$/);
          if (contentMatch) {
            console.log(contentMatch[1]);
          }
        }
        console.log();
      }
    }
  } catch (e) {
    console.log("No implementation found.");
  }
}

async function findTypeDefinition(typeName: string, gethPath: string) {
  const pattern = typeDefPattern(typeName);
  console.log(`Searching for type ${typeName}...\n`);

  try {
    const result = await runRg(`--type go -n --color=never '${pattern}' "${gethPath}"`);
    const lines = result.trim().split("\n").filter(Boolean);

    if (lines.length === 0) {
      console.log("No type definitions found.");
      return;
    }

    console.log(`Found ${lines.length} definition(s):\n`);

    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const [, file, lineNum, content] = match;
        const relFile = file.replace(gethPath + "/", "");
        console.log(`${relFile}:${lineNum}`);
        console.log(`  ${content.trim()}\n`);
      }
    }
  } catch (e) {
    console.log("No type definitions found.");
  }
}

async function showTypeDefinition(
  typeName: string,
  gethPath: string,
  contextLines: number
) {
  const pattern = typeDefPattern(typeName);
  console.log(`Definition of ${typeName}:\n`);

  try {
    const result = await runRg(`--type go -A ${contextLines} --color=never '${pattern}' "${gethPath}"`);

    if (!result.trim()) {
      console.log("No definition found.");
      return;
    }

    const sections = result.split("--\n");
    for (const section of sections) {
      if (!section.trim()) continue;

      const lines = section.trim().split("\n");
      const firstLine = lines[0];
      const match = firstLine.match(/^([^:]+):(\d+)[:-](.*)$/);

      if (match) {
        const [, file, lineNum] = match;
        const relFile = file.replace(gethPath + "/", "");
        console.log(`// ${relFile}:${lineNum}`);
        console.log("// " + "=".repeat(60));

        for (const line of lines) {
          const contentMatch = line.match(/^[^:]+:\d+[:-](.*)$/);
          if (contentMatch) {
            console.log(contentMatch[1]);
          }
        }
        console.log();
      }
    }
  } catch (e) {
    console.log("No definition found.");
  }
}

async function findCallers(funcName: string, gethPath: string) {
  const pattern = functionCallPattern(funcName);
  console.log(`Finding callers of ${funcName}...\n`);

  try {
    const result = await runRg(`--type go -n --color=never '${pattern}' "${gethPath}"`);
    const lines = result.trim().split("\n").filter(Boolean);

    if (lines.length === 0) {
      console.log("No callers found.");
      return;
    }

    // Group by file
    const byFile = new Map<string, string[]>();
    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const [, file, lineNum, content] = match;
        const relFile = file.replace(gethPath + "/", "");
        if (!byFile.has(relFile)) {
          byFile.set(relFile, []);
        }
        byFile.get(relFile)!.push(`  ${lineNum}: ${content.trim()}`);
      }
    }

    console.log(`Found ${lines.length} call sites in ${byFile.size} files:\n`);

    for (const [file, calls] of Array.from(byFile).sort()) {
      console.log(`${file}:`);
      for (const call of calls.slice(0, 10)) {
        console.log(call);
      }
      if (calls.length > 10) {
        console.log(`  ... and ${calls.length - 10} more`);
      }
      console.log();
    }
  } catch (e) {
    console.log("No callers found.");
  }
}

main().catch(console.error);
