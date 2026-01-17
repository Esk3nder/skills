---
name: UIUX
description: UI/UX design guidance and reviews. USE WHEN reviewing designs OR implementing UI OR creating components OR accessibility OR responsive design OR user experience OR mockup feedback OR design system OR audit interface OR polish UI.
---

# UIUX

Create distinctive, production-grade interfaces that avoid generic "AI slop" aesthetics. Comprehensive support for design reviews, implementation guidance, and component development.

**Announce at start:** "I'm using the UIUX skill to help with design and user experience."

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **DesignReview** | "review design", "mockup feedback", "UI critique" | `Workflows/DesignReview.md` |
| **Audit** | "audit interface", "check accessibility", "quality check" | `Workflows/Audit.md` |
| **Critique** | "design critique", "UX evaluation", "design feedback" | `Workflows/Critique.md` |
| **ImplementWithPrinciples** | "implement UI", "accessibility", "responsive design" | `Workflows/ImplementWithPrinciples.md` |
| **ComponentDesign** | "create component", "design system", "UI pattern" | `Workflows/ComponentDesign.md` |
| **Polish** | "polish UI", "refine design", "visual details" | `Workflows/Polish.md` |

## Reference Documents

Consult these for detailed guidance:

| Topic | File | Key Content |
|-------|------|-------------|
| **Implementation** | `Reference/ImplementationConstraints.md` | MUST/NEVER rules, stack, components, Tailwind |
| **Typography** | `Reference/Typography.md` | Modular scales, font pairing, fluid type, OpenType features |
| **Color** | `Reference/ColorAndContrast.md` | OKLCH, tinted neutrals, dark mode, semantic tokens |
| **Space** | `Reference/SpatialDesign.md` | 4pt system, container queries, visual hierarchy |
| **Motion** | `Reference/MotionDesign.md` | Duration rules, easing curves, reduced motion |
| **Interaction** | `Reference/InteractionDesign.md` | 8 states, focus rings, forms, keyboard nav |
| **Responsive** | `Reference/ResponsiveDesign.md` | Mobile-first, input detection, safe areas |
| **Writing** | `Reference/UxWriting.md` | Button labels, error messages, empty states |

## Anti-Patterns: The AI Slop Test

**Critical quality check**: If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

### Typography Anti-Patterns
- **DON'T**: Use overused fonts—Inter, Roboto, Arial, Open Sans, system defaults
- **DON'T**: Use monospace typography as lazy shorthand for "technical/developer" vibes
- **DON'T**: Put large icons with rounded corners above every heading

### Color Anti-Patterns
- **DON'T**: Use the AI color palette: cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds
- **DON'T**: Use gradient text for "impact"—especially on metrics or headings
- **DON'T**: Default to dark mode with glowing accents
- **DON'T**: Use gray text on colored backgrounds—it looks washed out
- **DON'T**: Use pure black (#000) or pure white (#fff)—always tint

### Layout Anti-Patterns
- **DON'T**: Wrap everything in cards—not everything needs a container
- **DON'T**: Nest cards inside cards—visual noise, flatten the hierarchy
- **DON'T**: Use identical card grids—same-sized cards with icon + heading + text, repeated endlessly
- **DON'T**: Use the hero metric layout template—big number, small label, supporting stats, gradient accent
- **DON'T**: Center everything—left-aligned text with asymmetric layouts feels more designed

### Visual Detail Anti-Patterns
- **DON'T**: Use glassmorphism everywhere—blur effects, glass cards, glow borders
- **DON'T**: Use rounded elements with thick colored border on one side
- **DON'T**: Use sparklines as decoration—tiny charts that convey nothing meaningful
- **DON'T**: Use modals unless there's truly no better alternative

### Motion Anti-Patterns
- **DON'T**: Use bounce or elastic easing—they feel dated and tacky
- **DON'T**: Animate layout properties (width, height, padding, margin)—use transform and opacity only

## Design Direction

Commit to a BOLD aesthetic direction:

1. **Purpose**: What problem does this interface solve? Who uses it?
2. **Tone**: Pick an extreme—brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw
3. **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision.

## Quick Reference

### Typography
- Use modular scale (1.25, 1.333, or 1.5 ratio)
- Fluid sizing: `clamp(min, preferred, max)`
- Better fonts: Instrument Sans, Plus Jakarta Sans, Outfit, Figtree, Fraunces

### Color (OKLCH)
```css
--color-primary: oklch(60% 0.15 250);
--color-primary-light: oklch(85% 0.08 250);  /* Reduce chroma at extremes */
```

### Spacing (4pt base)
`4, 8, 12, 16, 24, 32, 48, 64, 96px`

### Motion (100/300/500 rule)
| Duration | Use Case |
|----------|----------|
| 100-150ms | Instant feedback (button press, toggle) |
| 200-300ms | State changes (menu open, tooltip) |
| 300-500ms | Layout changes (accordion, modal) |

### Easing
```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);  /* Recommended default */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* Snappy, confident */
```

## Implementation Rules (MUST/NEVER)

### Stack
- **MUST** use Tailwind CSS defaults before custom values
- **MUST** use `cn()` utility (`clsx` + `tailwind-merge`) for class logic
- **MUST** use `motion/react` for JS animation

### Components
- **MUST** use accessible primitives (`Base UI`, `React Aria`, `Radix`)
- **MUST** add `aria-label` to icon-only buttons
- **NEVER** mix primitive systems in same interaction surface
- **NEVER** rebuild keyboard/focus behavior by hand

### Layout & Interaction
- **MUST** use `h-dvh` not `h-screen`
- **MUST** use `AlertDialog` for destructive actions
- **MUST** respect `safe-area-inset` for fixed elements
- **MUST** show errors next to where action happens
- **NEVER** block paste on inputs

### Animation
- **MUST** animate only `transform` and `opacity`
- **MUST** respect `prefers-reduced-motion`
- **NEVER** exceed 200ms for interaction feedback
- **NEVER** add animation unless explicitly requested

### Typography
- **MUST** use `text-balance` for headings, `text-pretty` for body
- **MUST** use `tabular-nums` for data
- **NEVER** modify `letter-spacing` unless requested

### Design
- **NEVER** use gradients unless explicitly requested
- **NEVER** use purple or multicolor gradients
- **NEVER** use glow effects as primary affordances
- **SHOULD** limit accent color to one per view

See `Reference/ImplementationConstraints.md` for full rules.

## Examples

**Example 1: Audit an interface**
```
User: "Audit my dashboard for accessibility issues"
-> Invokes Audit workflow
-> Checks a11y, performance, theming, responsive
-> Generates prioritized report with fix recommendations
```

**Example 2: Design critique**
```
User: "Give me design feedback on this landing page"
-> Invokes Critique workflow
-> Evaluates hierarchy, emotional resonance, AI slop detection
-> Returns actionable feedback like a design director
```

**Example 3: Polish a component**
```
User: "Polish this button component"
-> Invokes Polish workflow
-> Refines typography, spacing, states, micro-interactions
-> Applies design system consistency
```

**Example 4: Implement with principles**
```
User: "Help me make this form accessible"
-> Invokes ImplementWithPrinciples workflow
-> Guides semantic HTML, ARIA, keyboard nav, error handling
```

## Related Skills

**Called by:**
- **Brainstorming** - When designing UI features
- **ExecutingPlans** - When implementing UI tasks

**Calls:**
- None - This skill does not call other skills

---

*Based on [Impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus (Apache 2.0), which builds on Anthropic's frontend-design skill.*
