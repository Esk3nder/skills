#!/usr/bin/env bun
/**
 * CompilePrompt - Compile techniques into a structured prompt
 *
 * Usage:
 *   bun run CompilePrompt.ts --input "fix the bug" --techniques structured_output,verification
 *   bun run CompilePrompt.ts --input "explain this" --task-type reasoning --auto
 */

import { parseArgs } from "util";
import { classifyTask, assessComplexity, extractConstraints, TaskType } from "./lib/patterns";
import { selectTechniques, TechniqueSet } from "./lib/decision-graph";
import { compilePrompt, assessClarity } from "./lib/compiler";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    input: { type: "string", short: "i" },
    techniques: { type: "string", short: "t" },
    "task-type": { type: "string" },
    context: { type: "string", short: "c" },
    auto: { type: "boolean", short: "a" },
    json: { type: "boolean", short: "j" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help) {
  console.log(`
CompilePrompt - Compile techniques into a structured prompt

USAGE:
  bun run CompilePrompt.ts --input "your prompt" [OPTIONS]

OPTIONS:
  -i, --input <text>           The prompt to compile (required)
  -t, --techniques <list>      Comma-separated technique names
  --task-type <type>           Override task type
  -c, --context <text>         Additional context to include
  -a, --auto                   Auto-select techniques based on input
  -j, --json                   Output as JSON
  -h, --help                   Show this help

EXAMPLES:
  bun run CompilePrompt.ts --input "fix the bug" --auto
  bun run CompilePrompt.ts --input "explain this" --techniques chain_of_thought,verification
  bun run CompilePrompt.ts --input "refactor" --context "src/auth.ts" --auto
`);
  process.exit(0);
}

if (!values.input) {
  console.error("Error: --input is required");
  process.exit(1);
}

// Determine task type
const taskType: TaskType = (values["task-type"] as TaskType) || classifyTask(values.input);

// Build technique set
let techniques: TechniqueSet;

if (values.auto || !values.techniques) {
  // Auto-select techniques
  const complexity = assessComplexity(values.input);
  const constraints = extractConstraints(values.input);
  const underspecified = values.input.split(/\s+/).length < 3;

  techniques = selectTechniques(values.input, {
    taskType,
    complexity,
    correctnessCritical: constraints.correctnessCritical,
    jsonOutput: constraints.jsonOutput,
    underspecified,
  });
} else {
  // Use provided techniques
  techniques = {
    base: values.techniques.split(",").map(t => t.trim()),
    optional: [],
    antipatterns: [],
  };
}

// Compile the prompt
const result = compilePrompt(values.input, taskType, techniques, values.context);

// Calculate clarity scores
const clarityBefore = assessClarity(values.input);
const clarityAfter = assessClarity(result.prompt);

if (values.json) {
  console.log(JSON.stringify({
    original: values.input,
    compiled: result.prompt,
    taskType,
    techniques: result.techniques,
    changes: result.changes,
    clarity: {
      before: clarityBefore,
      after: clarityAfter,
      improvement: clarityAfter - clarityBefore,
    },
  }, null, 2));
} else {
  console.log(result.prompt);
  console.log("\n---");
  console.log(`Techniques applied: ${result.techniques.join(", ")}`);
  console.log(`Clarity: ${clarityBefore} → ${clarityAfter} (+${clarityAfter - clarityBefore})`);
}
