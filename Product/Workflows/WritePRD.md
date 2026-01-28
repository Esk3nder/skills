# WritePRD Workflow

> **Trigger:** `/prd` OR "write PRD" OR "create specification" OR "feature spec"
> **Input:** Problem statement, feature idea, or product concept
> **Output:** Structured PRD following best practices from Lenny's Podcast and modern frameworks

## Step 1: Understand the Request

Extract from user input:
- **Problem or idea**: What are they trying to solve/build?
- **Context**: Any constraints, timeline, or stakeholders mentioned?
- **Scope hints**: Is this a small feature or major initiative?

If unclear, ask clarifying questions:
- "What problem does this solve for users?"
- "Who is the target user?"
- "What does success look like?"

## Step 2: Query LennyHub RAG

Use the QueryLenny tool to retrieve relevant insights:

```bash
bun run $PAI_DIR/skills/Product/Tools/QueryLenny.ts --query "[problem domain] best practices"
```

**Search for:**
1. Similar problem domains (e.g., "user onboarding", "data export", "notifications")
2. Relevant frameworks (prioritization, trade-offs, metrics)
3. Anti-patterns to avoid

## Step 3: Apply Frameworks

### 4W1H Analysis
| Question | Answer |
|----------|--------|
| **Who** | Target users/personas |
| **What** | Feature being built |
| **When** | Timeline/milestones |
| **Where** | Context of use |
| **How** | Success measurement |

### DHM Evaluation (Gibson Biddle)
- **Delight**: Does this 10X improve the user experience?
- **Hard-to-copy**: What creates competitive moat?
- **Margin**: How does this impact the business?

### Assumption Identification (Teresa Torres)
List 3-5 key assumptions that must be true for this to succeed.

## Step 4: Generate PRD

Use the template structure:

```markdown
# [Feature Name] PRD

## Meta
- **Author:** [User name from CORE]
- **Date:** [Today]
- **Status:** Draft
- **Version:** 1.0

## Problem Statement
[Describe the problem, NOT the solution. Use behavior-focused language.]

> "Product people are in the business of changing behavior." — Teresa Torres

## Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| [Primary outcome] | [Specific goal] | [How measured] |
| [Secondary outcome] | [Specific goal] | [How measured] |

## User Personas
[Who experiences this problem? What's their current behavior?]

## Proposed Solution
[High-level approach - stay non-prescriptive to enable creativity]

> "A rookie mistake is putting too much detail, making requirements too prescriptive." — PRD Best Practices

## DHM Evaluation
- **Delight:** [Assessment]
- **Hard-to-copy:** [Assessment]
- **Margin:** [Assessment]

## Assumptions to Test
| Assumption | Test Method | Timeline |
|------------|-------------|----------|
| [Assumption 1] | [Experiment/interview] | [Days] |
| [Assumption 2] | [Experiment/interview] | [Days] |

> "Run 6-12 assumption tests per week across 3 ideas." — Teresa Torres

## Out of Scope
- [Explicit non-goal 1]
- [Explicit non-goal 2]

> "Great PRDs include boundaries—what is in scope and out of scope." — PRD Best Practices

## Risks & Constraints
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| [Risk] | H/M/L | [Plan] |

### Pre-Mortem (Shreyas Doshi)
- **Tiger** (real threat): [What could actually kill this]
- **Paper Tiger** (false concern): [What seems scary but isn't]
- **Elephant** (unspoken): [What nobody is addressing]

## DO NOT CHANGE (for AI agents)
[List any existing functionality that must remain unchanged]

## Open Questions
- [Decision needed 1]
- [Decision needed 2]

## References
[Relevant Lenny's Podcast insights retrieved from RAG]
```

## Step 5: Review with User

Present the PRD and ask:
1. "Does the problem statement capture the core issue?"
2. "Are these the right success metrics?"
3. "What assumptions feel riskiest?"

Iterate based on feedback.

## Step 6: Log and Save

Log to history:
```bash
echo '{"timestamp":"'$(date -Iseconds)'","workflow":"WritePRD","input":"[summary]","output_file":"[path]"}' >> ~/.claude/history/product.jsonl
```

Save PRD to user-specified location or suggest:
- Project docs folder
- `/home/skish/canonical/` for reference PRDs

## Completion

PRD is complete when:
- [ ] Problem is behavior-focused, not solution-focused
- [ ] Success metrics are measurable
- [ ] Assumptions are testable
- [ ] Out-of-scope is explicit
- [ ] DHM evaluation is present
- [ ] Pre-mortem identifies real risks

Hand off to:
- **Brainstorming** skill for deeper design exploration
- **SpecDriven** workflow for AI-agent-ready specs
- **WritingPlans** skill for implementation planning

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 2 | QueryLenny tool (internal) |
| Post-completion | Brainstorming (optional) |
| Post-completion | WritingPlans (optional) |
