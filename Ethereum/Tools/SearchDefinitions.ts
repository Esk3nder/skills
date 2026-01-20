#!/usr/bin/env bun
/**
 * SearchDefinitions - Find function, type, and interface definitions in go-ethereum
 *
 * Usage:
 *   bun run SearchDefinitions.ts --function "opSstore"
 *   bun run SearchDefinitions.ts --type "StateDB"
 *   bun run SearchDefinitions.ts --interface "Backend"
 *   bun run SearchDefinitions.ts --method "StateDB.GetState"
 */

import { parseArgs } from "util";
import { $ } from "bun";
import { getGethPath, isGethAvailable } from "./lib/geth-paths";
import {
  functionDefPattern,
  methodDefPattern,
  typeDefPattern,
  interfaceDefPattern,
  structDefPattern,
} from "./lib/go-ast";

interface SearchResult {
  file: string;
  line: number;
  content: string;
  context?: string[];
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      function: { type: "string", short: "f" },
      type: { type: "string", short: "t" },
      interface: { type: "string", short: "i" },
      struct: { type: "string", short: "s" },
      method: { type: "string", short: "m" },
      context: { type: "string", default: "0" },
      json: { type: "boolean" },
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
    process.exit(1);
  }

  const gethPath = getGethPath();
  const contextLines = parseInt(values.context || "0");

  if (values.function) {
    await searchFunction(values.function, gethPath, contextLines, values.json);
  } else if (values.type) {
    await searchType(values.type, gethPath, contextLines, values.json);
  } else if (values.interface) {
    await searchInterface(values.interface, gethPath, contextLines, values.json);
  } else if (values.struct) {
    await searchStruct(values.struct, gethPath, contextLines, values.json);
  } else if (values.method) {
    await searchMethod(values.method, gethPath, contextLines, values.json);
  } else {
    printHelp();
  }
}

function printHelp() {
  console.log(`
SearchDefinitions - Find definitions in go-ethereum

USAGE:
  bun run SearchDefinitions.ts [OPTIONS]

OPTIONS:
  -f, --function <name>   Find function definition
  -t, --type <name>       Find type definition (struct or interface)
  -i, --interface <name>  Find interface definition
  -s, --struct <name>     Find struct definition
  -m, --method <Type.Method>  Find method on a type
  --context <lines>       Include context lines (default: 0)
  --json                  Output as JSON
  -h, --help              Show this help

EXAMPLES:
  # Find opSstore function
  bun run SearchDefinitions.ts --function opSstore

  # Find StateDB type with context
  bun run SearchDefinitions.ts --type StateDB --context 50

  # Find Backend interface
  bun run SearchDefinitions.ts --interface Backend

  # Find StateDB.GetState method
  bun run SearchDefinitions.ts --method "StateDB.GetState"

  # Output as JSON for scripting
  bun run SearchDefinitions.ts --function opSstore --json
`);
}

async function searchFunction(
  name: string,
  gethPath: string,
  contextLines: number,
  asJson?: boolean
) {
  const pattern = functionDefPattern(name);
  const results = await runSearch(pattern, gethPath, contextLines);

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(`No function definition found for: ${name}`);
    return;
  }

  console.log(`Function: ${name}`);
  console.log(`Found ${results.length} definition(s):\n`);

  for (const result of results) {
    printResult(result, gethPath);
  }
}

async function searchType(
  name: string,
  gethPath: string,
  contextLines: number,
  asJson?: boolean
) {
  const pattern = typeDefPattern(name);
  const results = await runSearch(pattern, gethPath, contextLines);

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(`No type definition found for: ${name}`);
    return;
  }

  console.log(`Type: ${name}`);
  console.log(`Found ${results.length} definition(s):\n`);

  for (const result of results) {
    printResult(result, gethPath);
  }
}

async function searchInterface(
  name: string,
  gethPath: string,
  contextLines: number,
  asJson?: boolean
) {
  const pattern = interfaceDefPattern(name);
  const results = await runSearch(pattern, gethPath, contextLines);

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(`No interface definition found for: ${name}`);
    return;
  }

  console.log(`Interface: ${name}`);
  console.log(`Found ${results.length} definition(s):\n`);

  for (const result of results) {
    printResult(result, gethPath);
  }
}

async function searchStruct(
  name: string,
  gethPath: string,
  contextLines: number,
  asJson?: boolean
) {
  const pattern = structDefPattern(name);
  const results = await runSearch(pattern, gethPath, contextLines);

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(`No struct definition found for: ${name}`);
    return;
  }

  console.log(`Struct: ${name}`);
  console.log(`Found ${results.length} definition(s):\n`);

  for (const result of results) {
    printResult(result, gethPath);
  }
}

async function searchMethod(
  fullName: string,
  gethPath: string,
  contextLines: number,
  asJson?: boolean
) {
  const parts = fullName.split(".");
  if (parts.length !== 2) {
    console.error("Method must be in format Type.Method");
    return;
  }

  const [typeName, methodName] = parts;
  const pattern = methodDefPattern(typeName, methodName);
  const results = await runSearch(pattern, gethPath, contextLines);

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(`No method definition found for: ${fullName}`);
    return;
  }

  console.log(`Method: ${typeName}.${methodName}`);
  console.log(`Found ${results.length} definition(s):\n`);

  for (const result of results) {
    printResult(result, gethPath);
  }
}

async function runSearch(
  pattern: string,
  gethPath: string,
  contextLines: number
): Promise<SearchResult[]> {
  try {
    let result: string;
    if (contextLines > 0) {
      result =
        await $`rg --type go -n -A ${contextLines} --color=never "${pattern}" ${gethPath}`.text();
    } else {
      result =
        await $`rg --type go -n --color=never "${pattern}" ${gethPath}`.text();
    }

    return parseResults(result, contextLines > 0);
  } catch (e) {
    return [];
  }
}

function parseResults(output: string, hasContext: boolean): SearchResult[] {
  const results: SearchResult[] = [];

  if (hasContext) {
    // Parse with context (sections separated by --)
    const sections = output.split("--\n");
    for (const section of sections) {
      if (!section.trim()) continue;

      const lines = section.trim().split("\n");
      const firstLine = lines[0];
      const match = firstLine.match(/^([^:]+):(\d+)[:-](.*)$/);

      if (match) {
        const [, file, lineNum, content] = match;
        const context = lines
          .slice(1)
          .map((l) => {
            const m = l.match(/^[^:]+:\d+[:-](.*)$/);
            return m ? m[1] : l;
          })
          .filter((l) => l !== undefined);

        results.push({
          file,
          line: parseInt(lineNum),
          content: content.trim(),
          context,
        });
      }
    }
  } else {
    // Parse without context
    for (const line of output.trim().split("\n")) {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        const [, file, lineNum, content] = match;
        results.push({
          file,
          line: parseInt(lineNum),
          content: content.trim(),
        });
      }
    }
  }

  return results;
}

function printResult(result: SearchResult, gethPath: string) {
  const relFile = result.file.replace(gethPath + "/", "");
  console.log(`${relFile}:${result.line}`);
  console.log(`  ${result.content}`);

  if (result.context && result.context.length > 0) {
    console.log();
    for (const line of result.context) {
      console.log(`  ${line}`);
    }
  }

  console.log();
}

main().catch(console.error);
