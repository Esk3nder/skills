# CodeReview Workflow

> **Trigger:** PR URL, "review this", "check my changes", before merge
> **Input:** PR URL/number, branch name, or current diff
> **Output:** Categorized findings with severity and TodoWrite items

## Step 1: Determine Review Target

- PR URL/number provided → use that
- Branch specified → review that branch
- Otherwise → review current branch diff against main

## Step 2: Collect Context

Identify:
- Key files changed
- Tests touched
- Risky areas (auth, payments, migrations, concurrency)

## Step 3: Run Parallel Review Agents

Spawn specialized reviewers:
- **security-sentinel** - Security vulnerabilities
- **performance-oracle** - Performance implications
- **architecture-strategist** - Design patterns, maintainability

## Step 4: Synthesize Findings

Aggregate by severity:
- **P1/Critical** → blocks merge
- **P2/Important** → should fix
- **P3/Nice-to-have** → optional

## Step 5: Create Action Items

Use TodoWrite to create items for each finding that needs attention.

## Completion

Review complete with categorized findings. User can address issues or proceed based on severity.

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 3 | DispatchingParallelAgents |
