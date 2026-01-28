# PRD Template

Use this template when generating PRDs with the WritePRD workflow.

---

# [Feature Name] PRD

## Meta
- **Author:** [User name]
- **Date:** [Today's date]
- **Status:** Draft | In Review | Approved | In Development | Shipped
- **Version:** 1.0
- **Last Updated:** [Date]

---

## Problem Statement

> "Product people are in the business of changing behavior." — Teresa Torres

[Describe the problem in terms of user behavior, NOT missing features]

**Current State:**
[What users do today / current workaround]

**Desired State:**
[What behavior we want to enable]

**Impact:**
[Why this matters - quantify if possible]

---

## Success Metrics

> "Failing to define goals upfront is a big PRD mistake." — PRD Best Practices

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|-------------------|
| [Primary outcome metric] | [Current] | [Goal] | [How measured] |
| [Secondary metric] | [Current] | [Goal] | [How measured] |
| [Guardrail metric] | [Current] | [Threshold] | [How measured] |

**North Star:** [Single most important metric]

---

## User Personas

**Primary User:**
- **Who:** [Description]
- **Current behavior:** [What they do today]
- **Pain point:** [Specific frustration]
- **Quote:** "[Something they might say]"

**Secondary User (if applicable):**
- **Who:** [Description]
- **How they differ:** [Key distinction from primary]

---

## Proposed Solution

> "A rookie mistake is putting too much detail, making requirements too prescriptive." — PRD Best Practices

[High-level approach - stay non-prescriptive to enable creativity]

**Key Capabilities:**
1. [Capability 1]
2. [Capability 2]
3. [Capability 3]

**User Journey:**
1. User [action]
2. System [response]
3. User [achieves outcome]

---

## DHM Evaluation

> "Delight customers in hard-to-copy, margin-enhancing ways." — Gibson Biddle (Netflix)

### Delight
- **Score:** [1-5]
- **Assessment:** [Does this 10X improve the experience?]
- **Evidence:** [Why you believe this]

### Hard-to-Copy
- **Score:** [1-5]
- **Assessment:** [What creates competitive moat?]
- **Moat type:** [Network effects / Brand / Data / Switching costs / Scale]

### Margin-Enhancing
- **Score:** [1-5]
- **Assessment:** [Business impact - positive, neutral, or negative?]
- **Trade-off:** [If negative margin, what justifies it?]

---

## Assumptions to Test

> "Run 6-12 assumption tests per week across 3 ideas." — Teresa Torres

| Assumption | Risk Level | Test Method | Timeline |
|------------|------------|-------------|----------|
| [Users want X] | High | [User interviews] | [3 days] |
| [Technical feasibility of Y] | Medium | [Spike/prototype] | [1 week] |
| [Business model Z works] | High | [A/B test] | [2 weeks] |

**Riskiest Assumption:** [Which one could kill this?]

---

## Out of Scope

> "Great PRDs include boundaries—what is in scope and out of scope." — PRD Best Practices

**Explicitly NOT building:**
- [Non-goal 1]
- [Non-goal 2]
- [Non-goal 3]

**Future considerations (not now):**
- [Deferred item 1]
- [Deferred item 2]

---

## Risks & Constraints

### Constraints
| Type | Constraint |
|------|------------|
| Technical | [e.g., Must work on mobile] |
| Business | [e.g., Cannot increase price] |
| Legal | [e.g., GDPR compliance required] |
| Timeline | [e.g., Must ship before Q2] |

### Pre-Mortem (Shreyas Doshi)

**Tiger** (real threat that could kill this):
- [What could actually fail?]

**Paper Tiger** (false concern others worry about):
- [What seems scary but isn't?]

**Elephant** (unspoken issue):
- [What's nobody talking about?]

---

## DO NOT CHANGE (for AI Agents)

> "Be explicit about what shouldn't change when adding new functionality." — GitHub Spec Kit

**Protected functionality:**
- [Existing feature 1 that must not break]
- [API contract that must remain stable]
- [User flow that must not change]

**Invariants:**
- [Technical invariant 1]
- [Business rule that must hold]

---

## Open Questions

- [ ] [Decision needed 1 - who decides?]
- [ ] [Decision needed 2 - by when?]
- [ ] [Ambiguity to resolve]

---

## Dependencies

**Depends on:**
- [Team/service 1]: [What we need from them]
- [External API]: [Integration required]

**Blocks:**
- [Team/feature 1]: [They're waiting on us for X]

---

## Rollout Plan

**Phase 1:** [Internal testing]
- Audience: [Who]
- Duration: [How long]
- Success criteria: [What must be true to proceed]

**Phase 2:** [Limited release]
- Audience: [Who]
- Percentage: [X%]
- Duration: [How long]

**Phase 3:** [General availability]
- Rollback criteria: [When to revert]

---

## References

### Lenny's Podcast Insights
[Relevant quotes retrieved from LennyHub RAG]

### Related Documents
- [Design spec link]
- [Technical spec link]
- [Research findings link]

### Frameworks Applied
- DHM Model (Gibson Biddle)
- Opportunity Solution Tree (Teresa Torres)
- Pre-Mortem (Shreyas Doshi)

---

## Appendix

### A. Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|-------------|------|------|---------|
| [Option 1] | [...] | [...] | [...] |
| [Option 2] | [...] | [...] | [...] |

### B. Research Summary
[Key findings from user research, if conducted]

### C. Technical Notes
[Any technical context reviewers should know]

---

*Template version: 1.0 | Based on PRD Best Practices Vol 1-3*
