# RefinePrompt Workflow

> **Trigger:** Vague/underspecified prompt detected, "refine prompt", "improve this"
> **Input:** User prompt that needs refinement
> **Output:** Well-structured prompt with appropriate techniques applied

## Step 1: Classify Task Type

Run the classifier to determine task type:

```bash
bun run $PAI_DIR/skills/PromptCompiler/Tools/ClassifyTask.ts --input "USER_INPUT" --json
```

Task types: classification, reasoning, code, synthesis, research, evaluation, agentic

## Step 2: Assess Context

Evaluate the input for:
- **Complexity**: Is this simple or multi-step?
- **Constraints**: Security-critical? JSON output needed?
- **Specificity**: Is this underspecified?

## Step 3: Select Techniques

Based on task type and context, select complementary techniques:

```bash
bun run $PAI_DIR/skills/PromptCompiler/Tools/SelectTechniques.ts --input "USER_INPUT" --verbose
```

The decision graph will automatically:
- Apply base techniques for the task type
- Add optional techniques based on complexity
- Add cross-cutting concerns (verification for security-critical)
- Flag antipatterns to avoid

## Step 4: Compile Refined Prompt

Generate the final prompt:

```bash
bun run $PAI_DIR/skills/PromptCompiler/Tools/RefinePrompt.ts --input "USER_INPUT" --mode analysis
```

## Step 5: Present to User

Show the refined prompt with:
- Original vs refined comparison
- Techniques applied
- Clarity score improvement

## Completion

The workflow produces a refined prompt ready for use. If the improvement is significant (>20 points), offer to use the refined version.

## Skills Invoked

| Step | Skill |
|------|-------|
| Context assessment | Internal (patterns.ts) |
| Technique selection | Internal (decision-graph.ts) |
