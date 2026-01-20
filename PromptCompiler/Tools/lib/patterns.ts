/**
 * patterns.ts - Deterministic task classification via regex pattern matching
 *
 * Loads patterns from TaskPatterns.yaml and scores input against each task type.
 * Highest scoring task type wins.
 */

import { join } from "path";

export type TaskType =
  | "classification"
  | "reasoning"
  | "code"
  | "synthesis"
  | "research"
  | "evaluation"
  | "agentic";

export interface Constraints {
  correctnessCritical: boolean;
  jsonOutput: boolean;
}

interface PatternSignal {
  pattern: string;
  weight: number;
}

interface TaskPattern {
  description: string;
  signals: PatternSignal[];
  negative_signals: PatternSignal[];
  antipatterns: string[];
}

interface TaskPatternsConfig {
  task_patterns: Record<string, TaskPattern>;
  complexity_signals: {
    high: PatternSignal[];
    low: PatternSignal[];
  };
  constraint_signals: {
    correctness_critical: PatternSignal[];
    json_output: PatternSignal[];
  };
}

// Load and parse YAML config
let patternsConfig: TaskPatternsConfig | null = null;

function loadPatterns(): TaskPatternsConfig {
  if (patternsConfig) return patternsConfig;

  // Inline patterns for standalone operation (no YAML dependency needed)
  // These mirror TaskPatterns.yaml
  patternsConfig = {
    task_patterns: {
      classification: {
        description: "Binary/categorical decisions",
        signals: [
          { pattern: "\\b(is this|categorize|classify|label|which type|what kind)\\b", weight: 1.0 },
          { pattern: "\\b(yes or no|true or false|valid or invalid)\\b", weight: 0.8 },
          { pattern: "\\b(should I|is it|does it|can it)\\b", weight: 0.6 },
        ],
        negative_signals: [
          { pattern: "\\b(why|how|explain|because)\\b", weight: -0.5 },
        ],
        antipatterns: ["cot"],
      },
      reasoning: {
        description: "Logical analysis, causal explanation",
        signals: [
          { pattern: "\\b(why|explain|how does|because|reason|cause)\\b", weight: 1.0 },
          { pattern: "\\b(calculate|solve|prove|derive|deduce)\\b", weight: 0.9 },
          { pattern: "\\b(step by step|walk through|break down)\\b", weight: 0.8 },
          { pattern: "\\b(what happens if|consequences|implications)\\b", weight: 0.7 },
        ],
        negative_signals: [],
        antipatterns: [],
      },
      code: {
        description: "Software engineering tasks",
        signals: [
          { pattern: "\\.(ts|js|py|go|rs|java|cpp|tsx|jsx|vue|svelte)\\b", weight: 1.0 },
          { pattern: "\\b(function|class|method|variable|bug|error|fix|refactor|implement)\\b", weight: 0.9 },
          { pattern: "\\b(test|debug|compile|build|lint|format)\\b", weight: 0.8 },
          { pattern: "/(src|lib|components|hooks|utils|services|api)/", weight: 0.7 },
          { pattern: "\\b(npm|yarn|bun|pip|cargo|go mod)\\b", weight: 0.6 },
          { pattern: "\\b(PR|pull request|commit|merge|branch)\\b", weight: 0.5 },
        ],
        negative_signals: [],
        antipatterns: [],
      },
      synthesis: {
        description: "Content creation and generation",
        signals: [
          { pattern: "\\b(write|create|generate|compose|draft|make|build)\\b", weight: 1.0 },
          { pattern: "\\b(new|from scratch|blank|initial)\\b", weight: 0.6 },
          { pattern: "\\b(template|boilerplate|scaffold)\\b", weight: 0.5 },
        ],
        negative_signals: [
          { pattern: "\\b(fix|debug|error|bug)\\b", weight: -0.4 },
        ],
        antipatterns: [],
      },
      research: {
        description: "Information gathering and exploration",
        signals: [
          { pattern: "\\b(find|search|look for|what are|list all|show me)\\b", weight: 1.0 },
          { pattern: "\\b(where|which files|examples of|instances of)\\b", weight: 0.8 },
          { pattern: "\\b(documentation|docs|reference|usage)\\b", weight: 0.6 },
        ],
        negative_signals: [
          { pattern: "\\b(write|create|implement|fix)\\b", weight: -0.3 },
        ],
        antipatterns: [],
      },
      evaluation: {
        description: "Assessment, review, comparison",
        signals: [
          { pattern: "\\b(review|critique|assess|evaluate|compare|rate|analyze)\\b", weight: 1.0 },
          { pattern: "\\b(pros and cons|tradeoffs|better|worse|vs)\\b", weight: 1.2 }, // Higher weight for comparison phrases
          { pattern: "\\b(quality|performance|security|maintainability)\\b", weight: 0.5 },
        ],
        negative_signals: [],
        antipatterns: [],
      },
      agentic: {
        description: "Multi-step autonomous tasks",
        signals: [
          { pattern: "\\b(set up|configure|deploy|install|migrate)\\b", weight: 1.0 },
          { pattern: "\\b(end to end|full|complete|entire|whole)\\b", weight: 1.2 }, // Higher weight - strong agentic indicator
          { pattern: "\\b(then|after that|once done|next|finally)\\b", weight: 0.5 },
          { pattern: "\\b(pipeline|workflow|process|automation)\\b", weight: 0.5 },
        ],
        negative_signals: [],
        antipatterns: [],
      },
    },
    complexity_signals: {
      high: [
        { pattern: "\\b(complex|complicated|tricky|challenging)\\b", weight: 0.3 },
        { pattern: "\\b(multiple|several|various|many)\\b", weight: 0.2 },
        { pattern: "\\b(across|throughout|all|every)\\b", weight: 0.2 },
      ],
      low: [
        { pattern: "\\b(simple|quick|just|only|small)\\b", weight: -0.3 },
        { pattern: "\\b(one|single|basic|trivial)\\b", weight: -0.2 },
      ],
    },
    constraint_signals: {
      correctness_critical: [
        { pattern: "\\b(security|vulnerability|auth|credential|password|token)\\b", weight: 1.0 },
        { pattern: "\\b(production|live|customer|critical|important)\\b", weight: 0.8 },
        { pattern: "\\b(must|required|essential|mandatory)\\b", weight: 0.5 },
      ],
      json_output: [
        { pattern: "\\b(json|JSON|structured|parseable)\\b", weight: 1.0 },
        { pattern: "\\b(api|response|payload)\\b", weight: 0.5 },
      ],
    },
  };

  return patternsConfig;
}

