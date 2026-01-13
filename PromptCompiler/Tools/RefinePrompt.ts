#!/usr/bin/env bun
/**
 * RefinePrompt - Transform lazy inputs into best-practice prompts
 *
 * Full pipeline: Classify → Select Techniques → Compile
 *
 * Usage:
 *   bun run RefinePrompt.ts --input "fix the bug"
 *   bun run RefinePrompt.ts --input "analyze this" --context src/file.ts
 *   bun run RefinePrompt.ts --input "..." --mode diff --json
 */

import { parseArgs } from "util";
import { classifyTask, assessComplexity, extractConstraints, TaskType } from "./lib/patterns";
import { selectTechniques, TechniqueSet } from "./lib/decision-graph";
import { compilePrompt, compileResearchPrompt, assessClarity } from "./lib/compiler";

interface RefinementResult {
  original: string;
  refined: string;
  taskType: TaskType;
  complexity: number;
  techniques: TechniqueSet;
  appliedTechniques: string[];
  changes: string[];
  score: { before: number; after: number; improvement: number };
}

async function refinePrompt(
  input: string,
  context?: string
): Promise<RefinementResult> {
  // LAYER 1: Classify task type
  const taskType = classifyTask(input);

  // LAYER 2: Assess complexity and constraints
  const complexity = assessComplexity(input);
  const constraints = extractConstraints(input);
  const underspecified = input.split(/\s+/).length < 3;

  // LAYER 3: Select techniques via decision graph
  const techniques = selectTechniques(input, {
    taskType,
    complexity,
    correctnessCritical: constraints.correctnessCritical,
    jsonOutput: constraints.jsonOutput,
    underspecified,
  });

  // LAYER 4: Compile prompt using templates
  // Research tasks get special handling with full Research Contract
  const compiled = taskType === "research"
    ? compileResearchPrompt(input)
    : compilePrompt(input, taskType, techniques, context);

  // Calculate improvement score
  const scoreBefore = assessClarity(input);
  const scoreAfter = assessClarity(compiled.prompt);

  return {
    original: input,
    refined: compiled.prompt,
    taskType,
    complexity,
    techniques,
    appliedTechniques: compiled.techniques,
    changes: compiled.changes,
    score: {
      before: scoreBefore,
      after: scoreAfter,
      improvement: scoreAfter - scoreBefore,
    },
  };
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      input: { type: "string", short: "i" },
      context: { type: "string", short: "c" },
      mode: { type: "string", short: "m", default: "suggest" },
      json: { type: "boolean", short: "j" },
      verbose: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
RefinePrompt - Transform lazy inputs into best-practice prompts

USAGE:
  bun run RefinePrompt.ts --input "your prompt" [OPTIONS]

OPTIONS:
  -i, --input <text>     The prompt to refine (required)
  -c, --context <text>   Optional context (e.g., file path or description)
  -m, --mode <mode>      Output mode: suggest (default), diff, analysis
  -j, --json             Output as JSON
  -v, --verbose          Show detailed decision reasoning
  -h, --help             Show this help

MODES:
  suggest    Output only the refined prompt (default)
  diff       Show before/after comparison
  analysis   Show full analysis including techniques and scores

EXAMPLES:
  bun run RefinePrompt.ts --input "fix the bug"
  bun run RefinePrompt.ts --input "analyze this" --context "src/auth.ts"
  bun run RefinePrompt.ts --input "write tests" --mode diff
  bun run RefinePrompt.ts --input "security fix" --mode analysis --json
`);
    return;
  }

  if (!values.input) {
    console.error("Error: --input is required");
    process.exit(1);
  }

  const result = await refinePrompt(values.input, values.context);

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (values.mode === "diff") {
    console.log("ORIGINAL:");
    console.log(result.original);
    console.log("\n" + "=".repeat(60) + "\n");
    console.log("REFINED:");
    console.log(result.refined);
    console.log("\n---");
    console.log(`Clarity: ${result.score.before} → ${result.score.after} (+${result.score.improvement})`);
  } else if (values.mode === "analysis" || values.verbose) {
    console.log("ANALYSIS");
    console.log("=".repeat(60));
    console.log(`Input: "${result.original}"`);
    console.log(`Task Type: ${result.taskType}`);
    console.log(`Complexity: ${(result.complexity * 100).toFixed(0)}%`);
    console.log(`\nTechniques Applied:`);
    for (const tech of result.appliedTechniques) {
      console.log(`  - ${tech}`);
    }
    console.log(`\nChanges Made:`);
    for (const change of result.changes) {
      console.log(`  - ${change}`);
    }
    console.log(`\nClarity Score: ${result.score.before} → ${result.score.after} (+${result.score.improvement})`);
    console.log("\n" + "=".repeat(60));
    console.log("REFINED PROMPT:");
    console.log("=".repeat(60));
    console.log(result.refined);
  } else {
    // Default: just output the refined prompt
    console.log(result.refined);
  }
}

main().catch(console.error);
