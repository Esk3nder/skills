/**
 * decision-graph.ts - Technique selection based on task type and context
 *
 * Implements the decision graph that maps task types to appropriate
 * prompting techniques, with modifiers for complexity and constraints.
 */

import { TaskType } from "./patterns";

export interface TaskContext {
  taskType: TaskType;
  complexity: number; // 0-1 scale
  correctnessCritical?: boolean;
  jsonOutput?: boolean;
  underspecified?: boolean;
  context?: string;
}

export interface TechniqueSet {
  base: string[];      // Required techniques
  optional: string[];  // Conditionally applied
  antipatterns: string[]; // Techniques to avoid
}

// Technique mappings by task type
const TASK_TECHNIQUE_MAP: Record<TaskType, { base: string[]; optional: string[]; antipatterns: string[] }> = {
  classification: {
    base: ["zero_shot_direct"],
    optional: ["few_shot"],
    antipatterns: ["chain_of_thought"], // Overthinking hurts classification
  },
  reasoning: {
    base: ["chain_of_thought"],
    optional: ["least_to_most", "self_consistency"],
    antipatterns: [],
  },
  code: {
    base: ["structured_output", "verification_step"],
    optional: ["plan_and_solve", "test_first"],
    antipatterns: [],
  },
  synthesis: {
    base: ["role_prompting", "structured_output"],
    optional: ["iterative_refinement"],
    antipatterns: [],
  },
  research: {
    base: ["context_injection", "structured_output"],
    optional: ["decomposition"],
    antipatterns: [],
  },
  evaluation: {
    base: ["structured_output", "verification"],
    optional: ["self_critique", "comparative_analysis"],
    antipatterns: [],
  },
  agentic: {
    base: ["plan_and_solve", "verification_step"],
    optional: ["decomposition", "self_reflection"],
    antipatterns: [],
  },
};

// Complexity thresholds for adding optional techniques
const COMPLEXITY_THRESHOLDS = {
  high: 0.7,
  medium: 0.5,
};

/**
 * Select techniques based on task type and context
 * Implements the decision graph for multi-technique composition
 */
export function selectTechniques(input: string, context: TaskContext): TechniqueSet {
  const result: TechniqueSet = {
    base: [],
    optional: [],
    antipatterns: [],
  };

  // Get base techniques for task type
  const taskTechniques = TASK_TECHNIQUE_MAP[context.taskType];
  if (taskTechniques) {
    result.base.push(...taskTechniques.base);
    result.optional.push(...taskTechniques.optional);
    result.antipatterns.push(...taskTechniques.antipatterns);
  }

  // Complexity-based additions
  if (context.complexity >= COMPLEXITY_THRESHOLDS.high) {
    // Add decomposition/planning for complex tasks
    if (context.taskType === "code" && !result.base.includes("plan_and_solve")) {
      result.base.push("plan_and_solve");
    }
    if (context.taskType === "reasoning" && !result.base.includes("least_to_most")) {
      result.base.push("least_to_most");
    }
  }

  // Correctness-critical additions
  if (context.correctnessCritical) {
    if (!result.base.includes("self_critique")) {
      result.base.push("self_critique");
    }
    if (!result.base.includes("verification")) {
      result.base.push("verification");
    }
  }

  // JSON output requirement
  if (context.jsonOutput) {
    if (!result.base.includes("structured_output_enforcement")) {
      result.base.push("structured_output_enforcement");
    }
  }

  // Underspecified input handling
  if (context.underspecified) {
    // Add clarification at the front
    result.base.unshift("clarification_request");
  }

  // Deduplicate base techniques
  result.base = [...new Set(result.base)];
  result.optional = [...new Set(result.optional)];

  return result;
}

/**
 * Get technique details by name
 */
export function getTechniqueInfo(name: string): {
  family: string;
  description: string;
} | null {
  const techniques: Record<string, { family: string; description: string }> = {
    zero_shot_direct: { family: "zero_shot", description: "Direct instruction without examples" },
    role_prompting: { family: "zero_shot", description: "Assign expert persona to model" },
    chain_of_thought: { family: "cot", description: "Explicit step-by-step reasoning" },
    zero_shot_cot: { family: "cot", description: "Simple CoT trigger phrase" },
    least_to_most: { family: "decomposition", description: "Break into subproblems, solve in order" },
    plan_and_solve: { family: "decomposition", description: "Create plan first, then execute" },
    self_consistency: { family: "self_critique", description: "Generate multiple answers, validate consistency" },
    verification: { family: "self_critique", description: "Verify answer before returning" },
    self_critique: { family: "self_critique", description: "Critically evaluate own output" },
    structured_output: { family: "output_control", description: "Enforce specific output format" },
    structured_output_enforcement: { family: "output_control", description: "Strict JSON/structured output" },
    test_first: { family: "code_specific", description: "Write test before implementation" },
    verification_step: { family: "code_specific", description: "Add explicit verification for code tasks" },
    clarification_request: { family: "zero_shot", description: "Request missing information" },
    context_injection: { family: "zero_shot", description: "Inject relevant context" },
    constraints: { family: "output_control", description: "Explicit constraints section" },
    few_shot: { family: "few_shot", description: "Include example demonstrations" },
    iterative_refinement: { family: "synthesis", description: "Multiple refinement passes" },
    decomposition: { family: "decomposition", description: "Break into subtasks" },
    comparative_analysis: { family: "evaluation", description: "Compare multiple approaches" },
    self_reflection: { family: "self_critique", description: "Reflect on approach" },
  };

  return techniques[name] || null;
}
