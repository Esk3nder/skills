# SpecDriven Workflow

> **Trigger:** `/spec` OR "spec kit" OR "for AI agents" OR "spec-driven"
> **Input:** PRD, feature description, or problem statement
> **Output:** GitHub Spec Kit compatible specification for AI coding agents

## Background: Why Spec-Driven?

> "We're moving from 'code is the source of truth' to 'intent is the source of truth'... With AI, the specification becomes the source of truth and determines what gets built."
> — GitHub Engineering Team (September 2025)

Traditional PRDs guide humans. Spec-driven documents **generate** implementation via AI agents.

## Step 1: Assess Input Quality

Check if input is:
- **PRD**: Full structured document → Transform to spec format
- **Feature description**: Partial info → Enrich then transform
- **Problem statement**: Needs context → Run ContextEnrich first, then transform

If insufficient, suggest: "Let me enrich this with `/context` first."

## Step 2: Extract Specification Elements

From the input, extract:

### Goals
- What user outcome does this achieve?
- What business outcome does this achieve?
- How will we know it succeeded?

### User Journeys
- Primary happy path (step by step)
- Key alternative paths
- Error/edge cases

### Constraints
- Technical constraints (APIs, performance, etc.)
- Business constraints (legal, compliance, etc.)
- Design constraints (UX patterns, accessibility)

### Non-Goals (Critical for AI Agents)
- What we explicitly won't build
- What behavior must NOT change
- Boundaries AI should respect

## Step 3: Generate Spec-Driven Document

Use the GitHub Spec Kit structure:

```markdown
# Specification: [Feature Name]

## Meta
- **Version:** 1.0
- **Status:** Draft
- **Author:** [User]
- **Date:** [Today]

---

## 1. SPECIFY

### 1.1 Goals
**User Goal:** [What the user achieves]
**Business Goal:** [What the business achieves]
**Success Criteria:**
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

### 1.2 User Journeys

**Primary Journey:**
1. User [action]
2. System [response]
3. User [action]
4. System [response]
5. User achieves [outcome]

**Alternative Journey (Edge Case):**
1. User [action with edge condition]
2. System [handles gracefully]

### 1.3 Non-Goals
- NOT building [explicit exclusion]
- NOT changing [existing behavior]
- NOT supporting [out of scope case]

---

## 2. PLAN

### 2.1 Architecture
```
[Component diagram or description]
```

### 2.2 Stack
- **Frontend:** [Technology]
- **Backend:** [Technology]
- **Database:** [Technology]
- **External APIs:** [List]

### 2.3 Constraints
| Constraint | Requirement |
|------------|-------------|
| Performance | [e.g., < 200ms response] |
| Security | [e.g., auth required] |
| Compatibility | [e.g., supports X browsers] |

### 2.4 Dependencies
- [Existing service/module this depends on]
- [External API this requires]

---

## 3. TASKS

### Task 1: [Component/Feature]
**Description:** [What to build]
**Acceptance Criteria:**
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]

**DO NOT CHANGE:**
- [Existing code/behavior to preserve]

### Task 2: [Component/Feature]
**Description:** [What to build]
**Acceptance Criteria:**
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]

**DO NOT CHANGE:**
- [Existing code/behavior to preserve]

### Task 3: [Tests]
**Description:** Test coverage for Tasks 1-2
**Acceptance Criteria:**
- [ ] Unit tests for [component]
- [ ] Integration test for [journey]
- [ ] Edge case coverage for [scenario]

---

## 4. IMPLEMENT

### Validation Checkpoints
- [ ] Task 1 complete and tests pass
- [ ] Task 2 complete and tests pass
- [ ] Integration tests pass
- [ ] Manual QA approved
- [ ] No regressions in DO NOT CHANGE areas

### Rollback Criteria
If any of these occur, revert:
- [Failure condition 1]
- [Failure condition 2]

---

## Appendix

### A. Relevant Context
[Links to related PRDs, designs, or documentation]

### B. Open Questions
- [Unresolved decision 1]
- [Unresolved decision 2]

### C. References
[Lenny's Podcast insights, frameworks applied]
```

## Step 4: Apply DO NOT CHANGE Pattern

> "Be explicit about what shouldn't change when adding new functionality."

For each task, identify:
1. Existing files that will be modified
2. Behavior that must remain unchanged
3. APIs or interfaces that are stable

Add explicit `DO NOT CHANGE` sections.

## Step 5: Validate Specification Quality

Check against Spec Kit principles:

- [ ] **Unambiguous**: Could an AI misinterpret any requirement?
- [ ] **Complete**: Are all user journeys covered?
- [ ] **Testable**: Is every acceptance criterion verifiable?
- [ ] **Bounded**: Are non-goals explicit?
- [ ] **Reversible**: Is rollback criteria defined?

## Step 6: Present and Iterate

Show the spec to user:
- "Here's your spec-driven document for AI agents."
- "The DO NOT CHANGE sections protect existing functionality."
- "Each task has testable acceptance criteria."

Ask: "Should I adjust scope, add more tasks, or clarify any section?"

## Completion

Specification is complete when:
- [ ] SPECIFY section defines goals and journeys
- [ ] PLAN section declares architecture and constraints
- [ ] TASKS are small and reviewable with acceptance criteria
- [ ] DO NOT CHANGE sections protect existing behavior
- [ ] Validation checkpoints defined

Hand off to:
- **Engineer** skill for implementation
- **WritingPlans** for detailed implementation planning

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 1 (if needed) | ContextEnrich workflow |
| Step 3 | PRD template application |
| Post-completion | Engineer (implementation) |
| Post-completion | WritingPlans (detailed planning) |
