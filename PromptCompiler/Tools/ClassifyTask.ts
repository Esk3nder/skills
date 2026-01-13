#!/usr/bin/env bun
/**
 * ClassifyTask - Deterministic task type classification
 *
 * Usage:
 *   bun run ClassifyTask.ts --input "fix the bug"
 *   bun run ClassifyTask.ts --input "why does this fail?" --json
 */

import { parseArgs } from "util";
import { classifyTask, assessComplexity, extractConstraints } from "./lib/patterns";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    json: { type: "boolean", short: "j" },
    verbose: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
ClassifyTask - Deterministic task type classification

USAGE:
  bun run ClassifyTask.ts --input "your prompt" [OPTIONS]

OPTIONS:
  -i, --input <text>   The prompt to classify (required)
  -j, --json           Output as JSON
  -v, --verbose        Show scoring details
  -h, --help           Show this help

TASK TYPES:
  classification  Binary/categorical decisions
  reasoning       Logical analysis, causal explanation
  code            Software engineering tasks
  synthesis       Content creation and generation
  research        Information gathering and exploration
  evaluation      Assessment, review, comparison
  agentic         Multi-step autonomous tasks

EXAMPLES:
  bun run ClassifyTask.ts --input "fix the auth bug"
  bun run ClassifyTask.ts --input "why does this timeout?" --json
  bun run ClassifyTask.ts --input "set up CI/CD" --verbose
`);
  process.exit(0);
}

if (!values.input) {
  console.error("Error: --input is required");
  process.exit(1);
}

const taskType = classifyTask(values.input);
const complexity = assessComplexity(values.input);
const constraints = extractConstraints(values.input);

if (values.json) {
  console.log(JSON.stringify({
    input: values.input,
    taskType,
    complexity: Math.round(complexity * 100) / 100,
    constraints,
  }, null, 2));
} else if (values.verbose) {
  console.log(`Input: "${values.input}"`);
  console.log(`Task Type: ${taskType}`);
  console.log(`Complexity: ${(complexity * 100).toFixed(0)}%`);
  console.log(`Constraints:`);
  console.log(`  - Correctness Critical: ${constraints.correctnessCritical}`);
  console.log(`  - JSON Output: ${constraints.jsonOutput}`);
} else {
  console.log(taskType);
}
