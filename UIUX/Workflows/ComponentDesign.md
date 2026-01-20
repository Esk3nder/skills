# ComponentDesign Workflow

> **Trigger:** "create component", "design system", "UI pattern"
> **Input:** Component requirement or pattern to implement
> **Output:** Reusable component design with API, states, and variants

## Step 1: Define Component Purpose

Clarify the component's role:
- What user problem does it solve?
- Where will it be used? (One place or multiple?)
- What existing components could be extended?
- What design system constraints exist?

## Step 2: Design Component API

### Props/Interface Design

Define clear, minimal API:

```typescript
interface ButtonProps {
  /** Visual variant */
  variant: 'primary' | 'secondary' | 'ghost';

  /** Size preset */
  size: 'sm' | 'md' | 'lg';

  /** Disabled state */
  disabled?: boolean;

  /** Loading state - shows spinner, disables interaction */
  loading?: boolean;

  /** Click handler */
  onClick?: () => void;

  /** Button content */
  children: React.ReactNode;
}
```

### API Design Principles

| Principle | Description |
|-----------|-------------|
| **Minimal** | Only expose what's necessary |
| **Consistent** | Match existing component patterns |
| **Typed** | Full TypeScript types with JSDoc |
| **Defaulted** | Sensible defaults for optional props |

## Step 3: Define States

Map all component states:

### Interactive States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| Default | Initial render | Base styling |
| Hover | Mouse over | Subtle highlight |
| Focus | Keyboard/click | Focus ring |
| Active | Mouse down | Pressed appearance |
| Disabled | `disabled` prop | Muted, no interaction |
| Loading | `loading` prop | Spinner, no interaction |

### Data States (if applicable)

| State | Condition | Display |
|-------|-----------|---------|
| Empty | No data | Empty state message |
| Loading | Fetching | Skeleton/spinner |
| Error | Fetch failed | Error message + retry |
| Success | Data loaded | Content |

## Step 4: Define Variants

Create visual variants for different contexts:

```typescript
// Size variants
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

// Visual variants
const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
};
```

## Step 5: Accessibility Implementation

Build accessibility in from the start:

### Keyboard Support

| Key | Action |
|-----|--------|
| Tab | Move focus to/from component |
| Enter/Space | Activate (buttons, links) |
| Escape | Close/dismiss (modals, dropdowns) |
| Arrow keys | Navigate within (tabs, menus) |

### ARIA Requirements

```tsx
// Button with loading state
<button
  aria-busy={loading}
  aria-disabled={disabled || loading}
  aria-label={loading ? 'Loading...' : undefined}
>
  {loading ? <Spinner /> : children}
</button>

// Custom select
<div
  role="listbox"
  aria-activedescendant={selectedId}
  aria-label="Select option"
>
```

### Focus Management

- Return focus after dialogs close
- Trap focus within modals
- Announce dynamic changes with `aria-live`

## Step 6: Component Structure

Recommended file structure:

```
components/
└── Button/
    ├── Button.tsx       # Main component
    ├── Button.test.tsx  # Tests
    ├── Button.stories.tsx # Storybook (if used)
    ├── types.ts         # TypeScript interfaces
    └── index.ts         # Public exports
```

### Implementation Template

```tsx
import { forwardRef } from 'react';
import type { ButtonProps } from './types';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', disabled, loading, onClick, children }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(baseStyles, variants[variant], sizes[size])}
        disabled={disabled || loading}
        aria-busy={loading}
        onClick={onClick}
      >
        {loading ? <Spinner aria-hidden /> : null}
        <span className={loading ? 'opacity-0' : ''}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
```

## Step 7: Testing Strategy

Define tests for:

### Unit Tests
- Props render correctly
- States display properly
- Events fire as expected
- Accessibility attributes present

### Integration Tests
- Component works in context
- Keyboard navigation functions
- Screen reader announces correctly

### Visual Tests
- All variants render correctly
- Responsive behavior works
- Dark mode (if supported)

## Completion

Deliver component design with:
1. **API documentation** - Props interface with descriptions
2. **State definitions** - All interactive and data states
3. **Variants** - Visual variations needed
4. **Accessibility spec** - Keyboard and ARIA requirements
5. **Implementation outline** - Code structure

Ask: "Should I implement this component or would you like to adjust the design first?"

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
