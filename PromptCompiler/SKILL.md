---
name: PromptCompiler
description: Transform lazy/underspecified inputs into best-practice prompts using deterministic task classification and technique selection. USE WHEN vague prompt OR prompt refinement OR underspecified input OR improve prompt quality OR technique selection.
---

# PromptCompiler

Deterministic prompt refinement system based on "The Prompt Report" taxonomy. Transforms vague inputs like "fix it" into well-structured prompts with appropriate techniques (CoT, verification, decomposition, etc.).

**Announce at start:** "I'm using the PromptCompiler skill to refine this prompt."

## Architecture

```
Input → Task Classifier → Technique Selector → Prompt Compiler → Refined Prompt
         (patterns.ts)    (decision-graph.ts)    (compiler.ts)
```

Four-layer deterministic pipeline:
1. **Task Classifier** - Pattern matching to identify task type (code, reasoning, synthesis, etc.)
2. **Technique Selector** - Decision graph picks complementary techniques based on task + complexity
3. **Prompt Compiler** - Template-based assembly of selected techniques
4. **LLM Refinement** - Optional fallback for ambiguous cases

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **RefinePrompt** | "refine prompt", "improve this", vague input detected | `Workflows/RefinePrompt.md` |
| **AnalyzeTechnique** | "explain technique", "when to use CoT" | `Workflows/AnalyzeTechnique.md` |

## CLI Tools

### RefinePrompt.ts (Main Pipeline)

```bash
# Basic refinement
bun run $PAI_DIR/skills/PromptCompiler/Tools/RefinePrompt.ts --input "fix the bug"

# With context
bun run $PAI_DIR/skills/PromptCompiler/Tools/RefinePrompt.ts --input "analyze this" --context "src/auth.ts"

# Show analysis
bun run $PAI_DIR/skills/PromptCompiler/Tools/RefinePrompt.ts --input "security fix" --mode analysis

# JSON output
bun run $PAI_DIR/skills/PromptCompiler/Tools/RefinePrompt.ts --input "..." --json
```

### ClassifyTask.ts

```bash
# Classify task type
bun run $PAI_DIR/skills/PromptCompiler/Tools/ClassifyTask.ts --input "why does this fail?"

# Verbose with constraints
bun run $PAI_DIR/skills/PromptCompiler/Tools/ClassifyTask.ts --input "fix production bug" --verbose
```

### SelectTechniques.ts

```bash
# Auto-select techniques
bun run $PAI_DIR/skills/PromptCompiler/Tools/SelectTechniques.ts --input "complex refactoring"

# With descriptions
bun run $PAI_DIR/skills/PromptCompiler/Tools/SelectTechniques.ts --input "explain algorithm" --verbose
```

### CompilePrompt.ts

```bash
# Auto-compile
bun run $PAI_DIR/skills/PromptCompiler/Tools/CompilePrompt.ts --input "fix the bug" --auto

# Specific techniques
bun run $PAI_DIR/skills/PromptCompiler/Tools/CompilePrompt.ts --input "test" --techniques chain_of_thought,verification
```

## Task Types

| Type | Description | Example |
|------|-------------|---------|
| **classification** | Binary/categorical decisions | "is this code secure?" |
| **reasoning** | Logical analysis, causal explanation | "why does this fail?" |
| **code** | Software engineering tasks | "fix the auth bug" |
| **synthesis** | Content creation | "write a function" |
| **research** | Information gathering | "find all API endpoints" |
| **evaluation** | Assessment, review | "review this PR" |
| **agentic** | Multi-step autonomous tasks | "set up CI/CD" |

## Technique Families

| Family | Techniques | When Applied |
|--------|------------|--------------|
| **Zero-Shot** | `zero_shot_direct`, `role_prompting` | Simple tasks, clear intent |
| **CoT** | `chain_of_thought`, `zero_shot_cot` | Reasoning, math, logic |
| **Decomposition** | `plan_and_solve`, `least_to_most` | Complex multi-step |
| **Self-Critique** | `verification`, `self_critique` | High-stakes, correctness critical |
| **Output Control** | `structured_output`, `constraints` | Format requirements |
| **Code-Specific** | `test_first`, `verification_step` | Software engineering |

## Multi-Technique Composition

Techniques are **additive** - multiple techniques compose into a single prompt:

```
"fix the security vulnerability"
  → Task: code
  → Base: structured_output, verification_step
  → Cross-cutting: self_critique, verification (correctness-critical)
  → Final: 4 techniques composed together
```

## Examples

**Example 1: Vague input refinement**
```
User: "fix it"
→ Invokes RefinePrompt
→ Detects underspecified input
→ Adds clarification_request + verification_step
→ Output includes "## Clarification Needed" section
```

**Example 2: Security-critical task**
```
User: "fix the auth vulnerability"
→ Detects task_type=code + correctness_critical
→ Adds self_critique + verification
→ Output includes "## Self-Review" and "## Verification" sections
```

**Example 3: Reasoning task**
```
User: "why does this timeout?"
→ Detects task_type=reasoning
→ Adds chain_of_thought
→ Output includes "## Approach" with step-by-step structure
```

## Data Files

| File | Purpose |
|------|---------|
| `Data/TaskPatterns.yaml` | Regex patterns for task classification |
| `Data/TechniqueRegistry.yaml` | Technique definitions from "The Prompt Report" |

## Library Files

| File | Exports |
|------|---------|
| `Tools/lib/patterns.ts` | `classifyTask()`, `assessComplexity()`, `extractConstraints()` |
| `Tools/lib/decision-graph.ts` | `selectTechniques()`, `getTechniqueInfo()` |
| `Tools/lib/compiler.ts` | `compilePrompt()`, `assessClarity()` |

## Related Skills

**Uses:**
- **Prompting** - References Standards.md for best practices

**Used by:**
- **Hooks** - Can integrate with `prompt-clarity-assessor.ts`
- **ContextEngineering** - For context optimization
