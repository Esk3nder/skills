# Polish Workflow

> **Trigger:** "polish UI", "refine design", "visual details"
> **Input:** Functionally complete interface or component
> **Output:** Polished, production-ready result with all details refined

Meticulous final pass to catch all the small details that separate good from great. The difference between shipped and polished.

## Step 1: Pre-Polish Assessment

Confirm readiness before polishing:

1. **Is it functionally complete?** (Don't polish incomplete work)
2. **What's the quality bar?** (MVP vs flagship feature)
3. **When does it ship?** (Triage polish time accordingly)

## Step 2: Polish Systematically

### Visual Alignment & Spacing

- [ ] Pixel-perfect alignment to grid
- [ ] Consistent spacing using design tokens (no random 13px gaps)
- [ ] Optical alignment for visual weight (icons may need offset)
- [ ] Responsive consistency at all breakpoints

### Typography Refinement

- [ ] Hierarchy consistent (same elements = same sizes/weights)
- [ ] Line length 45-75 characters for body text
- [ ] Appropriate line height for font size
- [ ] No widows or orphans (single words on last line)
- [ ] No FOUT/FOIT font loading flashes

### Color & Contrast

- [ ] All text meets WCAG contrast (4.5:1 body, 3:1 large)
- [ ] No hard-coded colors—all use design tokens
- [ ] Works in all theme variants (light/dark)
- [ ] Tinted neutrals (no pure gray/black—add 0.01 chroma)
- [ ] No gray text on colored backgrounds

### Interaction States

Every interactive element needs ALL states:

| State | Requirement |
|-------|-------------|
| Default | Resting appearance |
| Hover | Subtle feedback (color, scale, shadow) |
| Focus | Visible keyboard indicator (never remove) |
| Active | Click/tap feedback |
| Disabled | Clearly non-interactive |
| Loading | Async action feedback |
| Error | Validation state |
| Success | Completion confirmation |

### Micro-interactions & Transitions

- [ ] All state changes animated (150-300ms)
- [ ] Consistent easing (ease-out-quart/quint/expo)
- [ ] No jank (60fps, only animate transform/opacity)
- [ ] Respects `prefers-reduced-motion`
- [ ] No bounce or elastic easing (dated)

### Content & Copy

- [ ] Consistent terminology throughout
- [ ] Consistent capitalization (Title Case vs Sentence case)
- [ ] No typos or grammar errors
- [ ] Appropriate length (not wordy, not terse)

### Icons & Images

- [ ] Consistent icon style (same family)
- [ ] Proper optical alignment with text
- [ ] Alt text for all images
- [ ] No layout shift from image loading
- [ ] 2x assets for retina

### Forms & Inputs

- [ ] All inputs properly labeled
- [ ] Required indicators clear and consistent
- [ ] Error messages helpful
- [ ] Logical tab order
- [ ] Consistent validation timing

### Edge Cases

- [ ] Loading states for all async actions
- [ ] Helpful empty states (not blank)
- [ ] Clear error messages with recovery paths
- [ ] Success confirmation
- [ ] Handles long content gracefully

### Responsiveness

- [ ] Works at all breakpoints (mobile, tablet, desktop)
- [ ] Touch targets 44x44px minimum
- [ ] No text smaller than 14px on mobile
- [ ] No horizontal scroll
- [ ] Content reflows logically

### Performance

- [ ] No layout shift (CLS)
- [ ] Smooth 60fps interactions
- [ ] Optimized images
- [ ] Off-screen content lazy loads

### Code Quality

- [ ] No console.logs in production
- [ ] No commented-out code
- [ ] No unused imports
- [ ] No TypeScript `any` or ignored errors
- [ ] Proper ARIA and semantic HTML

## Step 3: Final Verification

Before marking complete:

1. **Use it yourself** - Actually interact with the feature
2. **Test on real devices** - Not just DevTools emulation
3. **Fresh eyes** - Ask someone else to review
4. **Compare to design** - Match intended spec
5. **Test all states** - Don't just test happy path

## Completion

Deliver polished result with:
- Summary of refinements made
- Any remaining issues that require design decisions
- Confirmation that checklist items pass

**Remember**: Polish until it feels effortless, looks intentional, and works flawlessly. The details matter.

**NEVER**:
- Polish before functionally complete
- Introduce bugs while polishing
- Perfect one thing while leaving others rough
- Ignore systematic issues (fix the system, not instances)

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