/**
 * Score input against a set of patterns
 */
function scorePatterns(input: string, signals: PatternSignal[]): number {
  let score = 0;
  const lowerInput = input.toLowerCase();

  for (const signal of signals) {
    try {
      const regex = new RegExp(signal.pattern, "i");
      if (regex.test(lowerInput)) {
        score += signal.weight;
      }
    } catch {
      // Skip invalid regex patterns
    }
  }

  return score;
}

/**
 * Classify task type based on pattern matching
 * Returns the task type with the highest score
 */
export function classifyTask(input: string): TaskType {
  if (!input || input.trim() === "") {
    return "synthesis"; // Default fallback
  }

  const config = loadPatterns();
  const scores: Record<string, number> = {};

  for (const [taskType, pattern] of Object.entries(config.task_patterns)) {
    let score = 0;

    // Add positive signals
    score += scorePatterns(input, pattern.signals);

    // Subtract negative signals
    score += scorePatterns(input, pattern.negative_signals);

    scores[taskType] = score;
  }

  // Find highest scoring task type
  let maxScore = -Infinity;
  let bestType: TaskType = "synthesis"; // Default

  for (const [taskType, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestType = taskType as TaskType;
    }
  }

  // If no clear winner (all scores <= 0), use default based on simple heuristics
  if (maxScore <= 0) {
    return "synthesis";
  }

  return bestType;
}

/**
 * Assess complexity of the input
 * Returns a value between 0 (simple) and 1 (complex)
 */
export function assessComplexity(input: string): number {
  const config = loadPatterns();

  let score = 0.5; // Start at middle

  // Add high complexity signals
  score += scorePatterns(input, config.complexity_signals.high);

  // Add low complexity signals (these have negative weights)
  score += scorePatterns(input, config.complexity_signals.low);

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Extract constraints from input
 * Detects correctness-critical and output format requirements
 */
export function extractConstraints(input: string): Constraints {
  const config = loadPatterns();

  const correctnessScore = scorePatterns(
    input,
    config.constraint_signals.correctness_critical
  );

  const jsonScore = scorePatterns(input, config.constraint_signals.json_output);

  return {
    correctnessCritical: correctnessScore >= 0.5,
    jsonOutput: jsonScore >= 0.5,
  };
}

/**
 * Get antipatterns for a task type
 * Returns techniques that should NOT be used for this task
 */
export function getAntipatterns(taskType: TaskType): string[] {
  const config = loadPatterns();
  const pattern = config.task_patterns[taskType];
  return pattern?.antipatterns || [];
}
