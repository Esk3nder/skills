/**
 * compiler.ts - Template-based prompt compilation
 *
 * Takes selected techniques and compiles them into a structured prompt
 * using template sections for each technique.
 *
 * Research tasks get special handling via compileResearchPrompt() which
 * generates a 5-section Research Contract with deterministic focus areas,
 * search plan, source policy, and citation requirements.
 */

import { TaskType } from "./patterns";
import { TechniqueSet } from "./decision-graph";

export interface CompiledPrompt {
  prompt: string;
  techniques: string[];
  changes: string[];
}

// ============================================================================
// RESEARCH CONTRACT SYSTEM
// ============================================================================

/**
 * Focus area mapping table - deterministic selection based on query keywords
 * Each domain maps to 3-7 specific focus areas
 */
const RESEARCH_FOCUS_AREAS: Record<string, string[]> = {
  hooks: [
    "Hook lifecycle: events, payloads, matchers",
    "Deterministic enforcement: hard block vs soft warn, exit codes, input rewriting",
    "Performance + reliability: timeouts, ordering, conflicts",
    "Anti-patterns + footguns",
    "Examples: minimal hook templates + config snippets",
  ],
  security: [
    "Injection vectors and prevention patterns",
    "Permission models and access control",
    "Auditing and logging requirements",
    "Secret management best practices",
    "Common vulnerabilities and mitigations",
  ],
  api: [
    "Schema design and versioning patterns",
    "Authentication and authorization flows",
    "Error handling conventions",
    "Rate limiting and quotas",
    "Changelog and breaking change policies",
  ],
  testing: [
    "Test pyramid structure and coverage targets",
    "Mocking and fixture patterns",
    "Integration vs unit test boundaries",
    "CI/CD test execution strategies",
    "Flaky test prevention",
  ],
  performance: [
    "Profiling and measurement techniques",
    "Common bottleneck patterns",
    "Caching strategies",
    "Resource optimization approaches",
    "Benchmarking methodologies",
  ],
  architecture: [
    "Design pattern applicability",
    "Component boundaries and coupling",
    "Scalability considerations",
    "Migration and evolution strategies",
    "Trade-off analysis frameworks",
  ],
  default: [
    "Key concepts and terminology",
    "Core implementation patterns",
    "Common pitfalls and anti-patterns",
    "Best practices from official sources",
    "Practical examples and use cases",
  ],
};

/**
 * Keyword patterns to match focus area domains
 */
const FOCUS_AREA_PATTERNS: Array<{ pattern: RegExp; domain: string }> = [
  { pattern: /\b(hook|hooks|pretooluse|posttooluse|lifecycle)\b/i, domain: "hooks" },
  { pattern: /\b(security|auth|permission|credential|vulnerability)\b/i, domain: "security" },
  { pattern: /\b(api|endpoint|rest|graphql|schema|versioning)\b/i, domain: "api" },
  { pattern: /\b(test|testing|spec|coverage|mock|fixture)\b/i, domain: "testing" },
  { pattern: /\b(performance|speed|latency|optimization|benchmark)\b/i, domain: "performance" },
  { pattern: /\b(architecture|design|pattern|structure|component)\b/i, domain: "architecture" },
];

/**
 * Detect recency sensitivity from input
 */
function detectRecencySensitivity(input: string): { sensitive: boolean; days: number } {
  const lowerInput = input.toLowerCase();

  // High recency indicators
  if (/\b(latest|newest|recent|current|2024|2025|2026)\b/.test(lowerInput)) {
    return { sensitive: true, days: 30 };
  }

  // Software/library research defaults to 90 days
  if (/\b(version|update|release|changelog|breaking)\b/.test(lowerInput)) {
    return { sensitive: true, days: 90 };
  }

  // Default for software research
  return { sensitive: true, days: 90 };
}

/**
 * Select focus areas based on input keywords
 * Returns 3-7 focus areas from the mapping table
 */
