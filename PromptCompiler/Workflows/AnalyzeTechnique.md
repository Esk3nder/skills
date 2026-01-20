# AnalyzeTechnique Workflow

> **Trigger:** "explain technique", "when to use CoT", "what is chain of thought"
> **Input:** Technique name or family to analyze
> **Output:** Detailed explanation with when to use/avoid

## Step 1: Identify Technique

Map user query to technique name:
- "CoT" → `chain_of_thought`
- "step by step" → `chain_of_thought`
- "verification" → `verification`
- "decomposition" → `least_to_most` or `plan_and_solve`

## Step 2: Retrieve Technique Info

Look up in TechniqueRegistry.yaml or use:

```bash
bun run $PAI_DIR/skills/PromptCompiler/Tools/SelectTechniques.ts --input "example" --verbose
```

## Step 3: Explain Technique

Provide:

### Definition
What the technique does and its core mechanism.

### When to Use
- Task types that benefit
- Complexity levels
- Context indicators

### When to Avoid (Antipatterns)
- Task types where it hurts performance
- Example: CoT hurts classification accuracy

### Example
Show before/after with technique applied.

## Step 4: Show Related Techniques

Techniques that compose well or alternatives:
- `chain_of_thought` + `verification` for reasoning
- `plan_and_solve` vs `least_to_most` for decomposition

## Completion

User understands when and how to apply the technique.

## Skills Invoked

| Step | Skill |
|------|-------|
| Technique lookup | Internal (TechniqueRegistry.yaml) |
