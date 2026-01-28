# AnalyzeFeedback Workflow

> **Trigger:** `/analyze-feedback` OR "user feedback" OR "synthesize feedback"
> **Input:** Feedback data (file, URL, or pasted text)
> **Output:** Synthesized insights with patterns, priorities, and recommendations

## Step 1: Ingest Feedback Data

Accept feedback from:
- **File**: CSV, JSON, or text file with feedback entries
- **Pasted text**: Direct input of feedback
- **API** (if configured): Intercom, Zendesk exports

Parse feedback to extract:
- **Content**: The actual feedback text
- **Source**: Where it came from (support, survey, review, etc.)
- **Date**: When it was submitted
- **User segment**: If available (plan type, tenure, etc.)

## Step 2: Categorize Feedback

Classify each piece of feedback:

| Category | Description |
|----------|-------------|
| **Feature Request** | User wants something new |
| **Bug Report** | Something is broken |
| **Usability Issue** | Works but confusing |
| **Praise** | Positive feedback |
| **Complaint** | Negative without specific ask |
| **Question** | Seeking help/clarification |
| **Churn Signal** | Indicating potential departure |

## Step 3: Extract Patterns

Group similar feedback:

### By Theme
Cluster feedback around common topics:
- [Theme 1]: N mentions
- [Theme 2]: N mentions
- [Theme 3]: N mentions

### By Sentiment
- Positive: N (X%)
- Neutral: N (X%)
- Negative: N (X%)

### By User Segment (if available)
- Enterprise users: [Key themes]
- SMB users: [Key themes]
- New users: [Key themes]
- Power users: [Key themes]

## Step 4: Apply Product Frameworks

### Gibson Biddle's Warning
> "Customer feedback is critical, but it can't be the main input to the product roadmap. Accepting every customer's wish is a one-way street to a Frankenstein product."

**Analysis:** Which requests align with strategy vs. one-off wishes?

### Teresa Torres on Behavior
> "Product people are in the business of changing behavior. The real measure is: what did you actually do?"

**Analysis:** Which feedback describes behavior vs. opinion?

### Continuous Discovery Check
- Are we hearing from representative users?
- Are we hearing the same things repeatedly?
- What assumptions does this validate/invalidate?

## Step 5: Generate Priority Recommendations

Score feature requests by:

| Factor | Weight | Score (1-5) |
|--------|--------|-------------|
| **Frequency** | How often requested? | 30% |
| **Impact** | How much does it matter? | 25% |
| **Strategic Fit** | Aligns with vision? | 25% |
| **Effort** | Cost to implement? | 20% |

### Priority Matrix
```
High Impact, Low Effort → DO FIRST
High Impact, High Effort → PLAN
Low Impact, Low Effort → CONSIDER
Low Impact, High Effort → AVOID
```

## Step 6: Generate Analysis Report

```markdown
# Feedback Analysis: [Date Range/Source]

## Executive Summary
[3-4 sentence overview of key findings]

---

## Volume Overview
| Metric | Value |
|--------|-------|
| Total feedback items | [N] |
| Date range | [Start - End] |
| Sources | [List] |

---

## Sentiment Distribution
```
Positive: ████████░░ 40%
Neutral:  ██████░░░░ 30%
Negative: ██████░░░░ 30%
```

---

## Top Themes

### 1. [Theme Name] (N mentions, X%)
**Summary:** [What users are saying]

**Representative quotes:**
> "[Quote 1]"
> "[Quote 2]"

**Recommendation:** [Action to take]

### 2. [Theme Name] (N mentions, X%)
**Summary:** [What users are saying]

**Representative quotes:**
> "[Quote 1]"
> "[Quote 2]"

**Recommendation:** [Action to take]

### 3. [Theme Name] (N mentions, X%)
...

---

## Feature Requests (Prioritized)

| Request | Frequency | Impact | Fit | Effort | Priority |
|---------|-----------|--------|-----|--------|----------|
| [Request 1] | High | High | Yes | Med | **DO FIRST** |
| [Request 2] | Med | High | Yes | High | **PLAN** |
| [Request 3] | High | Low | No | Low | **AVOID** |

---

## Bug Reports

| Issue | Frequency | Severity | Status |
|-------|-----------|----------|--------|
| [Bug 1] | N | High | [Known/New] |
| [Bug 2] | N | Med | [Known/New] |

---

## Churn Signals
**Warning indicators detected:**
- [Signal 1]: N mentions
- [Signal 2]: N mentions

**Recommended actions:**
1. [Intervention 1]
2. [Intervention 2]

---

## Strategic Considerations

### Aligns with Strategy
[Requests that fit product vision]

### Customer Wishes to Decline
> "Accepting every customer's wish is a one-way street to a Frankenstein product." — Gibson Biddle

[Requests that don't fit, with reasoning]

---

## Assumptions Validated/Invalidated

| Assumption | Status | Evidence |
|------------|--------|----------|
| [Assumption 1] | Validated | [N users confirm] |
| [Assumption 2] | Invalidated | [Contrary feedback] |

---

## Recommended Next Steps
1. [Action with highest priority]
2. [Action with second priority]
3. [Research needed]

---

*Analysis generated on [date]*
```

## Completion

Feedback analysis is complete when:
- [ ] All feedback categorized
- [ ] Patterns identified with frequency
- [ ] Priority recommendations made
- [ ] Strategic alignment assessed
- [ ] Churn signals flagged

Hand off to:
- **WritePRD** for high-priority feature requests
- **ContextEnrich** for deeper problem exploration

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 1 | Read (file input) |
| Step 5 | Priority frameworks |
| Post-completion | WritePRD (optional) |