function selectFocusAreas(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const matchedDomains: string[] = [];

  for (const { pattern, domain } of FOCUS_AREA_PATTERNS) {
    if (pattern.test(lowerInput)) {
      matchedDomains.push(domain);
    }
  }

  // If no matches, use default
  if (matchedDomains.length === 0) {
    return RESEARCH_FOCUS_AREAS.default;
  }

  // Combine focus areas from matched domains (deduplicate)
  const focusAreas = new Set<string>();
  for (const domain of matchedDomains) {
    const areas = RESEARCH_FOCUS_AREAS[domain] || [];
    areas.forEach((area) => focusAreas.add(area));
  }

  // Limit to 7 focus areas max
  return Array.from(focusAreas).slice(0, 7);
}

/**
 * Generate search plan based on focus areas and recency
 */
function generateSearchPlan(focusAreas: string[], recency: { sensitive: boolean; days: number }): string[] {
  const steps: string[] = [
    "Read official documentation/specs for core concepts and schemas",
    "Validate with canonical GitHub examples (official repos)",
  ];

  if (recency.sensitive) {
    steps.push(`Cross-check with changelogs/issues for breaking changes (last ${recency.days} days)`);
  }

  steps.push("Extract best practices into do/don't rules with evidence links");

  if (focusAreas.some((a) => a.includes("anti-pattern") || a.includes("pitfall"))) {
    steps.push("Identify common failure modes and their mitigations");
  }

  return steps;
}

/**
 * Generate source policy based on recency sensitivity
 */
function generateSourcePolicy(recency: { sensitive: boolean; days: number }): string {
  const lines = [
    "- Priority 1: Official documentation/specs (must cite)",
    "- Priority 2: Official GitHub repos + examples (must cite)",
    "- Priority 3: Release notes / changelogs / issues for behavior changes (must cite)",
    "- Priority 4: Blogs/tutorials (only if corroborated by Priority 1-3)",
  ];

  if (recency.sensitive) {
    lines.push(`- Recency: Prefer sources within last ${recency.days} days if behavior may have changed`);
  }

  return lines.join("\n");
}

/**
 * Generate return contract
 */
function generateReturnContract(): string {
  return `- Provide:
  1) Summary table: Topic | Recommendation | Evidence URL
  2) Key patterns (bullets) + code snippets where relevant
  3) Pitfalls + mitigations
- Every non-trivial claim must include a source URL
- If sources disagree, list both and state uncertainty`;
}

/**
 * Compile a research prompt with full Research Contract
 * This replaces the generic structured_output for research tasks
 */
export function compileResearchPrompt(input: string): CompiledPrompt {
  const sections: string[] = [];
  const changes: string[] = [];

  // 1. Task section
  sections.push(`## Task\n${input}`);
  changes.push("Added task section");

  // 2. Focus Areas (deterministic from mapping table)
  const focusAreas = selectFocusAreas(input);
  const focusSection = `## Focus Areas\n${focusAreas.map((a) => `- ${a}`).join("\n")}`;
  sections.push(focusSection);
  changes.push(`Added ${focusAreas.length} focus areas from domain mapping`);

  // 3. Search Plan
  const recency = detectRecencySensitivity(input);
  const searchSteps = generateSearchPlan(focusAreas, recency);
  const searchSection = `## Search Plan\n${searchSteps.map((s, i) => `${i + 1}) ${s}`).join("\n")}`;
  sections.push(searchSection);
  changes.push("Added search plan with evidence requirements");

  // 4. Source Policy
  const sourcePolicy = generateSourcePolicy(recency);
  sections.push(`## Source Policy\n${sourcePolicy}`);
  changes.push(`Added source policy (recency: ${recency.days} days)`);

  // 5. Return Contract
  sections.push(`## Return Contract\n${generateReturnContract()}`);
  changes.push("Added return contract with citation requirement");

  return {
    prompt: sections.join("\n\n"),
    techniques: ["research_decomposition", "source_policy", "citation_contract"],
    changes,
  };
}

