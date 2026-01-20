# Route Workflow

> **Trigger:** Any non-trivial task starting
> **Input:** User request or detected intent
> **Output:** Routing decision to appropriate skill

## Step 1: Pause and Analyze

Before responding to any non-trivial task, scan the intent:
- Is this brainstorming/exploration?
- Is this planning?
- Is this execution?
- Is this debugging?
- Is this testing?
- Is this review?
- Is this finishing/completion?

## Step 2: Route to Highest Priority Match

Priority order:
1. **Brainstorming** - New features, exploration
2. **WritingPlans** - Plan creation
3. **ExecutingPlans** - Following existing plans
4. **SystematicDebugging** - Bug fixes, errors
5. **TestDrivenDevelopment** - Test failures
6. **VerificationBeforeCompletion** - Lint/type failures
7. **Review** - Code review requests
8. **FinishingBranch** - Completing work

## Step 3: Handle Error States

Auto-route on failures:
- Test failure → `TestDrivenDevelopment`
- Lint/type failure → `VerificationBeforeCompletion`
- Exception/tool failure → `SystematicDebugging`
- Plan drift → `WritingPlans` then `ExecutingPlans`

## Completion

State which skill is being followed to maintain deterministic routing.

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 2 | One of: Brainstorming, WritingPlans, ExecutingPlans, SystematicDebugging, TestDrivenDevelopment, VerificationBeforeCompletion, Review, FinishingBranch |
