# ContextEnrich Workflow

> **Trigger:** `/context` OR "add context" OR "explore problem" OR "problem discovery"
> **Input:** Brief problem statement or feature idea
> **Output:** Enriched problem with frameworks, discovery questions, and anti-patterns to avoid

## Step 1: Parse the Problem Statement

Extract:
- **Core problem**: What's the user pain point?
- **Domain**: What area does this touch? (activation, retention, monetization, etc.)
- **Signals**: Any metrics or behaviors mentioned?

## Step 2: Identify Relevant Frameworks

Based on the domain, retrieve applicable frameworks:

| Domain | Frameworks |
|--------|------------|
| **New features** | DHM Model, Opportunity Solution Tree |
| **Prioritization** | Pre-mortem, Inner/Outer Scorecard |
| **User research** | Continuous Discovery, Behavior over Opinion |
| **Strategy** | Vision + Framework + Roadmap |
| **Growth** | Prioritization & Roadmapping, Hypothesis Testing |
| **Stakeholders** | "Yes, And...", Cross-functional Missions |

## Step 3: Query LennyHub for Similar Problems

Search for how product leaders approached similar challenges:

```bash
bun run $PAI_DIR/skills/Product/Tools/QueryLenny.ts --query "[problem domain] challenges"
```

Look for:
- Similar problem patterns
- Solutions that worked/failed
- Counter-intuitive insights

## Step 4: Generate Discovery Questions

Create questions the user should answer:

### User Understanding
- Who exactly experiences this problem?
- What's their current behavior/workaround?
- How do they describe the problem in their own words?

### Problem Validation
- How do we know this is a real problem (not assumed)?
- What data supports the problem exists?
- How frequently does this occur?

### Strategic Fit
- How does solving this align with product vision?
- Which strategic pillar does this support?
- What's the opportunity cost of NOT solving this?

### Assumptions
- What must be true for this to matter?
- What assumptions are we making about user behavior?
- Which assumption is riskiest?

## Step 5: Identify Anti-Patterns

Warn about common mistakes for this type of problem:

### Feature-as-Problem Anti-Pattern
> "A big mistake PMs make is describing the customer problem as 'our app can't do X' where X is a feature the product doesn't have."

**Check:** Is the problem stated as a missing feature or a user need?

### Solution-First Thinking
> "Steve Jobs highlighted the disease of managers, where they think an idea is 90% of the work."

**Check:** Are we exploring the problem or jumping to solutions?

### Outcome vs Output Confusion
> "If it doesn't actually solve the problem, it's nothing to brag about."

**Check:** Are we measuring features shipped or problems solved?

### Missing Constraints
> "Algorithms optimize objectives; humans define constraints."

**Check:** Have we articulated what we're NOT optimizing for?

## Step 6: Generate Enriched Output

Structure:

```markdown
## Problem Enrichment: [Original Statement]

### Reframed Problem
[Problem restated in behavior-focused terms]

### Applicable Frameworks

**[Framework 1]**: [Why it applies]
- Key question: [...]
- Key question: [...]

**[Framework 2]**: [Why it applies]
- Key question: [...]

### Discovery Questions to Answer
1. [Question about users]
2. [Question about validation]
3. [Question about strategy]
4. [Question about assumptions]

### Anti-Patterns to Avoid
- **[Anti-pattern]**: [Why it's dangerous here]
- **[Anti-pattern]**: [Why it's dangerous here]

### What Lenny's Guests Say
> "[Relevant quote]" — **[Speaker]**

### Suggested Next Steps
1. [Interview X users about Y]
2. [Analyze data on Z]
3. [Test assumption A with B method]

### Assumptions to Test
| Assumption | Risk Level | Test Method |
|------------|------------|-------------|
| [Assumption] | High/Med/Low | [Method] |
```

## Step 7: Offer Next Actions

Ask user:
- "Would you like to proceed to a full PRD? (`/prd`)"
- "Should I search for more specific insights? (`/ask-lenny`)"
- "Ready to create a spec for AI agents? (`/spec`)"

## Completion

Context enrichment is complete when:
- [ ] Problem reframed in behavior terms
- [ ] 2+ frameworks identified
- [ ] 4+ discovery questions generated
- [ ] Anti-patterns flagged
- [ ] Assumptions listed with risk levels

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 3 | QueryLenny tool (internal) |
| Post-completion | WritePRD workflow (optional) |
| Post-completion | AskLenny workflow (optional) |