// Template sections for each technique
const TECHNIQUE_TEMPLATES: Record<string, string> = {
  // Zero-Shot Family
  zero_shot_direct: `## Task
{{task}}`,

  role_prompting: `## Role
You are a senior software engineer with deep expertise in this domain. Apply best practices and consider edge cases.`,

  // Chain-of-Thought Family
  chain_of_thought: `## Approach
Think through this step by step:
1. First, understand the current state
2. Identify what needs to change
3. Plan the minimal changes required
4. Execute the changes
5. Verify the solution works`,

  zero_shot_cot: `Let's think through this step by step.`,

  // Decomposition Family
  least_to_most: `## Decomposition
Break this into smaller, sequential steps and solve each in order.`,

  plan_and_solve: `## Plan
Before implementing, create a plan:
1. Identify all components that need changes
2. Determine the order of operations
3. List potential risks or blockers
4. Execute plan step by step`,

  // Self-Critique Family
  self_consistency: `## Validation
After generating a solution, verify it by:
- Approaching the problem from a different angle
- Checking if the answer makes logical sense
- Looking for edge cases that might break it`,

  verification: `## Verification Checklist
Before completing, verify:
- [ ] Solution addresses the core problem
- [ ] No regressions introduced
- [ ] Edge cases handled
- [ ] Code compiles/tests pass (if applicable)`,

  verification_step: `## Verification
After implementing:
- Run existing tests to check for regressions
- Test the new functionality manually if needed
- Check for linting/type errors`,

  self_critique: `## Self-Review
After completing, critically evaluate:
- What could go wrong with this approach?
- Are there security implications?
- What would a senior reviewer flag?`,

  // Output Control Family
  structured_output: `## Output Format
Provide a clear, structured response. For code changes, show the specific files and lines to modify.`,

  structured_output_enforcement: `## Output Format
Return ONLY valid JSON matching the expected schema. No additional text before or after.`,

  // Code-Specific
  test_first: `## TDD Approach
1. First, write a failing test that captures the expected behavior
2. Implement the minimal code to pass the test
3. Refactor if needed while keeping tests green`,

  // Context and Clarification
  clarification_request: `## Clarification Needed
Before proceeding, I need to understand:
- What specific behavior is expected?
- Which files/components are involved?
- Are there any constraints or requirements?`,

  context_injection: `## Context
{{context}}`,

  constraints: `## Constraints
Follow these requirements strictly.`,
};

// Role mappings by task type
const TASK_ROLES: Partial<Record<TaskType, string>> = {
  code: "You are a senior software engineer with deep expertise in this domain. Apply best practices and consider edge cases.",
  synthesis: "You are a skilled technical writer who creates clear, well-structured content.",
  evaluation: "You are a thorough code reviewer who identifies issues and suggests improvements.",
  reasoning: "You are a systematic problem solver who thinks through issues methodically.",
};

/**
 * Compile a prompt from input, task type, and selected techniques
 */
