#!/usr/bin/env bun
/**
 * SelectTechniques - Decision graph for technique selection
 *
 * Usage:
 *   bun run SelectTechniques.ts --input "fix the bug" --task-type code
 *   bun run SelectTechniques.ts --input "complex refactoring" --json
 */

import { parseArgs } from "util";
import { classifyTask, assessComplexity, extractConstraints, TaskType } from "./lib/patterns";
import { selectTechniques, getTechniqueInfo } from "./lib/decision-graph";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    "task-type": { type: "string", short: "t" },
    json: { type: "boolean", short: "j" },
    verbose: { type: "boolean", short: "v" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
SelectTechniques - Decision graph for technique selection

USAGE:
  bun run SelectTechniques.ts --input "your prompt" [OPTIONS]

OPTIONS:
  -i, --input <text>       The prompt to analyze (required)
  -t, --task-type <type>   Override task type (auto-detected if not provided)
  -j, --json               Output as JSON
  -v, --verbose            Show technique descriptions
  -h, --help               Show this help

TECHNIQUE FAMILIES:
  zero_shot       Direct prompts without examples
  cot             Chain-of-thought reasoning
  decomposition   Breaking into subtasks
  self_critique   Self-verification patterns
  output_control  Format constraints
  code_specific   Software engineering patterns

EXAMPLES:
  bun run SelectTechniques.ts --input "fix the auth bug"
  bun run SelectTechniques.ts --input "explain the algorithm" --task-type reasoning
  bun run SelectTechniques.ts --input "security fix" --verbose
`);
  process.exit(0);
}

if (!values.input) {
  console.error("Error: --input is required");
  process.exit(1);
}

// Determine task type
const taskType: TaskType = (values["task-type"] as TaskType) || classifyTask(values.input);
const complexity = assessComplexity(values.input);
const constraints = extractConstraints(values.input);

// Check for underspecified input
const underspecified = values.input.split(/\s+/).length < 3;

const techniques = selectTechniques(values.input, {
  taskType,
  complexity,
  correctnessCritical: constraints.correctnessCritical,
  jsonOutput: constraints.jsonOutput,
  underspecified,
});

if (values.json) {
  console.log(JSON.stringify({
    input: values.input,
    taskType,
    complexity: Math.round(complexity * 100) / 100,
    techniques,
  }, null, 2));
} else if (values.verbose) {
  console.log(`Input: "${values.input}"`);
  console.log(`Task Type: ${taskType}`);
  console.log(`Complexity: ${(complexity * 100).toFixed(0)}%`);
  console.log(`\nBase Techniques:`);
  for (const tech of techniques.base) {
    const info = getTechniqueInfo(tech);
    console.log(`  - ${tech}: ${info?.description || "No description"}`);
  }
  if (techniques.optional.length > 0) {
    console.log(`\nOptional Techniques:`);
    for (const tech of techniques.optional) {
      const info = getTechniqueInfo(tech);
      console.log(`  - ${tech}: ${info?.description || "No description"}`);
    }
  }
  if (techniques.antipatterns.length > 0) {
    console.log(`\nAntipatterns (avoid):`);
    for (const tech of techniques.antipatterns) {
      console.log(`  - ${tech}`);
    }
  }
} else {
  console.log("Base:", techniques.base.join(", "));
  if (techniques.optional.length > 0) {
    console.log("Optional:", techniques.optional.join(", "));
  }
  if (techniques.antipatterns.length > 0) {
    console.log("Avoid:", techniques.antipatterns.join(", "));
  }
}
