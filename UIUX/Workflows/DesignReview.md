# DesignReview Workflow

> **Trigger:** "review design", "mockup feedback", "UI critique"
> **Input:** Screenshot, mockup, or description of UI
> **Output:** Structured feedback with prioritized recommendations

## Step 1: Gather Context

Before reviewing, understand:
- What is the purpose of this UI?
- Who are the target users?
- What platform/device is it for?
- Are there existing design system constraints?

If a screenshot is provided, use the Read tool to view it.

## Step 2: Visual Hierarchy Analysis

Evaluate how the design guides user attention:

| Element | Check |
|---------|-------|
| **Primary action** | Is it clearly the most prominent element? |
| **Information flow** | Does the eye move logically through content? |
| **Spacing** | Is related content grouped? Is there breathing room? |
| **Typography** | Does hierarchy communicate importance? |

## Step 3: Accessibility Audit

Check against WCAG 2.1 guidelines:

### Color & Contrast
- [ ] Text contrast ratio >= 4.5:1 (normal text)
- [ ] Text contrast ratio >= 3:1 (large text)
- [ ] Information not conveyed by color alone
- [ ] Focus indicators visible

### Content
- [ ] Meaningful alt text for images
- [ ] Form labels associated with inputs
- [ ] Error messages clear and specific
- [ ] Touch targets >= 44x44px (mobile)

### Structure
- [ ] Logical heading hierarchy
- [ ] Skip links for navigation
- [ ] Keyboard navigation order logical

## Step 4: Usability Heuristics Check

Apply Nielsen's heuristics:

| Heuristic | Questions to Ask |
|-----------|------------------|
| **System status** | Does user know what's happening? Loading states? |
| **Real world match** | Is language familiar to users? |
| **User control** | Can users undo? Is there a clear exit? |
| **Consistency** | Does it follow platform conventions? |
| **Error prevention** | Are destructive actions confirmed? |
| **Recognition** | Are options visible vs. hidden? |
| **Flexibility** | Are there shortcuts for power users? |
| **Aesthetics** | Is there unnecessary clutter? |
| **Error recovery** | Are error messages helpful? |
| **Help** | Is help available when needed? |

## Step 5: Provide Structured Feedback

Organize feedback by priority:

### Critical Issues (Must Fix)
- Accessibility blockers
- Broken user flows
- Major usability problems

### Important Issues (Should Fix)
- Confusing interactions
- Inconsistent patterns
- Minor accessibility issues

### Suggestions (Nice to Have)
- Visual refinements
- Enhanced micro-interactions
- Edge case improvements

## Step 6: Actionable Recommendations

For each issue, provide:
1. **What's wrong** - Clear description
2. **Why it matters** - User impact
3. **How to fix** - Specific solution

Example format:
```
**Issue:** Submit button has low contrast (2.1:1 ratio)
**Impact:** Users with low vision may not see it
**Fix:** Change background to #1a73e8 for 7:1 ratio
```

## Completion

Deliver review as a structured report:
1. Summary (1-2 sentences)
2. Critical issues (if any)
3. Important issues
4. Suggestions
5. Strengths (what works well)

Ask: "Would you like me to elaborate on any of these points or help implement the fixes?"

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