export function compilePrompt(
  input: string,
  taskType: TaskType,
  techniques: TechniqueSet,
  context?: string
): CompiledPrompt {
  const sections: string[] = [];
  const appliedTechniques: string[] = [];
  const changes: string[] = [];

  // Start with role if role_prompting is selected
  if (techniques.base.includes("role_prompting")) {
    const role = TASK_ROLES[taskType] || TASK_ROLES.code;
    sections.push(`## Role\n${role}`);
    appliedTechniques.push("role_prompting");
    changes.push("Added role prompting section");
  }

  // Add clarification if needed (comes early)
  if (techniques.base.includes("clarification_request")) {
    sections.push(TECHNIQUE_TEMPLATES.clarification_request);
    appliedTechniques.push("clarification_request");
    changes.push("Added clarification request section");
  }

  // Add task description
  sections.push(`## Task\n${input}`);

  // Add context if provided
  if (context && techniques.base.includes("context_injection")) {
    sections.push(`## Context\n${context}`);
    appliedTechniques.push("context_injection");
    changes.push("Added context section");
  }

  // Add chain of thought / approach section
  if (techniques.base.includes("chain_of_thought")) {
    sections.push(TECHNIQUE_TEMPLATES.chain_of_thought);
    appliedTechniques.push("chain_of_thought");
    changes.push("Added step-by-step reasoning section");
  }

  // Add plan section
  if (techniques.base.includes("plan_and_solve")) {
    sections.push(TECHNIQUE_TEMPLATES.plan_and_solve);
    appliedTechniques.push("plan_and_solve");
    changes.push("Added planning section");
  }

  // Add decomposition
  if (techniques.base.includes("least_to_most")) {
    sections.push(TECHNIQUE_TEMPLATES.least_to_most);
    appliedTechniques.push("least_to_most");
    changes.push("Added decomposition section");
  }

  // Add verification sections
  if (techniques.base.includes("verification")) {
    sections.push(TECHNIQUE_TEMPLATES.verification);
    appliedTechniques.push("verification");
    changes.push("Added verification checklist");
  }

  if (techniques.base.includes("verification_step")) {
    sections.push(TECHNIQUE_TEMPLATES.verification_step);
    appliedTechniques.push("verification_step");
    changes.push("Added verification step section");
  }

  // Add self-critique
  if (techniques.base.includes("self_critique")) {
    sections.push(TECHNIQUE_TEMPLATES.self_critique);
    appliedTechniques.push("self_critique");
    changes.push("Added self-review section");
  }

  // Add output format (avoid duplicates if both are selected)
  const hasStructured = techniques.base.includes("structured_output");
  const hasEnforcement = techniques.base.includes("structured_output_enforcement");

  if (hasStructured && hasEnforcement) {
    // Combine: use enforcement (stricter) with context from structured
    sections.push(`## Output Format
Provide a clear, structured response. Return valid JSON matching the expected schema.`);
    appliedTechniques.push("structured_output", "structured_output_enforcement");
    changes.push("Added combined output format section (structured + JSON)");
  } else if (hasEnforcement) {
    sections.push(TECHNIQUE_TEMPLATES.structured_output_enforcement);
    appliedTechniques.push("structured_output_enforcement");
    changes.push("Added strict JSON output enforcement");
  } else if (hasStructured) {
    sections.push(TECHNIQUE_TEMPLATES.structured_output);
    appliedTechniques.push("structured_output");
    changes.push("Added output format section");
  }

  return {
    prompt: sections.join("\n\n"),
    techniques: appliedTechniques,
    changes,
  };
}

/**
 * Assess clarity of an input prompt
 * Returns a score from 0-100
 */
export function assessClarity(input: string): number {
  if (!input || input.trim() === "") {
    return 0;
  }

  let score = 0;
  const trimmed = input.trim();

  // Base score from length (longer = more specific)
  // Cap at 30 points from length
  score += Math.min(30, trimmed.length * 0.4);

  // Word count bonus (more words = more context)
  const words = trimmed.split(/\s+/).length;
  score += Math.min(30, words * 3);

  // Specificity indicators
  const specificityPatterns = [
    { pattern: /\.(ts|js|py|go|rs|java|cpp)/i, points: 15 },  // File extensions (strong signal)
    { pattern: /\/[a-z]+\//i, points: 12 },                    // Path patterns
    { pattern: /\b(function|class|method|variable|bug|error)\b/i, points: 10 }, // Code terms
    { pattern: /\b(in|at|from|to)\b/i, points: 5 },           // Prepositions add context
    { pattern: /\b(should|must|need|want)\b/i, points: 5 },   // Intent words
    { pattern: /["'`]/i, points: 5 },                          // Quotes suggest specificity
    { pattern: /\b(authentication|security|login|database)\b/i, points: 8 }, // Domain terms
    { pattern: /\b(refactor|service|component|module|dependency)\b/i, points: 8 }, // Architecture terms
    { pattern: /\b(use|using|with)\b/i, points: 3 },          // Implementation details
  ];

  for (const { pattern, points } of specificityPatterns) {
    if (pattern.test(trimmed)) {
      score += points;
    }
  }

  // Penalize very short vague inputs
  const vaguePatterns = [
    /^(do|fix|help|it|this|that)$/i,
    /^(do it|fix it|help me)$/i,
  ];

  for (const pattern of vaguePatterns) {
    if (pattern.test(trimmed)) {
      score -= 30;
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate improvement score between original and refined prompts
 */
export function calculateImprovement(original: string, refined: string): number {
  const before = assessClarity(original);
  const after = assessClarity(refined);
  return after - before;
}
