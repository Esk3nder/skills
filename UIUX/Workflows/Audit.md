# Audit Workflow

> **Trigger:** "audit interface", "check accessibility", "quality check"
> **Input:** Interface, component, or codebase to audit
> **Output:** Comprehensive report with prioritized issues and recommendations

## Step 1: Diagnostic Scan

Run systematic checks across multiple dimensions:

### 1. Accessibility (A11y)

| Check | What to Look For |
|-------|------------------|
| **Contrast** | Text contrast < 4.5:1 (or 7:1 for AAA) |
| **ARIA** | Interactive elements without roles, labels, states |
| **Keyboard** | Missing focus indicators, illogical tab order, traps |
| **Semantic HTML** | Improper heading hierarchy, missing landmarks, divs instead of buttons |
| **Alt text** | Missing or poor image descriptions |
| **Forms** | Inputs without labels, poor errors, missing required indicators |

### 2. Performance

| Check | What to Look For |
|-------|------------------|
| **Layout thrashing** | Reading/writing layout properties in loops |
| **Expensive animations** | Animating width, height, top, left (use transform/opacity) |
| **Missing optimization** | No lazy loading, unoptimized assets |
| **Bundle size** | Unnecessary imports, unused dependencies |
| **Render performance** | Unnecessary re-renders, missing memoization |

### 3. Theming

| Check | What to Look For |
|-------|------------------|
| **Hard-coded colors** | Colors not using design tokens |
| **Broken dark mode** | Missing variants, poor contrast in dark theme |
| **Inconsistent tokens** | Wrong tokens, mixing token types |
| **Theme switching** | Values that don't update on theme change |

### 4. Responsive Design

| Check | What to Look For |
|-------|------------------|
| **Fixed widths** | Hard-coded widths that break on mobile |
| **Touch targets** | Interactive elements < 44x44px |
| **Horizontal scroll** | Content overflow on narrow viewports |
| **Text scaling** | Layouts that break when text size increases |

### 5. Anti-Patterns (CRITICAL)

Check against ALL DON'T guidelines in SKILL.md:
- AI color palette (cyan-on-dark, purple gradients)
- Gradient text, glassmorphism, hero metrics
- Card grids, nested cards
- Generic fonts (Inter, Roboto)
- Bounce easing, layout animations

## Step 2: Anti-Patterns Verdict

**Start here in the report.** Pass/fail: Does this look AI-generated?

List specific tells found. Be brutally honest.

## Step 3: Generate Report

### Executive Summary
- Total issues by severity
- Top 3-5 critical issues
- Overall quality assessment
- Recommended next steps

### Detailed Findings by Severity

For each issue:
- **Location**: Component, file, line
- **Severity**: Critical / High / Medium / Low
- **Category**: Accessibility / Performance / Theming / Responsive
- **Description**: What the issue is
- **Impact**: How it affects users
- **Standard**: Which WCAG/standard it violates
- **Recommendation**: How to fix it

#### Severity Definitions

| Severity | Description |
|----------|-------------|
| **Critical** | Blocks core functionality, violates WCAG A |
| **High** | Significant usability/a11y impact, WCAG AA violations |
| **Medium** | Quality issues, WCAG AAA violations, performance concerns |
| **Low** | Minor inconsistencies, optimization opportunities |

### Patterns & Systemic Issues

Identify recurring problems:
- "Hard-coded colors in 15+ components"
- "Touch targets consistently < 44px"
- "Missing focus indicators on all custom components"

### Positive Findings

Note what's working well—good practices to maintain.

### Recommendations by Priority

1. **Immediate**: Critical blockers
2. **Short-term**: High-severity (this sprint)
3. **Medium-term**: Quality improvements (next sprint)
4. **Long-term**: Nice-to-haves

## Completion

Deliver audit report with:
1. Anti-patterns verdict
2. Executive summary
3. Detailed findings (Critical → Low)
4. Systemic patterns
5. Prioritized recommendations

Ask: "Would you like me to help fix any of these issues? I can use the Polish, ImplementWithPrinciples, or ComponentDesign workflows."

**IMPORTANT**: This is an audit, not a fix. Document issues thoroughly. Use other workflows to address them.

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
