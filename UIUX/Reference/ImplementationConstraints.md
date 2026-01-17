# Implementation Constraints

Opinionated constraints for building better interfaces with agents. These are MUST/SHOULD/NEVER rules for implementation.

## Stack Requirements

| Rule | Constraint |
|------|------------|
| **MUST** | Use Tailwind CSS defaults (spacing, radius, shadows) before custom values |
| **MUST** | Use `motion/react` (formerly `framer-motion`) when JavaScript animation is required |
| **MUST** | Use `cn` utility (`clsx` + `tailwind-merge`) for class logic |
| **SHOULD** | Use `tw-animate-css` for entrance and micro-animations in Tailwind CSS |

```tsx
// cn utility pattern
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Component Requirements

| Rule | Constraint |
|------|------------|
| **MUST** | Use accessible component primitives for keyboard/focus behavior |
| **MUST** | Use the project's existing component primitives first |
| **MUST** | Add `aria-label` to icon-only buttons |
| **NEVER** | Mix primitive systems within the same interaction surface |
| **NEVER** | Rebuild keyboard or focus behavior by hand |
| **SHOULD** | Prefer `Base UI` for new primitives if compatible |

### Recommended Primitive Libraries

1. **Base UI** - [base-ui.com](https://base-ui.com/react/components) - Preferred for new projects
2. **React Aria** - Adobe's accessibility-first primitives
3. **Radix** - Unstyled, accessible components

**Pick one and stick with it** - Never mix Radix and React Aria in the same component.

## Interaction Requirements

| Rule | Constraint |
|------|------------|
| **MUST** | Use `AlertDialog` for destructive or irreversible actions |
| **MUST** | Respect `safe-area-inset` for fixed elements |
| **MUST** | Show errors next to where the action happens |
| **NEVER** | Use `h-screen` - use `h-dvh` instead |
| **NEVER** | Block paste in `input` or `textarea` elements |
| **SHOULD** | Use structural skeletons for loading states |

```css
/* Safe area for fixed elements */
.fixed-bottom {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

```tsx
// Use h-dvh, not h-screen
<div className="h-dvh">  {/* Dynamic viewport height */}
<div className="h-screen">  {/* WRONG - doesn't account for mobile browser chrome */}
```

## Animation Requirements

| Rule | Constraint |
|------|------------|
| **MUST** | Animate only compositor props (`transform`, `opacity`) |
| **MUST** | Pause looping animations when off-screen |
| **MUST** | Respect `prefers-reduced-motion` |
| **NEVER** | Add animation unless explicitly requested |
| **NEVER** | Animate layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`) |
| **NEVER** | Exceed `200ms` for interaction feedback |
| **NEVER** | Introduce custom easing curves unless explicitly requested |
| **SHOULD** | Use `ease-out` on entrance |
| **SHOULD** | Avoid animating paint properties (`background`, `color`) except small UI |
| **SHOULD** | Avoid animating large images or full-screen surfaces |

```tsx
// GOOD - compositor properties only
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
/>

// BAD - layout properties
<motion.div
  initial={{ height: 0 }}
  animate={{ height: 'auto' }}  // NEVER do this
/>
```

```css
/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Typography Requirements

| Rule | Constraint |
|------|------------|
| **MUST** | Use `text-balance` for headings |
| **MUST** | Use `text-pretty` for body/paragraphs |
| **MUST** | Use `tabular-nums` for data |
| **NEVER** | Modify `letter-spacing` (`tracking-`) unless explicitly requested |
| **SHOULD** | Use `truncate` or `line-clamp` for dense UI |

```tsx
// Typography patterns
<h1 className="text-balance">Heading text</h1>
<p className="text-pretty">Body paragraph text</p>
<span className="tabular-nums">1,234,567</span>
<p className="line-clamp-3">Long text that truncates...</p>
```

## Layout Requirements

| Rule | Constraint |
|------|------------|
| **MUST** | Use a fixed `z-index` scale (no arbitrary `z-[x]`) |
| **SHOULD** | Use `size-x` for square elements instead of `w-x h-x` |

```tsx
// Z-index scale (define in tailwind.config.js)
const zIndex = {
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
};

// Square elements
<div className="size-8">  {/* 32x32 */}
<div className="w-8 h-8">  {/* AVOID - redundant */}
```

## Performance Requirements

| Rule | Constraint |
|------|------------|
| **NEVER** | Animate large `blur()` or `backdrop-filter` surfaces |
| **NEVER** | Apply `will-change` outside an active animation |
| **NEVER** | Use `useEffect` for anything that can be expressed as render logic |

```tsx
// BAD - will-change applied statically
<div className="will-change-transform">

// GOOD - will-change only during animation
<div className={isAnimating ? 'will-change-transform' : ''}>

// BAD - useEffect for derived state
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// GOOD - computed during render
const fullName = `${firstName} ${lastName}`;
```

## Design Requirements

| Rule | Constraint |
|------|------------|
| **MUST** | Give empty states one clear next action |
| **NEVER** | Use gradients unless explicitly requested |
| **NEVER** | Use purple or multicolor gradients |
| **NEVER** | Use glow effects as primary affordances |
| **SHOULD** | Use Tailwind CSS default shadow scale |
| **SHOULD** | Limit accent color usage to one per view |
| **SHOULD** | Use existing theme/Tailwind tokens before introducing new ones |

```tsx
// Empty state with clear action
<div className="text-center py-12">
  <p className="text-muted-foreground">No projects yet</p>
  <Button className="mt-4">Create your first project</Button>
</div>

// Use default shadows
<div className="shadow-sm">   {/* Tailwind default */}
<div className="shadow-[0_2px_8px_rgba(0,0,0,0.1)]">  {/* AVOID arbitrary */}
```

## Design Adherence (Before Implementing UI)

Before writing any UI code, complete this discovery process:

### Step 1: Find Design Configs

Search for and examine:
- `globals.css` or `global.css`
- `tailwind.config.js` / `tailwind.config.ts`
- Theme files (`theme.ts`, `tokens.ts`, `design-tokens.json`)
- CSS custom properties / design tokens

### Step 2: Examine Existing Components

| Check | Location |
|-------|----------|
| Component library | `components/ui/`, `components/common/`, `src/components/` |
| Design system | `packages/design-system/`, `libs/ui/` |
| Patterns | Spacing, colors, typography, iconography, layout |

### Step 3: Identify What Exists

Before creating ANY new component:
1. Search for similar components in the codebase
2. Analyze each variant, design, and structure
3. Determine which variant should be used
4. Only request permission to create new if nothing suitable exists

### Design Adherence Rules

| Rule | Constraint |
|------|------------|
| **MUST** | Use project's existing component primitives first |
| **MUST** | Match established visual style and component structure |
| **MUST** | Search for design configs before implementing |
| **MUST** | Mimic existing copywriting style for user-facing text |
| **NEVER** | Introduce new design patterns unless explicitly requested |
| **NEVER** | Create custom primitives when existing ones work |
| **NEVER** | Break other component implementations (positioning, color, size, icons, spacing) |

### When a New Component IS Required

1. Prompt the user for permission
2. Provide short, concise reasoning
3. Wait for approval before creating

```
"I need to create a new [ComponentName] because [reason].
The existing [SimilarComponent] doesn't support [specific requirement].
Should I proceed?"
```

### Design Implementation Checklist

Before implementing from a design/mockup:

- [ ] Identified all required components
- [ ] Checked if components exist in codebase
- [ ] Analyzed variants needed
- [ ] Planned layout, spacing, and styling
- [ ] Confirmed approach follows existing patterns

## Quick Reference Card

### Always Do
- Search for existing components first
- Check design configs before implementing
- Use project's existing primitives
- Match established visual patterns
- `h-dvh` not `h-screen`
- `size-x` for squares
- `text-balance` for headings
- `tabular-nums` for numbers
- `aria-label` on icon buttons
- Errors next to actions
- One accent color per view

### Never Do
- Create new components without checking existing
- Introduce new design patterns without permission
- Break other component implementations
- Animate layout properties
- Mix component primitive systems
- Block paste on inputs
- Use arbitrary z-index
- Apply `will-change` statically
- Add gradients without request
- Exceed 200ms for feedback
- Rebuild keyboard behavior

### Prefer
- Tailwind defaults over custom
- Existing tokens over new
- `cn()` for class logic
- Skeletons over spinners
- `Base UI` for new primitives
- `ease-out` for entrances
